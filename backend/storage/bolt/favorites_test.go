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
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})

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

func TestFavoritesBackendPersistsMovingFavoriteOutOfGroup(t *testing.T) {
	db, err := storm.Open(filepath.Join(t.TempDir(), "favorites.db"))
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Error(err)
		}
	})

	backend := favoritesBackend{db: db}
	storage := favorites.NewStorage(backend)
	if err := backend.Save(&favorites.Favorite{
		ID:      "grouped",
		UserID:  7,
		Path:    "/资料",
		Name:    "资料",
		GroupID: "project",
	}); err != nil {
		t.Fatal(err)
	}

	ungrouped := ""
	if _, err := storage.UpdateFieldsEx(7, "grouped", nil, nil, &ungrouped); err != nil {
		t.Fatalf("移出分组失败: %v", err)
	}

	favorite, err := backend.GetByID(7, "grouped")
	if err != nil {
		t.Fatal(err)
	}
	if favorite.GroupID != "" {
		t.Fatalf("空分组未持久化: %q", favorite.GroupID)
	}
}
