package tags

import "testing"

func TestStorageKeepsTagsIsolatedByUser(t *testing.T) {
	backend := &memoryBackend{tags: []*Tag{
		{ID: "admin", UserID: 1, Name: "工作"},
		{ID: "guest", UserID: 2, Name: "私密"},
	}}
	storage := NewStorage(backend)

	tags, err := storage.GetAll(1)
	if err != nil {
		t.Fatalf("读取标签失败: %v", err)
	}
	if len(tags) != 1 || tags[0].ID != "admin" {
		t.Fatalf("用户 1 不应读取其他用户的标签: %#v", tags)
	}
}

type memoryBackend struct{ tags []*Tag }

func (m *memoryBackend) GetAll(userID uint) ([]*Tag, error) {
	result := make([]*Tag, 0)
	for _, tag := range m.tags {
		if tag.UserID == userID {
			result = append(result, tag)
		}
	}
	return result, nil
}
func (m *memoryBackend) GetByID(userID uint, id string) (*Tag, error) {
	for _, tag := range m.tags {
		if tag.ID == id && tag.UserID == userID {
			return tag, nil
		}
	}
	return nil, ErrNotExist
}
func (m *memoryBackend) Save(*Tag) error        { return nil }
func (m *memoryBackend) Update(*Tag) error      { return nil }
func (m *memoryBackend) Delete(string) error    { return nil }
func (m *memoryBackend) ClaimLegacy(uint) error { return nil }
