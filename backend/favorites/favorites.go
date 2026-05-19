package favorites

import (
	"errors"
	"time"
)

var (
	ErrExist    = errors.New("收藏已存在")
	ErrNotExist = errors.New("收藏不存在")
)

// Favorite represents a bookmarked file/folder path.
type Favorite struct {
	ID      string `json:"id" storm:"id"`
	Path    string `json:"path" storm:"index"`
	Name    string `json:"name"`
	AddedAt int64  `json:"addedAt"`
	Order   int    `json:"order"`
}

// StorageBackend is the interface to implement for a favorites storage.
type StorageBackend interface {
	GetAll() ([]*Favorite, error)
	GetByID(id string) (*Favorite, error)
	GetByPath(path string) (*Favorite, error)
	Save(fav *Favorite) error
	Update(fav *Favorite) error
	Delete(id string) error
	DeleteByPath(path string) error
}

// Storage is the high-level storage for favorites.
type Storage struct {
	back StorageBackend
}

// NewStorage creates a favorites storage from a backend.
func NewStorage(back StorageBackend) *Storage {
	return &Storage{back: back}
}

// GetAll returns all favorites.
func (s *Storage) GetAll() ([]*Favorite, error) {
	return s.back.GetAll()
}

// GetByID returns a favorite by ID.
func (s *Storage) GetByID(id string) (*Favorite, error) {
	return s.back.GetByID(id)
}

// Add creates a new favorite. Returns error if path already exists.
func (s *Storage) Add(path, name string, currentCount int) (*Favorite, error) {
	_, err := s.back.GetByPath(path)
	if err == nil {
		return nil, ErrExist
	}
	if !errors.Is(err, ErrNotExist) {
		return nil, err
	}

	fav := &Favorite{
		ID:      GenerateID(),
		Path:    path,
		Name:    name,
		AddedAt: time.Now().UnixMilli(),
		Order:   currentCount,
	}

	if err := s.back.Save(fav); err != nil {
		return nil, err
	}
	return fav, nil
}

// UpdateFields updates name and/or order of a favorite.
func (s *Storage) UpdateFields(id string, name *string, order *int) (*Favorite, error) {
	fav, err := s.back.GetByID(id)
	if err != nil {
		return nil, err
	}

	if name != nil {
		fav.Name = *name
	}
	if order != nil {
		fav.Order = *order
	}

	if err := s.back.Update(fav); err != nil {
		return nil, err
	}
	return fav, nil
}

// Delete removes a favorite by ID.
func (s *Storage) Delete(id string) error {
	return s.back.Delete(id)
}

// DeleteByPath removes a favorite by path.
func (s *Storage) DeleteByPath(path string) error {
	return s.back.DeleteByPath(path)
}

// Reorder replaces the entire order of favorites.
func (s *Storage) Reorder(ids []string) error {
	for i, id := range ids {
		fav, err := s.back.GetByID(id)
		if err != nil {
			return err
		}
		fav.Order = i
		if err := s.back.Update(fav); err != nil {
			return err
		}
	}
	return nil
}

// GenerateID creates a unique ID based on timestamp.
func GenerateID() string {
	return time.Now().Format("20060102150405.000") + randomHex(6)
}

func randomHex(n int) string {
	const hex = "0123456789abcdef"
	b := make([]byte, n)
	t := time.Now().UnixNano()
	for i := range b {
		b[i] = hex[t%16]
		t >>= 4
	}
	return string(b)
}
