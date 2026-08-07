package diskcache

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"

	"github.com/spf13/afero"
)

type FileCache struct {
	fs afero.Fs

	scopedLocks struct {
		sync.Mutex
		locks map[string]*scopedLock
	}
}

type scopedLock struct {
	sync.Mutex
	references int
}

func New(fs afero.Fs, root string) *FileCache {
	return &FileCache{
		fs: afero.NewBasePathFs(fs, root),
	}
}

func (f *FileCache) Store(ctx context.Context, key string, value []byte) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	unlock := f.lockKey(key)
	defer unlock()

	fileName := f.getFileName(key)
	if err := f.fs.MkdirAll(filepath.Dir(fileName), 0700); err != nil {
		return err
	}

	temporary, err := afero.TempFile(f.fs, filepath.Dir(fileName), ".cache-*")
	if err != nil {
		return err
	}
	temporaryName := temporary.Name()
	committed := false
	defer func() {
		_ = temporary.Close()
		if !committed {
			_ = f.fs.Remove(temporaryName)
		}
	}()

	if err := f.fs.Chmod(temporaryName, 0600); err != nil {
		return err
	}
	if _, err := temporary.Write(value); err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := temporary.Sync(); err != nil {
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	if err := f.fs.Rename(temporaryName, fileName); err != nil {
		return err
	}
	committed = true
	return nil
}

func (f *FileCache) Load(ctx context.Context, key string) (value []byte, exist bool, err error) {
	if err := ctx.Err(); err != nil {
		return nil, false, err
	}
	r, ok, err := f.open(key)
	if err != nil || !ok {
		return nil, ok, err
	}
	defer func() {
		if closeErr := r.Close(); err == nil {
			err = closeErr
		}
	}()

	value, err = io.ReadAll(r)
	if err != nil {
		return nil, false, err
	}
	return value, true, nil
}

func (f *FileCache) Delete(ctx context.Context, key string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	unlock := f.lockKey(key)
	defer unlock()
	if err := ctx.Err(); err != nil {
		return err
	}

	fileName := f.getFileName(key)
	if err := f.fs.Remove(fileName); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

func (f *FileCache) open(key string) (afero.File, bool, error) {
	fileName := f.getFileName(key)
	file, err := f.fs.Open(fileName)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return nil, false, nil
		}
		return nil, false, err
	}

	return file, true, nil
}

// lockKey serializes writes for one cache key and removes the lock entry after
// the last user leaves, preventing long-running servers from retaining one
// mutex for every preview ever requested.
func (f *FileCache) lockKey(key string) func() {
	f.scopedLocks.Lock()
	if f.scopedLocks.locks == nil {
		f.scopedLocks.locks = make(map[string]*scopedLock)
	}
	lock := f.scopedLocks.locks[key]
	if lock == nil {
		lock = &scopedLock{}
		f.scopedLocks.locks[key] = lock
	}
	lock.references++
	f.scopedLocks.Unlock()

	lock.Lock()
	return func() {
		lock.Unlock()
		f.scopedLocks.Lock()
		lock.references--
		if lock.references == 0 {
			delete(f.scopedLocks.locks, key)
		}
		f.scopedLocks.Unlock()
	}
}

func (f *FileCache) getFileName(key string) string {
	hasher := sha1.New()
	_, _ = hasher.Write([]byte(key))
	hash := hex.EncodeToString(hasher.Sum(nil))
	return fmt.Sprintf("%s/%s/%s", hash[:1], hash[1:3], hash)
}
