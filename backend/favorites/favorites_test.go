package favorites

import "testing"

func TestStorageKeepsFavoritesIsolatedByUser(t *testing.T) {
	backend := &memoryBackend{favorites: []*Favorite{
		{ID: "admin", UserID: 1, Path: "/documents", Name: "文档"},
		{ID: "guest", UserID: 2, Path: "/documents", Name: "文档"},
	}}
	storage := NewStorage(backend)

	favorites, err := storage.GetAll(1)
	if err != nil {
		t.Fatalf("读取收藏失败: %v", err)
	}
	if len(favorites) != 1 || favorites[0].ID != "admin" {
		t.Fatalf("用户 1 不应读取其他用户的收藏: %#v", favorites)
	}
}

type memoryBackend struct {
	favorites []*Favorite
}

func (m *memoryBackend) GetAll(userID uint) ([]*Favorite, error) {
	result := make([]*Favorite, 0)
	for _, favorite := range m.favorites {
		if favorite.UserID == userID {
			result = append(result, favorite)
		}
	}
	return result, nil
}
func (m *memoryBackend) GetByID(userID uint, id string) (*Favorite, error) {
	for _, favorite := range m.favorites {
		if favorite.ID == id && favorite.UserID == userID {
			return favorite, nil
		}
	}
	return nil, ErrNotExist
}
func (m *memoryBackend) GetByPath(userID uint, path string) (*Favorite, error) {
	for _, favorite := range m.favorites {
		if favorite.Path == path && favorite.UserID == userID {
			return favorite, nil
		}
	}
	return nil, ErrNotExist
}
func (m *memoryBackend) Save(*Favorite) error                              { return nil }
func (m *memoryBackend) Update(*Favorite) error                            { return nil }
func (m *memoryBackend) Delete(string) error                               { return nil }
func (m *memoryBackend) DeleteByPath(string) error                         { return nil }
func (m *memoryBackend) GetAllGroups(uint) ([]*FavoriteGroup, error)       { return nil, nil }
func (m *memoryBackend) GetGroupByID(uint, string) (*FavoriteGroup, error) { return nil, ErrNotExist }
func (m *memoryBackend) SaveGroup(*FavoriteGroup) error                    { return nil }
func (m *memoryBackend) UpdateGroup(*FavoriteGroup) error                  { return nil }
func (m *memoryBackend) DeleteGroup(string) error                          { return nil }
func (m *memoryBackend) ClaimLegacy(uint) error                            { return nil }
