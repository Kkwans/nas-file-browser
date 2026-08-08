package history

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sort"
	"sync"
	"time"
)

const MaxEntriesPerUser = 500

var ErrNotExist = errors.New("history entry not found")

type Status string

const (
	StatusSuccess   Status = "success"
	StatusFailed    Status = "failed"
	StatusSubmitted Status = "submitted"
)

// Entry intentionally hides UserID from JSON. History is always scoped to the
// authenticated user and is not an administrator-wide audit log.
type Entry struct {
	ID        string `json:"id" storm:"id"`
	UserID    uint   `json:"-" storm:"index"`
	Action    string `json:"action" storm:"index"`
	Target    string `json:"target"`
	Detail    string `json:"detail,omitempty"`
	Status    Status `json:"status" storm:"index"`
	CreatedAt int64  `json:"createdAt" storm:"index"`
}

func (entry *Entry) Clone() *Entry {
	if entry == nil {
		return nil
	}
	clone := *entry
	return &clone
}

type StorageBackend interface {
	GetByUser(userID uint) ([]*Entry, error)
	Save(entry *Entry) error
	Delete(id string) error
}

type Storage struct {
	back StorageBackend
	mu   sync.Mutex
}

func NewStorage(back StorageBackend) *Storage {
	return &Storage{back: back}
}

func (storage *Storage) Record(userID uint, action, target, detail string, status Status) (*Entry, error) {
	storage.mu.Lock()
	defer storage.mu.Unlock()

	id, err := generateID()
	if err != nil {
		return nil, err
	}
	entry := &Entry{
		ID: id, UserID: userID, Action: action, Target: target,
		Detail: detail, Status: status, CreatedAt: time.Now().UnixMilli(),
	}
	if err := storage.back.Save(entry); err != nil {
		return nil, err
	}
	if err := storage.prune(userID); err != nil {
		return nil, err
	}
	return entry.Clone(), nil
}

func (storage *Storage) List(userID uint, limit int) ([]*Entry, error) {
	entries, err := storage.back.GetByUser(userID)
	if err != nil {
		return nil, err
	}
	sortEntries(entries)
	if limit <= 0 || limit > MaxEntriesPerUser {
		limit = MaxEntriesPerUser
	}
	if len(entries) > limit {
		entries = entries[:limit]
	}
	result := make([]*Entry, len(entries))
	for index, entry := range entries {
		result[index] = entry.Clone()
	}
	return result, nil
}

func (storage *Storage) prune(userID uint) error {
	entries, err := storage.back.GetByUser(userID)
	if err != nil {
		return err
	}
	sortEntries(entries)
	for _, entry := range entries[minimum(len(entries), MaxEntriesPerUser):] {
		if err := storage.back.Delete(entry.ID); err != nil {
			return err
		}
	}
	return nil
}

func sortEntries(entries []*Entry) {
	sort.SliceStable(entries, func(left, right int) bool {
		if entries[left].CreatedAt == entries[right].CreatedAt {
			return entries[left].ID > entries[right].ID
		}
		return entries[left].CreatedAt > entries[right].CreatedAt
	})
}

func minimum(left, right int) int {
	if left < right {
		return left
	}
	return right
}

func generateID() (string, error) {
	random := make([]byte, 8)
	if _, err := rand.Read(random); err != nil {
		return "", err
	}
	return time.Now().UTC().Format("20060102T150405.000000000") + "-" + hex.EncodeToString(random), nil
}
