package fbhttp

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/trash"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

type trashRestoreRequest struct {
	Conflict trash.ConflictStrategy `json:"conflict"`
}

var trashListHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	items, err := d.store.Trash.List(d.user.ID, d.user.Perm.Admin)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	public := make([]trash.PublicItem, len(items))
	for index, item := range items {
		public[index] = item.Public()
	}
	return renderJSON(w, r, public)
})

var trashRestoreHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	item, owner, status, err := trashItemAndOwner(d, mux.Vars(r)["id"])
	if err != nil {
		return status, err
	}
	if !d.user.Perm.Admin {
		if !d.user.Perm.Create || !d.Check(item.OriginalPath) {
			return http.StatusForbidden, fmt.Errorf("没有恢复权限")
		}
	}

	request := trashRestoreRequest{Conflict: trash.ConflictFail}
	if r.Body != nil && r.Body != http.NoBody {
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return http.StatusBadRequest, fmt.Errorf("恢复参数无效: %w", err)
		}
	}
	if request.Conflict == trash.ConflictReplace && !d.user.Perm.Admin && !d.user.Perm.Delete {
		return http.StatusForbidden, fmt.Errorf("替换现有文件需要删除权限")
	}

	result, err := newTrashService(d, owner).Restore(d.user.ID, item.ID, d.user.Perm.Admin, request.Conflict)
	if err != nil {
		return trashErrorStatus(err), err
	}
	return renderJSON(w, r, result)
})

var trashDeleteHandler = withUser(func(_ http.ResponseWriter, r *http.Request, d *data) (int, error) {
	item, owner, status, err := trashItemAndOwner(d, mux.Vars(r)["id"])
	if err != nil {
		return status, err
	}
	if !d.user.Perm.Admin && !d.user.Perm.Delete {
		return http.StatusForbidden, fmt.Errorf("没有永久删除权限")
	}
	if err := newTrashService(d, owner).DeletePermanent(d.user.ID, item.ID, d.user.Perm.Admin); err != nil {
		return trashErrorStatus(err), err
	}
	return http.StatusNoContent, nil
})

var trashClearHandler = withUser(func(_ http.ResponseWriter, _ *http.Request, d *data) (int, error) {
	if !d.user.Perm.Admin && !d.user.Perm.Delete {
		return http.StatusForbidden, fmt.Errorf("没有清空回收站权限")
	}
	items, err := d.store.Trash.List(d.user.ID, d.user.Perm.Admin)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	for index, item := range items {
		owner, err := trashOwner(d, item)
		if err != nil {
			return http.StatusInternalServerError, fmt.Errorf("清空回收站在第 %d 项失败: %w", index+1, err)
		}
		if err := newTrashService(d, owner).DeletePermanent(d.user.ID, item.ID, d.user.Perm.Admin); err != nil {
			return trashErrorStatus(err), fmt.Errorf("清空回收站在第 %d 项失败: %w", index+1, err)
		}
	}
	return http.StatusNoContent, nil
})

func trashItemAndOwner(d *data, id string) (*trash.Item, *users.User, int, error) {
	item, err := d.store.Trash.Get(d.user.ID, id, d.user.Perm.Admin)
	if err != nil {
		return nil, nil, trashErrorStatus(err), err
	}
	owner, err := trashOwner(d, item)
	if err != nil {
		return nil, nil, http.StatusInternalServerError, err
	}
	return item, owner, 0, nil
}

func trashOwner(d *data, item *trash.Item) (*users.User, error) {
	if item.UserID == d.user.ID {
		return d.user, nil
	}
	return d.store.Users.Get(d.server.Root, item.UserID)
}

func newTrashService(d *data, owner *users.User) *trash.Service {
	return &trash.Service{
		Fs: owner.Fs, Records: d.store.Trash,
		Favorites: d.store.Favorites, Tags: d.store.Tags,
		DirMode: d.settings.DirMode,
	}
}

func trashErrorStatus(err error) int {
	switch {
	case errors.Is(err, trash.ErrNotExist):
		return http.StatusNotFound
	case errors.Is(err, trash.ErrForbidden):
		return http.StatusForbidden
	case errors.Is(err, trash.ErrConflict), errors.Is(err, trash.ErrUnavailable):
		return http.StatusConflict
	case errors.Is(err, trash.ErrInvalidPath), errors.Is(err, trash.ErrFilesystemRoot), errors.Is(err, trash.ErrInvalidConflict):
		return http.StatusBadRequest
	default:
		return errToStatus(err)
	}
}
