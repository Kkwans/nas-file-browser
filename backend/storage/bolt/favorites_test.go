package bolt

import (
	"path/filepath"
	"testing"

	"github.com/Kkwans/nas-file-browser/backend/favorites"
	"github.com/asdine/storm/v3"
)

func TestFavoritesBackendClaimsLegacyRecordOnMutation(t *testing.T) {
	db, err := storm.Open(filepath.Join(t.TempDir(), "favorites.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	backend := favoritesBackend{db: db}
	if err := backend.Save(&favorites.Favorite{ID: "legacy", Path: "/资料", Name: "资料"}); err != nil {
		t.Fatal(err)
	}

	favorite, err := backend.GetByID(7, "legacy")
	if err != nil {
		t.Fatalf("旧收藏应该可被当前账号接管: %v", err)
	}
	if favorite.UserID != 7 {
		t.Fatalf("收藏所有者未迁移: %d", favorite.UserID)
	}
}
