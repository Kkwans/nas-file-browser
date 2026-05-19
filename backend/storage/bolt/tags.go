package bolt

import (
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/tags"
)

type tagsBackend struct {
	db *storm.DB
}

func (t tagsBackend) GetAll() ([]*tags.Tag, error) {
	var all []*tags.Tag
	err := t.db.All(&all)
	if errors.Is(err, storm.ErrNotFound) {
		return []*tags.Tag{}, nil
	}
	return all, err
}

func (t tagsBackend) GetByID(id string) (*tags.Tag, error) {
	var tag tags.Tag
	err := t.db.One("ID", id, &tag)
	if errors.Is(err, storm.ErrNotFound) {
		return nil, tags.ErrNotExist
	}
	return &tag, err
}

func (t tagsBackend) Save(tag *tags.Tag) error {
	return t.db.Save(tag)
}

func (t tagsBackend) Update(tag *tags.Tag) error {
	return t.db.Update(tag)
}

func (t tagsBackend) Delete(id string) error {
	return t.db.DeleteStruct(&tags.Tag{ID: id})
}
