package fbhttp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/events"
	"github.com/Kkwans/nas-file-browser/backend/transfers"
)

const (
	defaultTransferPageSize = 500
	maxTransferPageSize     = transfers.MaxEntriesPerUser
)

type transferListResponse struct {
	Items []*transfers.Item `json:"items"`
	Total int               `json:"total"`
}

type downloadTransferRequest struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Target     string `json:"target"`
	Path       string `json:"path"`
	URL        string `json:"url"`
	BytesTotal int64  `json:"bytesTotal"`
}

type downloadTransferResponse struct {
	Item *transfers.Item `json:"item"`
	URL  string          `json:"url,omitempty"`
}

var transferListHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if d.store.Transfers == nil {
		return http.StatusServiceUnavailable, fmt.Errorf("传输记录服务不可用")
	}
	kind, err := parseTransferKind(r.URL.Query().Get("kind"))
	if err != nil {
		return http.StatusBadRequest, err
	}
	limit := defaultTransferPageSize
	if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
		if _, scanErr := fmt.Sscanf(raw, "%d", &limit); scanErr != nil || limit < 1 || limit > maxTransferPageSize {
			return http.StatusBadRequest, fmt.Errorf("limit 必须在 1 到 %d 之间", maxTransferPageSize)
		}
	}
	items, err := d.store.Transfers.List(d.user.ID, kind, limit)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return renderJSON(w, r, transferListResponse{Items: items, Total: len(items)})
})

var transferGetHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if d.store.Transfers == nil {
		return http.StatusServiceUnavailable, fmt.Errorf("传输记录服务不可用")
	}
	item, err := d.store.Transfers.Get(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin)
	if err != nil {
		return transferErrorStatus(err), err
	}
	return renderJSON(w, r, item)
})

var transferDownloadCreateHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if d.store.Transfers == nil {
		return http.StatusServiceUnavailable, fmt.Errorf("传输记录服务不可用")
	}
	if !d.user.Perm.Download {
		return http.StatusForbidden, fmt.Errorf("没有下载权限")
	}
	var request downloadTransferRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		return http.StatusBadRequest, fmt.Errorf("下载任务参数无效: %w", err)
	}
	if request.Target == "" {
		request.Target = request.Path
	}
	if request.Name == "" {
		request.Name = request.Target
	}
	if request.Target == "" {
		return http.StatusBadRequest, fmt.Errorf("下载目标不能为空")
	}
	item, err := d.store.Transfers.Ensure(d.user.ID, strings.TrimSpace(request.ID), transfers.KindDownload, request.Name, request.Target, request.BytesTotal)
	if err != nil {
		return transferErrorStatus(err), err
	}
	publishTransfer(item)
	return renderJSONStatus(w, downloadTransferResponse{Item: item, URL: request.URL}, http.StatusCreated)
})

var transferCancelHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if d.store.Transfers == nil {
		return http.StatusServiceUnavailable, fmt.Errorf("传输记录服务不可用")
	}
	item, err := d.store.Transfers.Get(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin)
	if err != nil {
		return transferErrorStatus(err), err
	}
	if item.Status != transfers.StatusQueued && item.Status != transfers.StatusRunning {
		return http.StatusConflict, fmt.Errorf("传输已结束，无法取消")
	}
	updated, err := d.store.Transfers.SetStatus(item.ID, item.UserID, transfers.StatusCanceled, "")
	if err != nil {
		return http.StatusInternalServerError, err
	}
	publishTransfer(updated)
	return renderJSONStatus(w, updated, http.StatusAccepted)
})

var transferDeleteHandler = withUser(func(_ http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if d.store.Transfers == nil {
		return http.StatusServiceUnavailable, fmt.Errorf("传输记录服务不可用")
	}
	if err := d.store.Transfers.Delete(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin); err != nil {
		return transferErrorStatus(err), err
	}
	events.Default.PublishForUser(d.user.ID, "transfer.changed", map[string]string{"id": mux.Vars(r)["id"], "status": "deleted"})
	return http.StatusNoContent, nil
})

func publishTransfer(item *transfers.Item) {
	if item != nil {
		events.Default.PublishForUser(item.UserID, "transfer.changed", item)
	}
}

func parseTransferKind(raw string) (transfers.Kind, error) {
	switch transfers.Kind(strings.TrimSpace(raw)) {
	case "":
		return "", nil
	case transfers.KindUpload:
		return transfers.KindUpload, nil
	case transfers.KindDownload:
		return transfers.KindDownload, nil
	default:
		return "", fmt.Errorf("未知传输类型 %q", raw)
	}
}

func transferErrorStatus(err error) int {
	if err == transfers.ErrNotExist {
		return http.StatusNotFound
	}
	if err == transfers.ErrInvalid {
		return http.StatusBadRequest
	}
	return http.StatusInternalServerError
}
