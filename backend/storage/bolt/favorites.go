package bolt

import (
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/favorites"
)

type favoritesBackend struct {
	db *storm.DB
}

func (f favoritesBackend) GetAll() ([]*favorites.Favorite, error) {
	var all []*favorites.Favorite
	err := f.db.All(&all)
	if errors.Is(err, storm.ErrNotFound) {
		return []*favorites.Favorite{}, nil
	}
	return all, err
}

func (f favoritesBackend) GetByID(id string) (*favorites.Favorite, error) {
	var fav favorites.Favorite
	err := f.db.One("ID", id, &fav)
	if errors.Is(err, storm.ErrNotFound) {
		return nil, favorites.ErrNotExist
	}
	return &fav, err
}

func (f favoritesBackend) GetByPath(path string) (*favorites.Favorite, error) {
	var fav favorites.Favorite
	err := f.db.One("Path", path, &fav)
	if errors.Is(err, storm.ErrNotFound) {
		return nil, favorites.ErrNotExist
	}
	return &fav, err
}

func (f favoritesBackend) Save(fav *favorites.Favorite) error {
	return f.db.Save(fav)
}

func (f favoritesBackend) Update(fav *favorites.Favorite) error {
	return f.db.Update(fav)
}

func (f favoritesBackend) Delete(id string) error {
	return f.db.DeleteStruct(&favorites.Favorite{ID: id})
}

func (f favoritesBackend) DeleteByPath(path string) error {
	fav, err := f.GetByPath(path)
	if err != nil {
		return err
	}
	return f.db.DeleteStruct(fav)
}

// --- Group methods ---

func (f favoritesBackend) GetAllGroups() ([]*favorites.FavoriteGroup, error) {
	var all []*favorites.FavoriteGroup
	err := f.db.All(&all)
	if errors.Is(err, storm.ErrNotFound) {
		return []*favorites.FavoriteGroup{}, nil
	}
	return all, err
}

func (f favoritesBackend) GetGroupByID(id string) (*favorites.FavoriteGroup, error) {
	var group favorites.FavoriteGroup
	err := f.db.One("ID", id, &group)
	if errors.Is(err, storm.ErrNotFound) {
		return nil, favorites.ErrNotExist
	}
	return &group, err
}

func (f favoritesBackend) SaveGroup(group *favorites.FavoriteGroup) error {
	return f.db.Save(group)
}

func (f favoritesBackend) UpdateGroup(group *favorites.FavoriteGroup) error {
	return f.db.Update(group)
}

func (f favoritesBackend) DeleteGroup(id string) error {
	return f.db.DeleteStruct(&favorites.FavoriteGroup{ID: id})
}
