//go:generate go-enum --sql --marshal --names --file $GOFILE
package fbhttp

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/files"
	"github.com/Kkwans/nas-file-browser/backend/img"
)

/*
ENUM(
thumb
big
)
*/
type PreviewSize int

type ImgService interface {
	FormatFromExtension(ext string) (img.Format, error)
	Resize(ctx context.Context, in io.Reader, width, height int, out io.Writer, options ...img.Option) error
}

type FileCache interface {
	Store(ctx context.Context, key string, value []byte) error
	Load(ctx context.Context, key string) ([]byte, bool, error)
	Delete(ctx context.Context, key string) error
}

var errPreviewCoolingDown = errors.New("preview generation is cooling down after a recent failure")

const previewFailureEntries = 256

type previewFlight struct {
	ctx     context.Context
	cancel  context.CancelFunc
	done    chan struct{}
	waiters int
	data    []byte
	err     error
}

type previewCoordinator struct {
	sync.Mutex
	flights  map[string]*previewFlight
	failures map[string]time.Time
	cooldown time.Duration
}

func newPreviewCoordinator() *previewCoordinator {
	return &previewCoordinator{
		flights: make(map[string]*previewFlight), failures: make(map[string]time.Time),
		cooldown: 15 * time.Second,
	}
}

func (c *previewCoordinator) Do(ctx context.Context, key string, work func(context.Context) ([]byte, error)) ([]byte, error) {
	c.Lock()
	c.pruneFailures(time.Now())
	if until, failed := c.failures[key]; failed {
		if time.Now().Before(until) {
			c.Unlock()
			return nil, errPreviewCoolingDown
		}
		delete(c.failures, key)
	}

	flight := c.flights[key]
	if flight == nil {
		flightCtx, cancel := context.WithCancel(context.Background())
		flight = &previewFlight{ctx: flightCtx, cancel: cancel, done: make(chan struct{})}
		c.flights[key] = flight
		go func() {
			flight.data, flight.err = work(flight.ctx)
			c.Lock()
			if flight.err != nil && !errors.Is(flight.err, context.Canceled) {
				c.pruneFailures(time.Now())
				if _, exists := c.failures[key]; !exists && len(c.failures) >= previewFailureEntries {
					c.evictEarliestFailure()
				}
				c.failures[key] = time.Now().Add(c.cooldown)
			}
			delete(c.flights, key)
			close(flight.done)
			c.Unlock()
		}()
	}
	flight.waiters++
	c.Unlock()

	select {
	case <-flight.done:
		c.releaseWaiter(flight, false)
		return append([]byte(nil), flight.data...), flight.err
	case <-ctx.Done():
		c.releaseWaiter(flight, true)
		return nil, context.Cause(ctx)
	}
}

func (c *previewCoordinator) pruneFailures(now time.Time) {
	for key, until := range c.failures {
		if !now.Before(until) {
			delete(c.failures, key)
		}
	}
}

func (c *previewCoordinator) evictEarliestFailure() {
	var earliestKey string
	var earliest time.Time
	for key, until := range c.failures {
		if earliestKey == "" || until.Before(earliest) {
			earliestKey = key
			earliest = until
		}
	}
	if earliestKey != "" {
		delete(c.failures, earliestKey)
	}
}

func (c *previewCoordinator) releaseWaiter(flight *previewFlight, canceled bool) {
	c.Lock()
	defer c.Unlock()
	flight.waiters--
	if canceled && flight.waiters == 0 {
		flight.cancel()
	}
}

func previewHandler(imgSvc ImgService, fileCache FileCache, enableThumbnails, resizePreview bool, videoPreviewWorkers int) handleFunc {
	coordinator := newPreviewCoordinator()
	ffmpeg := newFFmpegPreviewService(videoPreviewWorkers)
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		if !d.user.Perm.Download {
			return http.StatusAccepted, nil
		}
		vars := mux.Vars(r)

		previewSize, err := ParsePreviewSize(vars["size"])
		if err != nil {
			return http.StatusBadRequest, err
		}

		file, err := files.NewFileInfo(&files.FileOptions{
			Fs:         d.user.Fs,
			Path:       "/" + vars["path"],
			Modify:     d.user.Perm.Modify,
			Expand:     true,
			ReadHeader: d.server.TypeDetectionByHeader,
			Checker:    d,
		})
		if err != nil {
			return errToStatus(err), err
		}

		setContentDisposition(w, r, file)

		switch file.Type {
		case "image":
			return handleImagePreview(w, r, imgSvc, fileCache, coordinator, file, previewSize, enableThumbnails, resizePreview)
		case "video":
			return handleVideoPreview(w, r, fileCache, coordinator, ffmpeg, file, previewSize)
		default:
			return http.StatusNotImplemented, fmt.Errorf("不支持预览 %s 类型的文件", file.Type)
		}
	})
}

func handleImagePreview(
	w http.ResponseWriter,
	r *http.Request,
	imgSvc ImgService,
	fileCache FileCache,
	coordinator *previewCoordinator,
	file *files.FileInfo,
	previewSize PreviewSize,
	enableThumbnails, resizePreview bool,
) (int, error) {
	if (previewSize == PreviewSizeBig && !resizePreview) ||
		(previewSize == PreviewSizeThumb && !enableThumbnails) {
		return rawFileHandler(w, r, file)
	}

	format, err := imgSvc.FormatFromExtension(file.Extension)
	// Unsupported extensions directly return the raw data
	if errors.Is(err, img.ErrUnsupportedFormat) || format == img.FormatGif {
		return rawFileHandler(w, r, file)
	}
	if err != nil {
		return errToStatus(err), err
	}

	cacheKey := previewCacheKey(file, previewSize)
	resizedImage, ok, err := fileCache.Load(r.Context(), cacheKey)
	if err != nil {
		return errToStatus(err), err
	}
	if ok && !validCachedPreview(resizedImage) {
		_ = fileCache.Delete(r.Context(), cacheKey)
		ok = false
	}
	if !ok {
		resizedImage, err = coordinator.Do(r.Context(), cacheKey, func(ctx context.Context) ([]byte, error) {
			if cached, exists, loadErr := fileCache.Load(ctx, cacheKey); loadErr != nil {
				return nil, loadErr
			} else if exists && validCachedPreview(cached) {
				return cached, nil
			}
			return createPreview(ctx, imgSvc, fileCache, file, previewSize)
		})
		if err != nil {
			if errors.Is(err, errPreviewCoolingDown) {
				return http.StatusServiceUnavailable, fmt.Errorf("缩略图生成暂时冷却，请稍后重试")
			}
			return errToStatus(err), err
		}
	}

	w.Header().Set("Cache-Control", "private")
	if previewSize == PreviewSizeThumb {
		w.Header().Set("Content-Type", "image/jpeg")
	}
	http.ServeContent(w, r, file.Name, file.ModTime, bytes.NewReader(resizedImage))

	return 0, nil
}

func createPreview(ctx context.Context, imgSvc ImgService, fileCache FileCache,
	file *files.FileInfo, previewSize PreviewSize) ([]byte, error) {
	fd, err := file.Fs.Open(file.Path)
	if err != nil {
		return nil, err
	}
	defer fd.Close()

	var (
		width   int
		height  int
		options []img.Option
	)

	switch previewSize {
	case PreviewSizeBig:
		width = 1080
		height = 1080
		options = append(options, img.WithMode(img.ResizeModeFit), img.WithQuality(img.QualityMedium))
	case PreviewSizeThumb:
		width = 256
		height = 256
		options = append(options, img.WithMode(img.ResizeModeFill), img.WithQuality(img.QualityLow), img.WithFormat(img.FormatJpeg))
	default:
		return nil, img.ErrUnsupportedFormat
	}

	buf := &bytes.Buffer{}
	if err := imgSvc.Resize(ctx, fd, width, height, buf, options...); err != nil {
		return nil, err
	}
	if err := fileCache.Store(ctx, previewCacheKey(file, previewSize), buf.Bytes()); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

func previewCacheKey(f *files.FileInfo, previewSize PreviewSize) string {
	return fmt.Sprintf("preview:v2:%s:%d:%d:%s", f.RealPath(), f.ModTime.UnixNano(), f.Size, previewSize.String())
}

func validCachedPreview(value []byte) bool {
	if len(value) == 0 {
		return false
	}
	_, _, err := image.DecodeConfig(bytes.NewReader(value))
	return err == nil
}
