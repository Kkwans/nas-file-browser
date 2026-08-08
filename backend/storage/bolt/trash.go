package bolt

import (
	"encoding/json"
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/favorites"
	"github.com/Kkwans/nas-file-browser/backend/tags"
	"github.com/Kkwans/nas-file-browser/backend/trash"
)

// trashRecord isolates Storm's flat persisted representation from the public
// domain type. In particular, staged metadata and the hidden storage path can
// never leak because HTTP code only receives trash.Item values.
type trashRecord struct {
	ID           string `storm:"id"`
	UserID       uint   `storm:"index"`
	OwnerName    string
	OriginalPath string `storm:"index"`
	StoredPath   string `storm:"unique"`
	Name         string
	IsDir        bool
	Size         int64
	DeletedAt    int64        `storm:"index"`
	Status       trash.Status `storm:"index"`
	LastError    string
	Metadata     string
}

type trashMetadata struct {
	Favorites []favorites.Favorite `json:"favorites,omitempty"`
	Tags      []tags.Tag           `json:"tags,omitempty"`
}

type trashBackend struct {
	db *storm.DB
}

func (backend trashBackend) GetAll() ([]*trash.Item, error) {
	var records []*trashRecord
	err := backend.db.All(&records)
	if errors.Is(err, storm.ErrNotFound) {
		return []*trash.Item{}, nil
	}
	if err != nil {
		return nil, err
	}
	items := make([]*trash.Item, 0, len(records))
	for _, record := range records {
		item, err := record.item()
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, nil
}

func (backend trashBackend) GetByID(id string) (*trash.Item, error) {
	var record trashRecord
	if err := backend.db.One("ID", id, &record); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return nil, trash.ErrNotExist
		}
		return nil, err
	}
	return record.item()
}

func (backend trashBackend) Save(item *trash.Item) error {
	record, err := newTrashRecord(item)
	if err != nil {
		return err
	}
	return backend.db.Save(record)
}

func (backend trashBackend) Update(item *trash.Item) error {
	record, err := newTrashRecord(item)
	if err != nil {
		return err
	}
	if err := backend.db.Update(record); err != nil {
		return err
	}
	// Storm's struct update skips zero values. A successful retry must still
	// be able to clear the previous diagnostic message.
	return backend.db.UpdateField(&trashRecord{ID: item.ID}, "LastError", item.LastError)
}

func (backend trashBackend) Delete(id string) error {
	if err := backend.db.DeleteStruct(&trashRecord{ID: id}); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return trash.ErrNotExist
		}
		return err
	}
	return nil
}

func newTrashRecord(item *trash.Item) (*trashRecord, error) {
	metadata, err := json.Marshal(trashMetadata{
		Favorites: item.FavoriteSnapshots,
		Tags:      item.TagSnapshots,
	})
	if err != nil {
		return nil, err
	}
	return &trashRecord{
		ID:           item.ID,
		UserID:       item.UserID,
		OwnerName:    item.OwnerName,
		OriginalPath: item.OriginalPath,
		StoredPath:   item.StoredPath,
		Name:         item.Name,
		IsDir:        item.IsDir,
		Size:         item.Size,
		DeletedAt:    item.DeletedAt,
		Status:       item.Status,
		LastError:    item.LastError,
		Metadata:     string(metadata),
	}, nil
}

func (record *trashRecord) item() (*trash.Item, error) {
	var metadata trashMetadata
	if record.Metadata != "" {
		if err := json.Unmarshal([]byte(record.Metadata), &metadata); err != nil {
			return nil, err
		}
	}
	return &trash.Item{
		ID:                record.ID,
		UserID:            record.UserID,
		OwnerName:         record.OwnerName,
		OriginalPath:      record.OriginalPath,
		StoredPath:        record.StoredPath,
		Name:              record.Name,
		IsDir:             record.IsDir,
		Size:              record.Size,
		DeletedAt:         record.DeletedAt,
		Status:            record.Status,
		LastError:         record.LastError,
		FavoriteSnapshots: metadata.Favorites,
		TagSnapshots:      metadata.Tags,
	}, nil
}
