//go:build windows

package files

import (
	"os"
	"path/filepath"
	"syscall"
	"time"

	"github.com/spf13/afero"
)

func setCreatedTime(file *FileInfo) {
	if file == nil || file.Fs == nil {
		return
	}
	base, ok := file.Fs.(*afero.BasePathFs)
	if !ok {
		return
	}
	path := filepath.Clean(afero.FullBaseFsPath(base, file.Path))
	info, err := os.Stat(path)
	if err != nil {
		return
	}
	data, ok := info.Sys().(*syscall.Win32FileAttributeData)
	if !ok || data == nil {
		return
	}
	created := time.Unix(0, data.CreationTime.Nanoseconds())
	file.Created = &created
}
