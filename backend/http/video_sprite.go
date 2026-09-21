package fbhttp

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math"
	"net/http"
	"net/url"
	"os/exec"

	"github.com/Kkwans/nas-file-browser/backend/files"
	"github.com/Kkwans/nas-file-browser/backend/pathmeta"
)

const (
	spriteMaxTiles  = 100
	spriteColumns   = 10
	spriteMaxWidth  = 160
	spriteMaxHeight = 90
	spriteVersion   = "video-sprite-v2-contain"
)

type videoSpriteResponse struct {
	Path     string  `json:"path"`
	Number   int     `json:"number"`
	Column   int     `json:"column"`
	Width    int     `json:"width"`
	Height   int     `json:"height"`
	Interval float64 `json:"interval"`
	URL      string  `json:"url"`
}

type videoSpriteService struct {
	cache       FileCache
	coordinator *previewCoordinator
	workers     chan struct{}
}

func newVideoSpriteService(cache FileCache) *videoSpriteService {
	return &videoSpriteService{cache: cache, coordinator: newPreviewCoordinator(), workers: make(chan struct{}, 1)}
}

func spriteTileGeometry(width, height int) (int, int) {
	if width <= 0 || height <= 0 {
		return spriteMaxWidth, spriteMaxHeight
	}
	ratio := float64(width) / float64(height)
	tileWidth, tileHeight := spriteMaxWidth, int(math.Round(float64(spriteMaxWidth)/ratio))
	if tileHeight > spriteMaxHeight {
		tileHeight = spriteMaxHeight
		tileWidth = int(math.Round(float64(spriteMaxHeight) * ratio))
	}
	tileWidth = max(2, tileWidth-tileWidth%2)
	tileHeight = max(2, tileHeight-tileHeight%2)
	return tileWidth, tileHeight
}

func spriteSampling(duration float64) (float64, int) {
	if duration <= 0 {
		return 10, spriteMaxTiles
	}
	interval := math.Max(1, math.Min(30, duration/spriteMaxTiles))
	number := int(math.Ceil(duration / interval))
	return interval, max(1, min(spriteMaxTiles, number))
}

func videoSpriteKey(file *files.FileInfo, meta videoSpriteResponse) string {
	payload := fmt.Sprintf("%s|%s|%d|%d|%.4f|%d|%d|%d", spriteVersion, file.Path, file.Size,
		file.ModTime.UnixNano(), meta.Interval, meta.Number, meta.Width, meta.Height)
	digest := sha256.Sum256([]byte(payload))
	return "sprite:" + hex.EncodeToString(digest[:])
}

func (service *videoSpriteService) loadOrCreate(ctx context.Context, file *files.FileInfo) (videoSpriteResponse, []byte, error) {
	if service.cache == nil {
		return videoSpriteResponse{}, nil, fmt.Errorf("雪碧图缓存未配置")
	}
	probe, err := defaultMediaProbe(ctx, file.RealPath(), false)
	if err != nil {
		return videoSpriteResponse{}, nil, err
	}
	width, height := spriteTileGeometry(probe.Width, probe.Height)
	interval, number := spriteSampling(probe.Duration)
	columns := min(spriteColumns, number)
	meta := videoSpriteResponse{Path: file.Path, Number: number, Column: columns, Width: width, Height: height, Interval: interval}
	key := videoSpriteKey(file, meta)
	if cached, ok, loadErr := loadPreviewCache(ctx, service.cache, key); loadErr == nil && ok && len(cached) > 0 {
		return meta, cached, nil
	}
	data, err := service.coordinator.Do(ctx, key, func(workCtx context.Context) ([]byte, error) {
		if cached, ok, loadErr := loadPreviewCache(workCtx, service.cache, key); loadErr == nil && ok && len(cached) > 0 {
			return cached, nil
		}
		select {
		case service.workers <- struct{}{}:
			defer func() { <-service.workers }()
		case <-workCtx.Done():
			return nil, context.Cause(workCtx)
		}
		generated, generateErr := generateVideoSprite(workCtx, file.RealPath(), meta)
		if generateErr != nil {
			return nil, generateErr
		}
		storePreviewCache(workCtx, service.cache, key, generated)
		return generated, nil
	})
	return meta, data, err
}

func generateVideoSprite(ctx context.Context, source string, meta videoSpriteResponse) ([]byte, error) {
	ffmpegPath, err := exec.LookPath("ffmpeg")
	if err != nil {
		return nil, fmt.Errorf("ffmpeg 不可用: %w", err)
	}
	rows := int(math.Ceil(float64(meta.Number) / float64(meta.Column)))
	filter := fmt.Sprintf("fps=1/%.6f,scale=%d:%d:flags=fast_bilinear,tile=%dx%d", meta.Interval, meta.Width, meta.Height, meta.Column, rows)
	args := []string{"-hide_banner", "-loglevel", "error", "-nostdin", "-i", source, "-vf", filter,
		"-frames:v", "1", "-q:v", "5", "-f", "image2", "-vcodec", "mjpeg", "pipe:1"}
	command := exec.CommandContext(ctx, ffmpegPath, args...)
	var stdout, stderr bytes.Buffer
	command.Stdout, command.Stderr = &stdout, &stderr
	if err := command.Run(); err != nil {
		return nil, fmt.Errorf("雪碧图生成失败: %s", stderr.String())
	}
	if stdout.Len() == 0 {
		return nil, fmt.Errorf("雪碧图为空")
	}
	return stdout.Bytes(), nil
}

func videoSpriteFile(r *http.Request, d *data) (*files.FileInfo, int, error) {
	if !d.user.Perm.Download {
		return nil, http.StatusForbidden, fmt.Errorf("没有读取媒体的权限")
	}
	value := r.URL.Query().Get("path")
	if value == "" {
		return nil, http.StatusBadRequest, fmt.Errorf("媒体路径不能为空")
	}
	value = pathmeta.Clean(value)
	file, err := files.NewFileInfo(&files.FileOptions{Fs: d.user.Fs, Path: value, Modify: d.user.Perm.Modify,
		Expand: true, SkipSubtitles: true, ReadHeader: d.server.TypeDetectionByHeader, Checker: d})
	if err != nil {
		return nil, errToStatus(err), err
	}
	if file.IsDir || (file.Type != "" && file.Type != "video") {
		return nil, http.StatusBadRequest, fmt.Errorf("仅视频文件支持雪碧图")
	}
	return file, 0, nil
}

func (service *videoSpriteService) metaHandler() handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		file, status, err := videoSpriteFile(r, d)
		if err != nil {
			return status, err
		}
		meta, _, err := service.loadOrCreate(r.Context(), file)
		if err != nil {
			return http.StatusInternalServerError, err
		}
		meta.URL = fmt.Sprintf("%s/api/media/sprite.jpg?path=%s", d.server.BaseURL, url.QueryEscape(file.Path))
		return renderJSON(w, r, meta)
	})
}

func (service *videoSpriteService) imageHandler() handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		file, status, err := videoSpriteFile(r, d)
		if err != nil {
			return status, err
		}
		_, data, err := service.loadOrCreate(r.Context(), file)
		if err != nil {
			return http.StatusInternalServerError, err
		}
		w.Header().Set("Cache-Control", previewCacheControl)
		w.Header().Set("Content-Type", "image/jpeg")
		http.ServeContent(w, r, file.Name+".sprite.jpg", file.ModTime, bytes.NewReader(data))
		return 0, nil
	})
}
