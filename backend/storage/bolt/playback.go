package bolt

import (
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/playback"
)

type playbackRecord struct {
	ID        string `storm:"id"`
	UserID    uint   `storm:"index"`
	Path      string `storm:"index"`
	Identity  string
	Position  float64
	Duration  float64
	UpdatedAt int64 `storm:"index"`
}

type playbackBackend struct {
	db *storm.DB
}

func (backend playbackBackend) GetByID(id string) (*playback.Entry, error) {
	var record playbackRecord
	if err := backend.db.One("ID", id, &record); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return nil, playback.ErrNotExist
		}
		return nil, err
	}
	return record.entry(), nil
}

func (backend playbackBackend) Save(entry *playback.Entry) error {
	return backend.db.Save(newPlaybackRecord(entry))
}

func (backend playbackBackend) Update(entry *playback.Entry) error {
	record := newPlaybackRecord(entry)
	if err := backend.db.Update(record); err != nil {
		return err
	}
	for field, value := range map[string]interface{}{
		"Position": entry.Position,
		"Duration": entry.Duration,
	} {
		if err := backend.db.UpdateField(&playbackRecord{ID: entry.ID}, field, value); err != nil {
			return err
		}
	}
	return nil
}

func (backend playbackBackend) Delete(id string) error {
	if err := backend.db.DeleteStruct(&playbackRecord{ID: id}); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return playback.ErrNotExist
		}
		return err
	}
	return nil
}

func newPlaybackRecord(entry *playback.Entry) *playbackRecord {
	return &playbackRecord{
		ID: entry.ID, UserID: entry.UserID, Path: entry.Path,
		Identity: entry.Identity, Position: entry.Position,
		Duration: entry.Duration, UpdatedAt: entry.UpdatedAt,
	}
}

func (record *playbackRecord) entry() *playback.Entry {
	return &playback.Entry{
		ID: record.ID, UserID: record.UserID, Path: record.Path,
		Identity: record.Identity, Position: record.Position,
		Duration: record.Duration, UpdatedAt: record.UpdatedAt,
	}
}
