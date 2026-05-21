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
	Path       string     `json:"path"`
	Name       string     `json:"name"`
	Type       string     `json:"type"` // system, usb, network, docker
	TotalSpace uint64     `json:"totalSpace"`
	UsedSpace  uint64     `json:"usedSpace"`
	SubDirs    []SubDir   `json:"subDirs,omitempty"`
}

// SubDir represents a notable subdirectory within a volume.
type SubDir struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// knownSubDirs returns the list of notable subdirectories for a given volume.
func knownSubDirs(volumePath string) []SubDir {
	dirs := []struct {
		suffix string
		name   string
	}{
		{"@home", "用户主目录"},
		{"@docker", "Docker 数据"},
		{"@appstore", "应用数据"},
		{"@tmp", "临时文件"},
		{"@upload", "上传缓存"},
		{"@search", "搜索索引"},
		{"@thumbnail", "缩略图缓存"},
		{"@appcache", "应用缓存"},
		{"@appdata", "应用配置"},
		{"@applog", "应用日志"},
		{"@exif", "EXIF 数据"},
		{"@FileManager", "文件管理器数据"},
		{"@video", "视频索引"},
		{"@RecentlyScan", "最近扫描"},
		{"@eaDir", "NAS 元数据"},
		{"Docker", "Docker 项目"},
		{"DockerProject", "Docker 工程"},
		{"docker-apps", "Docker 应用"},
		{"Download", "下载"},
		{"Movie", "电影"},
		{"Movies", "电影"},
		{"Music", "音乐"},
		{"Photos", "照片"},
		{"Pictures", "图片"},
		{"TV", "电视剧"},
		{"Video", "视频"},
		{"Videos", "视频"},
		{"Documents", "文档"},
		{"Common", "公共文件"},
		{"迅雷下载", "迅雷下载"},
	}

	result := make([]SubDir, 0, len(dirs))
	for _, d := range dirs {
		p := filepath.Join(volumePath, d.suffix)
		if info, err := os.Stat(p); err == nil && info.IsDir() {
			result = append(result, SubDir{Path: p, Name: d.name})
		}
	}
	return result
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
			SubDirs: knownSubDirs(fullPath),
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
