package tasks

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"time"
)

var (
	ErrNotExist  = errors.New("task not found")
	ErrForbidden = errors.New("task access denied")
	ErrState     = errors.New("task state does not allow this operation")
)

type Type string

const (
	TypeTrashClear        Type = "trash.clear"
	TypeDuplicateAnalysis Type = "analysis.duplicates"
	TypeStorageAnalysis   Type = "analysis.storage"
	TypeArchiveExtract    Type = "archive.extract"
	TypeMediaHLS          Type = "media.hls"
)

type Status string

const (
	StatusQueued      Status = "queued"
	StatusRunning     Status = "running"
	StatusCompleted   Status = "completed"
	StatusFailed      Status = "failed"
	StatusCanceled    Status = "canceled"
	StatusInterrupted Status = "interrupted"
)

// Task is the durable task state exposed to the task center. Args contains
// internal replay data and must never be serialized to an API response.
type Task struct {
	ID             string          `json:"id" storm:"id"`
	UserID         uint            `json:"userId" storm:"index"`
	OwnerName      string          `json:"ownerName"`
	Type           Type            `json:"type" storm:"index"`
	Title          string          `json:"title"`
	Status         Status          `json:"status" storm:"index"`
	CreatedAt      int64           `json:"createdAt" storm:"index"`
	StartedAt      int64           `json:"startedAt,omitempty"`
	FinishedAt     int64           `json:"finishedAt,omitempty"`
	ArchivedAt     int64           `json:"archivedAt,omitempty" storm:"index"`
	TotalItems     int             `json:"totalItems"`
	ProcessedItems int             `json:"processedItems"`
	TotalBytes     int64           `json:"totalBytes"`
	ProcessedBytes int64           `json:"processedBytes"`
	Error          string          `json:"error,omitempty"`
	RetryOf        string          `json:"retryOf,omitempty"`
	Args           json.RawMessage `json:"-"`
	Result         json.RawMessage `json:"-"`
}

func (task *Task) Clone() *Task {
	if task == nil {
		return nil
	}
	clone := *task
	clone.Args = append(json.RawMessage(nil), task.Args...)
	clone.Result = append(json.RawMessage(nil), task.Result...)
	return &clone
}

func (task *Task) CanCancel() bool {
	return task != nil && (task.Status == StatusQueued || task.Status == StatusRunning)
}

func (task *Task) CanRetry() bool {
	return task != nil && task.ArchivedAt == 0 && (task.Status == StatusFailed || task.Status == StatusInterrupted)
}

func (task *Task) CanArchive() bool {
	if task == nil || task.ArchivedAt != 0 {
		return false
	}
	return task.Status == StatusCompleted || task.Status == StatusFailed || task.Status == StatusCanceled || task.Status == StatusInterrupted
}

type StorageBackend interface {
	GetAll() ([]*Task, error)
	GetByID(id string) (*Task, error)
	Save(task *Task) error
	Update(task *Task) error
}

type Storage struct {
	back StorageBackend
}

func NewStorage(back StorageBackend) *Storage {
	return &Storage{back: back}
}

func (storage *Storage) New(userID uint, ownerName string, taskType Type, title string, args json.RawMessage, retryOf string) (*Task, error) {
	id, err := generateID()
	if err != nil {
		return nil, err
	}
	task := &Task{
		ID: id, UserID: userID, OwnerName: ownerName, Type: taskType,
		Title: title, Status: StatusQueued, CreatedAt: time.Now().UnixMilli(),
		RetryOf: retryOf, Args: append(json.RawMessage(nil), args...),
	}
	if err := storage.back.Save(task); err != nil {
		return nil, err
	}
	return task.Clone(), nil
}

func (storage *Storage) Save(task *Task) error {
	return storage.back.Save(task.Clone())
}

func (storage *Storage) Update(task *Task) error {
	return storage.back.Update(task.Clone())
}

func (storage *Storage) Get(userID uint, id string, admin bool) (*Task, error) {
	task, err := storage.back.GetByID(id)
	if err != nil {
		return nil, err
	}
	if !admin && task.UserID != userID {
		return nil, ErrForbidden
	}
	return task.Clone(), nil
}

func (storage *Storage) List(userID uint, admin bool) ([]*Task, error) {
	all, err := storage.back.GetAll()
	if err != nil {
		return nil, err
	}
	visible := make([]*Task, 0, len(all))
	for _, task := range all {
		if !admin && task.UserID != userID {
			continue
		}
		visible = append(visible, task.Clone())
	}
	sort.SliceStable(visible, func(left, right int) bool {
		if visible[left].CreatedAt == visible[right].CreatedAt {
			return visible[left].ID > visible[right].ID
		}
		return visible[left].CreatedAt > visible[right].CreatedAt
	})
	return visible, nil
}

// InterruptActive is called once during process startup. Tasks are never
// silently resumed after a restart because destructive work requires an
// explicit user retry.
func (storage *Storage) InterruptActive() error {
	all, err := storage.back.GetAll()
	if err != nil {
		return err
	}
	now := time.Now().UnixMilli()
	for _, task := range all {
		if !task.CanCancel() {
			continue
		}
		task.Status = StatusInterrupted
		task.FinishedAt = now
		task.Error = "服务重启，任务已中断"
		if err := storage.back.Update(task); err != nil {
			return err
		}
	}
	return nil
}

func generateID() (string, error) {
	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	return time.Now().UTC().Format("20060102T150405.000000000") + "-" + hex.EncodeToString(random), nil
}
