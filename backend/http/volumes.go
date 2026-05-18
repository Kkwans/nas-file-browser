package fbhttp

import (
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/shirou/gopsutil/v4/disk"
)

// Volume represents a storage volume on the NAS.
type Volume struct {
	Path       string `json:"path"`
	Name       string `json:"name"`
	Type       string `json:"type"` // system, usb, network, docker
	TotalSpace uint64 `json:"totalSpace"`
	UsedSpace  uint64 `json:"usedSpace"`
}

// volumeType determines the type label for a given mount path.
func volumeType(path string) string {
	base := filepath.Base(path)
	switch {
	case strings.HasPrefix(base, "volumeUSB"):
		return "usb"
	case strings.HasPrefix(base, "volumeSATA"), strings.HasPrefix(base, "volumeNVMe"):
		return "network"
	default:
		return "system"
	}
}

// volumeName returns a human-readable name for a volume path.
func volumeName(path string) string {
	base := filepath.Base(path)
	switch {
	case base == "volume1":
		return "存储卷 1"
	case base == "volume2":
		return "存储卷 2"
	case strings.HasPrefix(base, "volume"):
		return "存储卷 " + strings.TrimPrefix(base, "volume")
	case strings.HasPrefix(base, "volumeUSB"):
		return "USB 存储 " + strings.TrimPrefix(base, "volumeUSB")
	default:
		return base
	}
}

var volumesHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if !d.user.Perm.Admin {
		return http.StatusForbidden, fmt.Errorf("没有访问权限")
	}

	volumes := make([]Volume, 0, 8)

	// Scan /volume* directories at root
	entries, err := os.ReadDir("/")
	if err != nil {
		return http.StatusInternalServerError, fmt.Errorf("读取根目录失败: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		name := entry.Name()
		if !strings.HasPrefix(name, "volume") {
			continue
		}

		fullPath := "/" + name

		// Skip Docker internal overlay paths
		if strings.Contains(fullPath, "@docker") {
			continue
		}

		vol := Volume{
			Path: fullPath,
			Name: volumeName(fullPath),
			Type: volumeType(fullPath),
		}

		// Get disk usage for this volume
		usage, err := disk.UsageWithContext(r.Context(), fullPath)
		if err == nil {
			vol.TotalSpace = usage.Total
			vol.UsedSpace = usage.Used
		}

		volumes = append(volumes, vol)
	}

	return renderJSON(w, r, volumes)
})
