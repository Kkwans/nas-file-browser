package bolt

import (
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/favorites"
)

type favoritesBackend struct {
	db *storm.DB
}

func (f favoritesBackend) ClaimLegacy(userID uint) error {
	var allFavorites []*favorites.Favorite
	if err := f.db.All(&allFavorites); err != nil && !errors.Is(err, storm.ErrNotFound) {
		return err
	}
	for _, favorite := range allFavorites {
		if favorite.UserID == 0 {
			favorite.UserID = userID
			if err := f.db.Update(favorite); err != nil {
				return err
			}
		}
	}

	var allGroups []*favorites.FavoriteGroup
	if err := f.db.All(&allGroups); err != nil && !errors.Is(err, storm.ErrNotFound) {
		return err
	}
	for _, group := range allGroups {
		if group.UserID == 0 {
			group.UserID = userID
			if err := f.db.Update(group); err != nil {
				return err
			}
		}
	}
	return nil
}

func (f favoritesBackend) GetAll(userID uint) ([]*favorites.Favorite, error) {
	var all []*favorites.Favorite
	err := f.db.Find("UserID", userID, &all)
	if errors.Is(err, storm.ErrNotFound) {
		return []*favorites.Favorite{}, nil
	}
	return all, err
}

func (f favoritesBackend) GetByID(userID uint, id string) (*favorites.Favorite, error) {
	var fav favorites.Favorite
	err := f.db.One("ID", id, &fav)
	if errors.Is(err, storm.ErrNotFound) {
		return nil, favorites.ErrNotExist
	}
	if err != nil {
		return nil, favorites.ErrNotExist
	}
	if fav.UserID == userID {
		return &fav, nil
	}
	// 兼容按用户隔离改造前创建的旧记录，在首次变更时完成归属迁移。
	if fav.UserID == 0 {
		fav.UserID = userID
		if err := f.db.Update(&fav); err != nil {
			return nil, err
		}
		return &fav, nil
	}
	return nil, favorites.ErrNotExist
}

func (f favoritesBackend) GetByPath(userID uint, path string) (*favorites.Favorite, error) {
	all, err := f.GetAll(userID)
	if err != nil {
		return nil, err
	}
	for _, fav := range all {
		if fav.Path == path {
			return fav, nil
		}
	}
	return nil, favorites.ErrNotExist
}

func (f favoritesBackend) Save(fav *favorites.Favorite) error {
	return f.db.Save(fav)
}

func (f favoritesBackend) Update(fav *favorites.Favorite) error {
	return f.db.Update(fav)
}

func (f favoritesBackend) UpdateGroupID(id string, groupID string) error {
	return f.db.UpdateField(&favorites.Favorite{ID: id}, "GroupID", groupID)
}

func (f favoritesBackend) Delete(id string) error {
	return f.db.DeleteStruct(&favorites.Favorite{ID: id})
}

// --- Group methods ---

func (f favoritesBackend) GetAllGroups(userID uint) ([]*favorites.FavoriteGroup, error) {
	var all []*favorites.FavoriteGroup
	err := f.db.Find("UserID", userID, &all)
	if errors.Is(err, storm.ErrNotFound) {
		return []*favorites.FavoriteGroup{}, nil
	}
	return all, err
}

func (f favoritesBackend) GetGroupByID(userID uint, id string) (*favorites.FavoriteGroup, error) {
	var group favorites.FavoriteGroup
	err := f.db.One("ID", id, &group)
	if errors.Is(err, storm.ErrNotFound) {
		return nil, favorites.ErrNotExist
	}
	if err != nil {
		return nil, favorites.ErrNotExist
	}
	if group.UserID == userID {
		return &group, nil
	}
	if group.UserID == 0 {
		group.UserID = userID
		if err := f.db.Update(&group); err != nil {
			return nil, err
		}
		return &group, nil
	}
	return nil, favorites.ErrNotExist
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

func (f favoritesBackend) DeleteByPath(path string) error {
	var all []*favorites.Favorite
	if err := f.db.All(&all); err != nil && !errors.Is(err, storm.ErrNotFound) {
		return err
	}
	for _, fav := range all {
		if fav.Path == path {
			return f.db.DeleteStruct(fav)
		}
	}
	return nil
}
