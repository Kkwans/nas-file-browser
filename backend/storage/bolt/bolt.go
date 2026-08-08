package bolt

import (
	"errors"

	"github.com/asdine/storm/v3"

	"github.com/Kkwans/nas-file-browser/backend/auth"
	"github.com/Kkwans/nas-file-browser/backend/favorites"
	"github.com/Kkwans/nas-file-browser/backend/settings"
	"github.com/Kkwans/nas-file-browser/backend/share"
	"github.com/Kkwans/nas-file-browser/backend/storage"
	"github.com/Kkwans/nas-file-browser/backend/tags"
	"github.com/Kkwans/nas-file-browser/backend/trash"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

// NewStorage creates a storage.Storage based on Bolt DB.
func NewStorage(db *storm.DB) (*storage.Storage, error) {
	userStore := users.NewStorage(usersBackend{db: db})
	shareStore := share.NewStorage(shareBackend{db: db})
	settingsStore := settings.NewStorage(settingsBackend{db: db})
	authStore := auth.NewStorage(authBackend{db: db}, userStore)
	favoriteBackend := favoritesBackend{db: db}
	tagBackend := tagsBackend{db: db}
	if err := migrateMetadataOwners(db, favoriteBackend, tagBackend); err != nil {
		return nil, err
	}
	favoriteStore := favorites.NewStorage(favoriteBackend)
	tagStore := tags.NewStorage(tagBackend)
	trashStore := trash.NewStorage(trashBackend{db: db})

	err := save(db, "version", 3)
	if err != nil {
		return nil, err
	}

	return &storage.Storage{
		Auth:      authStore,
		Users:     userStore,
		Share:     shareStore,
		Settings:  settingsStore,
		Favorites: favoriteStore,
		Tags:      tagStore,
		Trash:     trashStore,
	}, nil
}

func migrateMetadataOwners(db *storm.DB, favoriteBackend favoritesBackend, tagBackend tagsBackend) error {
	var allUsers []*users.User
	if err := db.All(&allUsers); err != nil {
		if errors.Is(err, storm.ErrNotFound) {
			return nil
		}
		return err
	}
	userIDs := make([]uint, 0, len(allUsers))
	for _, user := range allUsers {
		userIDs = append(userIDs, user.ID)
	}
	if err := favoriteBackend.migrateOwners(userIDs); err != nil {
		return err
	}
	return tagBackend.migrateOwners(userIDs)
}
