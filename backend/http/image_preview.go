package fbhttp

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os/exec"
	"strings"

	"github.com/Kkwans/nas-file-browser/backend/files"
	"github.com/Kkwans/nas-file-browser/backend/img"
)

// Large JPEGs are expensive to fully decode in the Go image pipeline on the
// NAS ARM CPU. FFmpeg already ships in the runtime image and can scale these
// files without changing the public preview URL or cache contract.
const ffmpegImagePreviewMinBytes = 4 * 1024 * 1024

type ffmpegImagePreviewService struct {
	workers chan struct{}
}

type imagePreviewGenerator interface {
	create(context.Context, *files.FileInfo, PreviewSize) ([]byte, error)
}

func newFFmpegImagePreviewService(workers int) *ffmpegImagePreviewService {
	if workers < 1 {
		workers = 1
	}
	if workers > 1 {
		workers = 1
	}
	return &ffmpegImagePreviewService{workers: make(chan struct{}, workers)}
}

func (s *ffmpegImagePreviewService) create(
	ctx context.Context,
	file *files.FileInfo,
	size PreviewSize,
) ([]byte, error) {
	select {
	case s.workers <- struct{}{}:
		defer func() { <-s.workers }()
	case <-ctx.Done():
		return nil, context.Cause(ctx)
	}

	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		return nil, fmt.Errorf("FFmpeg 不可用: %w", err)
	}

	filter, quality, err := ffmpegImageFilter(size)
	if err != nil {
		return nil, err
	}

	var output bytes.Buffer
	var stderr bytes.Buffer
	command := exec.CommandContext(ctx, ffmpegPath,
		"-hide_banner", "-loglevel", "error",
		"-i", file.RealPath(),
		"-map", "0:v:0", "-frames:v", "1",
		"-vf", filter,
		"-threads", "1", "-filter_threads", "1",
		"-q:v", quality,
		"-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1",
	)
	command.Stdout = &output
	command.Stderr = &stderr
	if err := command.Run(); err != nil {
		if errors.Is(ctx.Err(), context.Canceled) {
			return nil, context.Cause(ctx)
		}
		return nil, fmt.Errorf("FFmpeg 图片预览生成失败: %s: %w", stderr.String(), err)
	}
	if !validCachedPreview(output.Bytes()) {
		return nil, fmt.Errorf("FFmpeg 未生成有效的图片预览")
	}
	return output.Bytes(), nil
}

func ffmpegImageFilter(size PreviewSize) (filter, quality string, err error) {
	switch size {
	case PreviewSizeBig:
		return "scale=1080:1080:force_original_aspect_ratio=decrease", "3", nil
	case PreviewSizeThumb:
		return "scale=256:256:force_original_aspect_ratio=increase,crop=256:256", "5", nil
	default:
		return "", "", fmt.Errorf("不支持的图片预览尺寸 %s", size.String())
	}
}

func shouldUseFFmpegImagePreview(file *files.FileInfo, size PreviewSize) bool {
	if file == nil || file.Size < ffmpegImagePreviewMinBytes {
		return false
	}
	if size != PreviewSizeBig && size != PreviewSizeThumb {
		return false
	}
	ext := strings.ToLower(file.Extension)
	return ext == ".jpg" || ext == ".jpeg"
}

// A full-size preview is requested immediately after the real thumbnail in
// the image viewer. When the viewer opts into warm=big, decode a large JPEG
// only once, cache that result, and derive the thumbnail from the decoded
// preview bytes. Listing thumbnails do not opt in and keep their cheap
// single-size behavior.
func shouldWarmLargeJPEGPreview(r *http.Request, file *files.FileInfo) bool {
	return r != nil && r.URL.Query().Get("warm") == "big" &&
		shouldUseFFmpegImagePreview(file, PreviewSizeThumb)
}

func createLargeJPEGThumbnailWarmup(
	ctx context.Context,
	imgSvc ImgService,
	source imagePreviewGenerator,
	fileCache FileCache,
	file *files.FileInfo,
) ([]byte, error) {
	bigKey := previewCacheKey(file, PreviewSizeBig)
	bigPreview, ok, err := loadPreviewCache(ctx, fileCache, bigKey)
	if err != nil {
		return nil, err
	}
	if !ok {
		bigPreview, err = source.create(ctx, file, PreviewSizeBig)
		if err != nil {
			return nil, err
		}
		storePreviewCache(ctx, fileCache, bigKey, bigPreview)
	}

	thumbnail := &bytes.Buffer{}
	if err := imgSvc.Resize(
		ctx,
		bytes.NewReader(bigPreview),
		256,
		256,
		thumbnail,
		img.WithMode(img.ResizeModeFill),
		img.WithQuality(img.QualityLow),
		img.WithFormat(img.FormatJpeg),
	); err != nil {
		return nil, err
	}
	result := thumbnail.Bytes()
	storePreviewCache(ctx, fileCache, previewCacheKey(file, PreviewSizeThumb), result)
	return result, nil
}
