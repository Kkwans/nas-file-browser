package fbhttp

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os/exec"

	"github.com/Kkwans/nas-file-browser/backend/files"
)

type ffmpegPreviewService struct {
	workers chan struct{}
}

func newFFmpegPreviewService(workers int) *ffmpegPreviewService {
	if workers < 1 {
		workers = 1
	}
	if workers > 2 {
		workers = 2
	}
	return &ffmpegPreviewService{workers: make(chan struct{}, workers)}
}

func (s *ffmpegPreviewService) create(ctx context.Context, file *files.FileInfo) ([]byte, error) {
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

	var output bytes.Buffer
	var stderr bytes.Buffer
	command := exec.CommandContext(ctx, ffmpegPath,
		"-hide_banner", "-loglevel", "error",
		"-ss", "0.1", "-i", file.RealPath(),
		"-frames:v", "1",
		"-vf", "scale=256:256:force_original_aspect_ratio=decrease",
		"-f", "image2pipe", "-vcodec", "mjpeg", "pipe:1",
	)
	command.Stdout = &output
	command.Stderr = &stderr
	if err := command.Run(); err != nil {
		if errors.Is(ctx.Err(), context.Canceled) {
			return nil, context.Cause(ctx)
		}
		return nil, fmt.Errorf("FFmpeg 视频封面生成失败: %s: %w", stderr.String(), err)
	}
	if !validCachedPreview(output.Bytes()) {
		return nil, fmt.Errorf("FFmpeg 未生成有效的视频封面")
	}
	return output.Bytes(), nil
}

func handleVideoPreview(
	w http.ResponseWriter,
	r *http.Request,
	fileCache FileCache,
	coordinator *previewCoordinator,
	ffmpeg *ffmpegPreviewService,
	file *files.FileInfo,
	previewSize PreviewSize,
) (int, error) {
	if previewSize != PreviewSizeThumb {
		return http.StatusNotImplemented, fmt.Errorf("视频仅支持缩略图封面")
	}

	cacheKey := previewCacheKey(file, previewSize)
	preview, ok, err := fileCache.Load(r.Context(), cacheKey)
	if err != nil {
		return errToStatus(err), err
	}
	if ok && !validCachedPreview(preview) {
		_ = fileCache.Delete(r.Context(), cacheKey)
		ok = false
	}
	if !ok {
		preview, err = coordinator.Do(r.Context(), cacheKey, func(ctx context.Context) ([]byte, error) {
			if cached, exists, loadErr := fileCache.Load(ctx, cacheKey); loadErr != nil {
				return nil, loadErr
			} else if exists && validCachedPreview(cached) {
				return cached, nil
			}
			generated, generateErr := ffmpeg.create(ctx, file)
			if generateErr != nil {
				return nil, generateErr
			}
			if storeErr := fileCache.Store(ctx, cacheKey, generated); storeErr != nil {
				return nil, storeErr
			}
			return generated, nil
		})
		if err != nil {
			if errors.Is(err, errPreviewCoolingDown) {
				return http.StatusServiceUnavailable, fmt.Errorf("视频封面生成暂时冷却，请稍后重试")
			}
			return errToStatus(err), err
		}
	}

	w.Header().Set("Cache-Control", "private")
	http.ServeContent(w, r, file.Name+".jpg", file.ModTime, bytes.NewReader(preview))
	return 0, nil
}
