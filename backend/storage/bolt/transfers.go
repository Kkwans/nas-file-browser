package bolt

import (
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/transfers"
)

type transferRecord struct {
	ID               string           `storm:"id"`
	UserID           uint             `storm:"index"`
	Kind             transfers.Kind   `storm:"index"`
	Status           transfers.Status `storm:"index"`
	Name             string
	Target           string
	BytesTotal       int64
	BytesTransferred int64
	Error            string
	CreatedAt        int64 `storm:"index"`
	StartedAt        int64
	FinishedAt       int64
}

type transferBackend struct {
	db *storm.DB
}

func (backend transferBackend) GetAll() ([]*transfers.Item, error) {
	var records []*transferRecord
	if err := backend.db.All(&records); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return []*transfers.Item{}, nil
		}
		return nil, err
	}
	items := make([]*transfers.Item, len(records))
	for index, record := range records {
		items[index] = record.item()
	}
	return items, nil
}

func (backend transferBackend) GetByID(id string) (*transfers.Item, error) {
	var record transferRecord
	if err := backend.db.One("ID", id, &record); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return nil, transfers.ErrNotExist
		}
		return nil, err
	}
	return record.item(), nil
}

func (backend transferBackend) Save(item *transfers.Item) error {
	return backend.db.Save(newTransferRecord(item))
}

func (backend transferBackend) Update(item *transfers.Item) error {
	record := newTransferRecord(item)
	if err := backend.db.Update(record); err != nil {
		return err
	}
	// Storm omits zero values during updates; explicitly mirror fields that can
	// be cleared when a transfer is retried or a diagnostic is resolved.
	for field, value := range map[string]interface{}{
		"BytesTotal": item.BytesTotal, "BytesTransferred": item.BytesTransferred,
		"StartedAt": item.StartedAt, "FinishedAt": item.FinishedAt,
		"Error": item.Error,
	} {
		if err := backend.db.UpdateField(&transferRecord{ID: item.ID}, field, value); err != nil {
			return err
		}
	}
	return nil
}

func (backend transferBackend) Delete(id string) error {
	if err := backend.db.DeleteStruct(&transferRecord{ID: id}); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return transfers.ErrNotExist
		}
		return err
	}
	return nil
}

func newTransferRecord(item *transfers.Item) *transferRecord {
	return &transferRecord{
		ID: item.ID, UserID: item.UserID, Kind: item.Kind, Status: item.Status,
		Name: item.Name, Target: item.Target, BytesTotal: item.BytesTotal,
		BytesTransferred: item.BytesTransferred, Error: item.Error,
		CreatedAt: item.CreatedAt, StartedAt: item.StartedAt, FinishedAt: item.FinishedAt,
	}
}

func (record *transferRecord) item() *transfers.Item {
	return &transfers.Item{
		ID: record.ID, UserID: record.UserID, Kind: record.Kind, Status: record.Status,
		Name: record.Name, Target: record.Target, BytesTotal: record.BytesTotal,
		BytesTransferred: record.BytesTransferred, Error: record.Error,
		CreatedAt: record.CreatedAt, StartedAt: record.StartedAt, FinishedAt: record.FinishedAt,
	}
}
