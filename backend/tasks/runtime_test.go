package tasks

import (
	"context"
	"errors"
	"testing"
	"time"
)

func TestRuntimeCompletesTaskWithDurableProgress(t *testing.T) {
	backend := newMemoryBackend()
	storage := NewStorage(backend)
	runtime, err := NewRuntime(storage)
	if err != nil {
		t.Fatal(err)
	}
	task, err := storage.New(1, "owner", TypeTrashClear, "清空回收站", nil, "")
	if err != nil {
		t.Fatal(err)
	}
	if err := runtime.Start(task, func(_ context.Context, report Reporter) error {
		return report(Progress{TotalItems: 3, ProcessedItems: 3, TotalBytes: 30, ProcessedBytes: 30})
	}); err != nil {
		t.Fatal(err)
	}

	completed := waitForTaskStatus(t, backend, task.ID, StatusCompleted)
	if completed.ProcessedItems != 3 || completed.ProcessedBytes != 30 || completed.FinishedAt == 0 {
		t.Fatalf("completed task = %#v", completed)
	}
}

func TestRuntimeCancellationStopsWorker(t *testing.T) {
	backend := newMemoryBackend()
	storage := NewStorage(backend)
	runtime, err := NewRuntime(storage)
	if err != nil {
		t.Fatal(err)
	}
	task, err := storage.New(1, "owner", TypeTrashClear, "清空回收站", nil, "")
	if err != nil {
		t.Fatal(err)
	}
	started := make(chan struct{})
	if err := runtime.Start(task, func(ctx context.Context, _ Reporter) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	}); err != nil {
		t.Fatal(err)
	}
	select {
	case <-started:
	case <-time.After(2 * time.Second):
		t.Fatal("worker did not start")
	}
	if _, err := runtime.Cancel(task.UserID, task.ID, false); err != nil {
		t.Fatal(err)
	}
	canceled := waitForTaskStatus(t, backend, task.ID, StatusCanceled)
	if !canceled.CanRetry() || canceled.Error == "" {
		t.Fatalf("canceled task = %#v", canceled)
	}
}

func TestRuntimeExclusiveKeyRejectsOverlappingDestructiveTask(t *testing.T) {
	backend := newMemoryBackend()
	storage := NewStorage(backend)
	runtime, err := NewRuntime(storage)
	if err != nil {
		t.Fatal(err)
	}
	first, err := storage.New(1, "first", TypeTrashClear, "first", nil, "")
	if err != nil {
		t.Fatal(err)
	}
	second, err := storage.New(2, "second", TypeTrashClear, "second", nil, "")
	if err != nil {
		t.Fatal(err)
	}
	started := make(chan struct{})
	if err := runtime.StartExclusive(first, func(ctx context.Context, _ Reporter) error {
		close(started)
		<-ctx.Done()
		return ctx.Err()
	}, "trash.clear"); err != nil {
		t.Fatal(err)
	}
	<-started
	if err := runtime.StartExclusive(second, func(context.Context, Reporter) error { return nil }, "trash.clear"); !errors.Is(err, ErrState) {
		t.Fatalf("overlapping start error = %v", err)
	}
	if _, err := runtime.Cancel(first.UserID, first.ID, false); err != nil {
		t.Fatal(err)
	}
	waitForTaskStatus(t, backend, first.ID, StatusCanceled)
	deadline := time.Now().Add(2 * time.Second)
	for {
		err = runtime.StartExclusive(second, func(context.Context, Reporter) error { return nil }, "trash.clear")
		if err == nil {
			break
		}
		if !errors.Is(err, ErrState) || time.Now().After(deadline) {
			t.Fatalf("exclusive key was not released: %v", err)
		}
		time.Sleep(time.Millisecond)
	}
	waitForTaskStatus(t, backend, second.ID, StatusCompleted)
}

func waitForTaskStatus(t *testing.T, backend *memoryBackend, id string, status Status) *Task {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		task, err := backend.GetByID(id)
		if err != nil {
			t.Fatal(err)
		}
		if task.Status == status {
			return task
		}
		time.Sleep(time.Millisecond)
	}
	task, _ := backend.GetByID(id)
	t.Fatalf("task did not reach %q: %#v", status, task)
	return nil
}
