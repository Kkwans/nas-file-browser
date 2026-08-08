package storage

import (
	"github.com/Kkwans/nas-file-browser/backend/auth"
	"github.com/Kkwans/nas-file-browser/backend/favorites"
	"github.com/Kkwans/nas-file-browser/backend/settings"
	"github.com/Kkwans/nas-file-browser/backend/share"
	"github.com/Kkwans/nas-file-browser/backend/tags"
	"github.com/Kkwans/nas-file-browser/backend/trash"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

// Storage is a storage powered by a Backend which makes the necessary
// verifications when fetching and saving data to ensure consistency.
type Storage struct {
	Users     users.Store
	Share     *share.Storage
	Auth      *auth.Storage
	Settings  *settings.Storage
	Favorites *favorites.Storage
	Tags      *tags.Storage
	Trash     *trash.Storage
}
