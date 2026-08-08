package bolt

import (
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
	favoriteStore := favorites.NewStorage(favoritesBackend{db: db})
	tagStore := tags.NewStorage(tagsBackend{db: db})
	trashStore := trash.NewStorage(trashBackend{db: db})

	err := save(db, "version", 2)
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
