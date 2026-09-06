package bolt

import (
	"encoding/json"
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/tasks"
)

type taskRecord struct {
	ID             string `storm:"id"`
	UserID         uint   `storm:"index"`
	OwnerName      string
	Type           tasks.Type `storm:"index"`
	Title          string
	Status         tasks.Status `storm:"index"`
	CreatedAt      int64        `storm:"index"`
	StartedAt      int64
	FinishedAt     int64
	UndoUntil      int64
	ArchivedAt     int64 `storm:"index"`
	TotalItems     int
	ProcessedItems int
	TotalBytes     int64
	ProcessedBytes int64
	Error          string
	RetryOf        string
	Args           string
	Result         string
}

type taskBackend struct {
	db *storm.DB
}

func (backend taskBackend) GetAll() ([]*tasks.Task, error) {
	var records []*taskRecord
	if err := backend.db.All(&records); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return []*tasks.Task{}, nil
		}
		return nil, err
	}
	result := make([]*tasks.Task, len(records))
	for index, record := range records {
		result[index] = record.task()
	}
	return result, nil
}

func (backend taskBackend) GetByID(id string) (*tasks.Task, error) {
	var record taskRecord
	if err := backend.db.One("ID", id, &record); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return nil, tasks.ErrNotExist
		}
		return nil, err
	}
	return record.task(), nil
}

func (backend taskBackend) Save(task *tasks.Task) error {
	return backend.db.Save(newTaskRecord(task))
}

func (backend taskBackend) Update(task *tasks.Task) error {
	record := newTaskRecord(task)
	if err := backend.db.Update(record); err != nil {
		return err
	}
	// Storm omits zero values during struct updates. These fields must still be
	// clearable when a task is retried or a diagnostic is resolved.
	for field, value := range map[string]interface{}{
		"StartedAt": task.StartedAt, "FinishedAt": task.FinishedAt,
		"UndoUntil":  task.UndoUntil,
		"ArchivedAt": task.ArchivedAt,
		"TotalItems": task.TotalItems, "ProcessedItems": task.ProcessedItems,
		"TotalBytes": task.TotalBytes, "ProcessedBytes": task.ProcessedBytes,
		"Error":  task.Error,
		"Result": string(task.Result),
	} {
		if err := backend.db.UpdateField(&taskRecord{ID: task.ID}, field, value); err != nil {
			return err
		}
	}
	return nil
}

func newTaskRecord(task *tasks.Task) *taskRecord {
	return &taskRecord{
		ID: task.ID, UserID: task.UserID, OwnerName: task.OwnerName,
		Type: task.Type, Title: task.Title, Status: task.Status,
		CreatedAt: task.CreatedAt, StartedAt: task.StartedAt,
		FinishedAt: task.FinishedAt, UndoUntil: task.UndoUntil, TotalItems: task.TotalItems,
		ArchivedAt:     task.ArchivedAt,
		ProcessedItems: task.ProcessedItems, TotalBytes: task.TotalBytes,
		ProcessedBytes: task.ProcessedBytes, Error: task.Error,
		RetryOf: task.RetryOf, Args: string(task.Args), Result: string(task.Result),
	}
}

func (record *taskRecord) task() *tasks.Task {
	return &tasks.Task{
		ID: record.ID, UserID: record.UserID, OwnerName: record.OwnerName,
		Type: record.Type, Title: record.Title, Status: record.Status,
		CreatedAt: record.CreatedAt, StartedAt: record.StartedAt,
		FinishedAt: record.FinishedAt, UndoUntil: record.UndoUntil, TotalItems: record.TotalItems,
		ArchivedAt:     record.ArchivedAt,
		ProcessedItems: record.ProcessedItems, TotalBytes: record.TotalBytes,
		ProcessedBytes: record.ProcessedBytes, Error: record.Error,
		RetryOf: record.RetryOf, Args: json.RawMessage(record.Args), Result: json.RawMessage(record.Result),
	}
}
