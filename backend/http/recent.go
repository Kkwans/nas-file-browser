package fbhttp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/Kkwans/nas-file-browser/backend/pathmeta"
	"github.com/Kkwans/nas-file-browser/backend/recent"
	"github.com/Kkwans/nas-file-browser/backend/trash"
)

type recentRecordRequest struct {
	Path string `json:"path"`
}

var recentListHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	limit := recent.MaxEntriesPerUser
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			return http.StatusBadRequest, fmt.Errorf("最近访问数量无效")
		}
		limit = parsed
	}
	entries, err := d.store.Recent.List(d.user.ID, limit)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return renderJSON(w, r, entries)
})

var recentRecordHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	var request recentRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		return http.StatusBadRequest, fmt.Errorf("最近访问参数无效: %w", err)
	}
	resourcePath := pathmeta.Clean(request.Path)
	if request.Path == "" || trash.IsInternalPath(resourcePath) {
		return http.StatusBadRequest, fmt.Errorf("最近访问路径无效")
	}
	if !d.Check(resourcePath) {
		return http.StatusForbidden, fmt.Errorf("没有访问该路径的权限")
	}
	info, err := d.user.Fs.Stat(resourcePath)
	if err != nil {
		return errToStatus(err), err
	}
	name := info.Name()
	if resourcePath == "/" {
		name = "根目录"
	}
	entry, err := d.store.Recent.Record(d.user.ID, resourcePath, name, info.IsDir())
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return renderJSON(w, r, entry)
})
