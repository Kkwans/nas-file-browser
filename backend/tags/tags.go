package tags

import (
	"errors"
	"fmt"
	"sync/atomic"
	"time"
)

var (
	ErrNotExist = errors.New("tag not found")
)

// Tag represents a label that can be attached to file/folder paths.
type Tag struct {
	ID        string   `json:"id" storm:"id"`
	Name      string   `json:"name" storm:"index"`
	Color     string   `json:"color"`
	Paths     []string `json:"paths"`
	CreatedAt int64    `json:"createdAt"`
}

// StorageBackend is the interface to implement for a tags storage.
type StorageBackend interface {
	GetAll() ([]*Tag, error)
	GetByID(id string) (*Tag, error)
	Save(tag *Tag) error
	Update(tag *Tag) error
	Delete(id string) error
}

// Storage is the high-level storage for tags.
type Storage struct {
	back StorageBackend
}

// NewStorage creates a tags storage from a backend.
func NewStorage(back StorageBackend) *Storage {
	return &Storage{back: back}
}

// GetAll returns all tags.
func (s *Storage) GetAll() ([]*Tag, error) {
	return s.back.GetAll()
}

// GetByID returns a tag by ID.
func (s *Storage) GetByID(id string) (*Tag, error) {
	return s.back.GetByID(id)
}

// Create creates a new tag.
func (s *Storage) Create(name, color string) (*Tag, error) {
	tag := &Tag{
		ID:        generateID(),
		Name:      name,
		Color:     color,
		Paths:     []string{},
		CreatedAt: time.Now().UnixMilli(),
	}
	if err := s.back.Save(tag); err != nil {
		return nil, err
	}
	return tag, nil
}

// UpdateFields updates name and/or color of a tag.
func (s *Storage) UpdateFields(id string, name *string, color *string) (*Tag, error) {
	tag, err := s.back.GetByID(id)
	if err != nil {
		return nil, err
	}

	if name != nil {
		tag.Name = *name
	}
	if color != nil {
		tag.Color = *color
	}

	if err := s.back.Update(tag); err != nil {
		return nil, err
	}
	return tag, nil
}

// Delete removes a tag by ID.
func (s *Storage) Delete(id string) error {
	return s.back.Delete(id)
}

// AddPath adds a path to a tag (no-op if already present).
func (s *Storage) AddPath(id, path string) (*Tag, error) {
	tag, err := s.back.GetByID(id)
	if err != nil {
		return nil, err
	}

	for _, p := range tag.Paths {
		if p == path {
			return tag, nil // already exists
		}
	}

	tag.Paths = append(tag.Paths, path)
	if err := s.back.Update(tag); err != nil {
		return nil, err
	}
	return tag, nil
}

// RemovePath removes a path from a tag.
func (s *Storage) RemovePath(id, path string) (*Tag, error) {
	tag, err := s.back.GetByID(id)
	if err != nil {
		return nil, err
	}

	newPaths := make([]string, 0, len(tag.Paths))
	for _, p := range tag.Paths {
		if p != path {
			newPaths = append(newPaths, p)
		}
	}
	tag.Paths = newPaths

	if err := s.back.Update(tag); err != nil {
		return nil, err
	}
	return tag, nil
}

// generateID creates a unique ID based on timestamp + counter.
var tagIDCounter uint64

func generateID() string {
	c := atomic.AddUint64(&tagIDCounter, 1)
	return time.Now().Format("20060102150405.000") + "-" + fmt.Sprintf("%06x", c&0xFFFFFF)
}
