package fbhttp

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/png"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/Kkwans/nas-file-browser/backend/files"
)

func TestPreviewCoordinatorMergesConcurrentWork(t *testing.T) {
	coordinator := newPreviewCoordinator()
	gate := make(chan struct{})
	workStarted := make(chan struct{})
	var calls atomic.Int32
	var signalWorkStarted sync.Once

	const waiters = 12
	results := make(chan []byte, waiters)
	errorsFound := make(chan error, waiters)
	var group sync.WaitGroup
	for range waiters {
		group.Add(1)
		go func() {
			defer group.Done()
			result, err := coordinator.Do(context.Background(), "same-key", func(context.Context) ([]byte, error) {
				calls.Add(1)
				signalWorkStarted.Do(func() { close(workStarted) })
				<-gate
				return []byte("preview"), nil
			})
			results <- result
			errorsFound <- err
		}()
	}

	select {
	case <-workStarted:
	case <-time.After(time.Second):
		close(gate)
		group.Wait()
		t.Fatal("shared work did not start")
	}

	deadline := time.Now().Add(time.Second)
	for {
		coordinator.Lock()
		flight := coordinator.flights["same-key"]
		allWaitersRegistered := flight != nil && flight.waiters == waiters
		coordinator.Unlock()
		if allWaitersRegistered {
			break
		}
		if time.Now().After(deadline) {
			close(gate)
			group.Wait()
			t.Fatalf("registered waiters did not reach %d", waiters)
		}
		time.Sleep(time.Millisecond)
	}
	close(gate)
	group.Wait()
	close(results)
	close(errorsFound)

	if calls.Load() != 1 {
		t.Fatalf("work called %d times, want 1", calls.Load())
	}
	for err := range errorsFound {
		if err != nil {
			t.Fatal(err)
		}
	}
	for result := range results {
		if string(result) != "preview" {
			t.Fatalf("result = %q", result)
		}
	}
}

func TestPreviewCoordinatorCancelsUnobservedWorkAndCoolsFailures(t *testing.T) {
	coordinator := newPreviewCoordinator()
	coordinator.cooldown = 20 * time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())
	workCanceled := make(chan struct{})
	done := make(chan error, 1)
	go func() {
		_, err := coordinator.Do(ctx, "cancel", func(workCtx context.Context) ([]byte, error) {
			<-workCtx.Done()
			close(workCanceled)
			return nil, context.Cause(workCtx)
		})
		done <- err
	}()
	cancel()
	if err := <-done; !errors.Is(err, context.Canceled) {
		t.Fatalf("waiter error = %v", err)
	}
	select {
	case <-workCanceled:
	case <-time.After(time.Second):
		t.Fatal("shared work was not canceled after its last waiter left")
	}

	boom := errors.New("boom")
	if _, err := coordinator.Do(context.Background(), "failure", func(context.Context) ([]byte, error) {
		return nil, boom
	}); !errors.Is(err, boom) {
		t.Fatalf("first error = %v", err)
	}
	if _, err := coordinator.Do(context.Background(), "failure", func(context.Context) ([]byte, error) {
		return []byte("unexpected"), nil
	}); !errors.Is(err, errPreviewCoolingDown) {
		t.Fatalf("cooldown error = %v", err)
	}
	time.Sleep(25 * time.Millisecond)
	result, err := coordinator.Do(context.Background(), "failure", func(context.Context) ([]byte, error) {
		return []byte("recovered"), nil
	})
	if err != nil || string(result) != "recovered" {
		t.Fatalf("recovery result = %q, error = %v", result, err)
	}
}

func TestFFmpegPreviewWorkerBounds(t *testing.T) {
	if got := cap(newFFmpegPreviewService(0).workers); got != 1 {
		t.Fatalf("default worker count = %d, want 1", got)
	}
	if got := cap(newFFmpegPreviewService(99).workers); got != 2 {
		t.Fatalf("maximum worker count = %d, want 2", got)
	}
}

func TestFFmpegImagePreviewWorkerBoundsAndPolicy(t *testing.T) {
	if got := cap(newFFmpegImagePreviewService(0).workers); got != 1 {
		t.Fatalf("default image worker count = %d, want 1", got)
	}
	if got := cap(newFFmpegImagePreviewService(99).workers); got != 1 {
		t.Fatalf("image worker count must stay globally bounded at 1, got %d", got)
	}

	largeJPEG := &files.FileInfo{Extension: ".jpg", Size: ffmpegImagePreviewMinBytes}
	if !shouldUseFFmpegImagePreview(largeJPEG, PreviewSizeBig) {
		t.Fatal("large JPEG big preview should use FFmpeg")
	}
	if !shouldUseFFmpegImagePreview(largeJPEG, PreviewSizeThumb) {
		t.Fatal("large JPEG thumbnail should use FFmpeg")
	}
	for _, file := range []*files.FileInfo{
		{Extension: ".png", Size: ffmpegImagePreviewMinBytes},
		{Extension: ".jpg", Size: ffmpegImagePreviewMinBytes - 1},
		{Extension: ".jpg", Size: ffmpegImagePreviewMinBytes},
	} {
		if file.Extension == ".jpg" && file.Size == ffmpegImagePreviewMinBytes {
			continue
		}
		if shouldUseFFmpegImagePreview(file, PreviewSizeBig) {
			t.Fatalf("FFmpeg image policy unexpectedly selected %+v", file)
		}
	}
}

func TestFFmpegImageFilterPreservesPreviewGeometry(t *testing.T) {
	filter, quality, err := ffmpegImageFilter(PreviewSizeBig)
	if err != nil || filter != "scale=1080:1080:force_original_aspect_ratio=decrease" || quality != "3" {
		t.Fatalf("big filter = %q, quality = %q, error = %v", filter, quality, err)
	}
	filter, quality, err = ffmpegImageFilter(PreviewSizeThumb)
	if err != nil || filter != "scale=256:256:force_original_aspect_ratio=increase,crop=256:256" || quality != "5" {
		t.Fatalf("thumb filter = %q, quality = %q, error = %v", filter, quality, err)
	}
}

func TestPreviewCoordinatorBoundsFailureCooldownEntries(t *testing.T) {
	coordinator := newPreviewCoordinator()
	coordinator.Lock()
	for index := 0; index < previewFailureEntries+10; index++ {
		coordinator.failures[fmt.Sprintf("failed-%d", index)] = time.Now().Add(time.Minute)
		if len(coordinator.failures) > previewFailureEntries {
			coordinator.evictEarliestFailure()
		}
	}
	count := len(coordinator.failures)
	coordinator.Unlock()
	if count != previewFailureEntries {
		t.Fatalf("failure cooldown entries = %d, want %d", count, previewFailureEntries)
	}
}

func TestPreviewCacheKeyIncludesFileIdentityAndSpecification(t *testing.T) {
	base := &files.FileInfo{Path: "/photos/image.jpg", Size: 100, ModTime: time.Unix(10, 20)}
	original := previewCacheKey(base, PreviewSizeThumb)

	changedSize := *base
	changedSize.Size++
	changedTime := *base
	changedTime.ModTime = changedTime.ModTime.Add(time.Nanosecond)
	if original == previewCacheKey(&changedSize, PreviewSizeThumb) {
		t.Fatal("file size must invalidate a cached preview")
	}
	if original == previewCacheKey(&changedTime, PreviewSizeThumb) {
		t.Fatal("mtime must invalidate a cached preview")
	}
	if original == previewCacheKey(base, PreviewSizeBig) {
		t.Fatal("preview specification must be part of the cache key")
	}
}

func TestValidCachedPreviewRejectsCorruptData(t *testing.T) {
	if validCachedPreview([]byte("not an image")) {
		t.Fatal("corrupt cache data must be rejected")
	}
	var encoded bytes.Buffer
	if err := png.Encode(&encoded, image.NewRGBA(image.Rect(0, 0, 1, 1))); err != nil {
		t.Fatal(err)
	}
	if !validCachedPreview(encoded.Bytes()) {
		t.Fatal("valid image data should be reusable")
	}
}

func TestFFmpegPreviewFailsSafelyWhenBinaryIsMissing(t *testing.T) {
	t.Setenv("PATH", t.TempDir())
	_, err := newFFmpegPreviewService(1).create(context.Background(), &files.FileInfo{})
	if err == nil {
		t.Fatal("missing FFmpeg should return a safe error")
	}
}
