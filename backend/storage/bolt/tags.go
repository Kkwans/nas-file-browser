package bolt

import (
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/tags"
)

type tagsBackend struct {
	db *storm.DB
}

func (t tagsBackend) ClaimLegacy(userID uint) error {
	var all []*tags.Tag
	if err := t.db.All(&all); err != nil && !errors.Is(err, storm.ErrNotFound) {
		return err
	}
	for _, tag := range all {
		if tag.UserID == 0 {
			tag.UserID = userID
			if err := t.db.Update(tag); err != nil {
				return err
			}
		}
	}
	return nil
}

func (t tagsBackend) GetAll(userID uint) ([]*tags.Tag, error) {
	var all []*tags.Tag
	err := t.db.Find("UserID", userID, &all)
	if errors.Is(err, storm.ErrNotFound) {
		return []*tags.Tag{}, nil
	}
	return all, err
}

func (t tagsBackend) GetAllForPathMutation() ([]*tags.Tag, error) {
	var all []*tags.Tag
	err := t.db.All(&all)
	if errors.Is(err, storm.ErrNotFound) {
		return []*tags.Tag{}, nil
	}
	return all, err
}

func (t tagsBackend) GetByID(userID uint, id string) (*tags.Tag, error) {
	var tag tags.Tag
	err := t.db.One("ID", id, &tag)
	if errors.Is(err, storm.ErrNotFound) {
		return nil, tags.ErrNotExist
	}
	if err != nil {
		return nil, tags.ErrNotExist
	}
	if tag.UserID == userID {
		return &tag, nil
	}
	// 兼容按用户隔离改造前创建的旧记录，在首次变更时完成归属迁移。
	if tag.UserID == 0 {
		tag.UserID = userID
		if err := t.db.Update(&tag); err != nil {
			return nil, err
		}
		return &tag, nil
	}
	return nil, tags.ErrNotExist
}

func (t tagsBackend) Save(tag *tags.Tag) error {
	return t.db.Save(tag)
}

func (t tagsBackend) Update(tag *tags.Tag) error {
	return t.db.Update(tag)
}

func (t tagsBackend) UpdatePaths(id string, paths []string) error {
	return t.db.UpdateField(&tags.Tag{ID: id}, "Paths", paths)
}

func (t tagsBackend) Delete(id string) error {
	return t.db.DeleteStruct(&tags.Tag{ID: id})
}
