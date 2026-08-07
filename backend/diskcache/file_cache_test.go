package diskcache

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"github.com/spf13/afero"
	"github.com/stretchr/testify/require"
)

func TestFileCache(t *testing.T) {
	ctx := context.Background()
	const (
		key            = "key"
		value          = "some text"
		newValue       = "new text"
		cacheRoot      = "/cache"
		cachedFilePath = "a/62/a62f2225bf70bfaccbc7f1ef2a397836717377de"
	)

	fs := afero.NewMemMapFs()
	cache := New(fs, "/cache")

	// store new key
	err := cache.Store(ctx, key, []byte(value))
	require.NoError(t, err)
	checkValue(ctx, t, fs, filepath.Join(cacheRoot, cachedFilePath), cache, key, value)

	// update existing key
	err = cache.Store(ctx, key, []byte(newValue))
	require.NoError(t, err)
	checkValue(ctx, t, fs, filepath.Join(cacheRoot, cachedFilePath), cache, key, newValue)

	// delete key
	err = cache.Delete(ctx, key)
	require.NoError(t, err)
	exists, err := afero.Exists(fs, filepath.Join(cacheRoot, cachedFilePath))
	require.NoError(t, err)
	require.False(t, exists)
}

func TestFileCacheCanceledStorePreservesCommittedValue(t *testing.T) {
	fs := afero.NewMemMapFs()
	cache := New(fs, "/cache")
	if err := cache.Store(context.Background(), "key", []byte("committed")); err != nil {
		t.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := cache.Store(ctx, "key", []byte("partial")); !errors.Is(err, context.Canceled) {
		t.Fatalf("store error = %v, want context.Canceled", err)
	}
	value, exists, err := cache.Load(context.Background(), "key")
	if err != nil || !exists || string(value) != "committed" {
		t.Fatalf("value = %q, exists = %v, error = %v", value, exists, err)
	}
}

func TestFileCacheReleasesScopedLocks(t *testing.T) {
	cache := New(afero.NewMemMapFs(), "/cache")
	if err := cache.Store(context.Background(), "key", []byte("value")); err != nil {
		t.Fatal(err)
	}
	cache.scopedLocks.Lock()
	count := len(cache.scopedLocks.locks)
	cache.scopedLocks.Unlock()
	if count != 0 {
		t.Fatalf("retained scoped locks = %d, want 0", count)
	}
}

func checkValue(ctx context.Context, t *testing.T, fs afero.Fs, fileFullPath string, cache *FileCache, key, wantValue string) {
	t.Helper()
	// check actual file content
	b, err := afero.ReadFile(fs, fileFullPath)
	require.NoError(t, err)
	require.Equal(t, wantValue, string(b))

	// check cache content
	b, ok, err := cache.Load(ctx, key)
	require.NoError(t, err)
	require.True(t, ok)
	require.Equal(t, wantValue, string(b))
}
