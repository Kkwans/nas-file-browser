package favorites

import (
	"errors"
	"fmt"
	"sync/atomic"
	"time"
)

var (
	ErrExist       = errors.New("favorite already exists")
	ErrNotExist    = errors.New("favorite not found")
	ErrGroupExist  = errors.New("group already exists")
	ErrGroupInUse  = errors.New("group still contains favorites")
)

// FavoriteGroup represents a virtual directory for organizing favorites.
type FavoriteGroup struct {
	ID      string `json:"id" storm:"id"`
	Name    string `json:"name"`
	Order   int    `json:"order"`
	Color   string `json:"color,omitempty"`
}

// Favorite represents a bookmarked file/folder path.
type Favorite struct {
	ID      string `json:"id" storm:"id"`
	Path    string `json:"path" storm:"index"`
	Name    string `json:"name"`
	GroupID string `json:"groupId,omitempty"`
	AddedAt int64  `json:"addedAt"`
	Order   int    `json:"order"`
}

// GroupStorageBackend is the interface for favorite group storage.
type GroupStorageBackend interface {
	GetAllGroups() ([]*FavoriteGroup, error)
	GetGroupByID(id string) (*FavoriteGroup, error)
	SaveGroup(group *FavoriteGroup) error
	UpdateGroup(group *FavoriteGroup) error
	DeleteGroup(id string) error
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
	GroupStorageBackend
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
	return s.AddToGroup(path, name, "", currentCount)
}

// AddToGroup creates a new favorite in a specific group.
func (s *Storage) AddToGroup(path, name, groupID string, currentCount int) (*Favorite, error) {
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
		GroupID: groupID,
		AddedAt: time.Now().UnixMilli(),
		Order:   currentCount,
	}

	if err := s.back.Save(fav); err != nil {
		return nil, err
	}
	return fav, nil
}

// UpdateFields updates name, order, and/or groupID of a favorite.
func (s *Storage) UpdateFields(id string, name *string, order *int) (*Favorite, error) {
	return s.UpdateFieldsEx(id, name, order, nil)
}

// UpdateFieldsEx updates name, order, and/or groupID of a favorite.
func (s *Storage) UpdateFieldsEx(id string, name *string, order *int, groupID *string) (*Favorite, error) {
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
	if groupID != nil {
		fav.GroupID = *groupID
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

// --- Group methods ---

// GetAllGroups returns all favorite groups.
func (s *Storage) GetAllGroups() ([]*FavoriteGroup, error) {
	return s.back.GetAllGroups()
}

// AddGroup creates a new favorite group.
func (s *Storage) AddGroup(name, color string, currentCount int) (*FavoriteGroup, error) {
	group := &FavoriteGroup{
		ID:    GenerateID(),
		Name:  name,
		Color: color,
		Order: currentCount,
	}
	if err := s.back.SaveGroup(group); err != nil {
		return nil, err
	}
	return group, nil
}

// UpdateGroupFields updates name/color of a group.
func (s *Storage) UpdateGroupFields(id string, name *string, color *string) (*FavoriteGroup, error) {
	group, err := s.back.GetGroupByID(id)
	if err != nil {
		return nil, err
	}
	if name != nil {
		group.Name = *name
	}
	if color != nil {
		group.Color = *color
	}
	if err := s.back.UpdateGroup(group); err != nil {
		return nil, err
	}
	return group, nil
}

// DeleteGroup removes a favorite group. Returns error if group still has favorites.
func (s *Storage) DeleteGroup(id string) error {
	// Check if any favorites belong to this group
	allFavs, err := s.back.GetAll()
	if err != nil {
		return err
	}
	for _, fav := range allFavs {
		if fav.GroupID == id {
			return ErrGroupInUse
		}
	}
	return s.back.DeleteGroup(id)
}

// ReorderGroups replaces the entire order of groups.
func (s *Storage) ReorderGroups(ids []string) error {
	for i, id := range ids {
		group, err := s.back.GetGroupByID(id)
		if err != nil {
			return err
		}
		group.Order = i
		if err := s.back.UpdateGroup(group); err != nil {
			return err
		}
	}
	return nil
}

// GenerateID creates a unique ID based on timestamp + counter.
var idCounter uint64

func GenerateID() string {
	c := atomic.AddUint64(&idCounter, 1)
	return time.Now().Format("20060102150405.000") + "-" + fmt.Sprintf("%06x", c&0xFFFFFF)
}
