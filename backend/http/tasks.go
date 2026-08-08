package fbhttp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/history"
	"github.com/Kkwans/nas-file-browser/backend/tasks"
	"github.com/Kkwans/nas-file-browser/backend/trash"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

type trashClearTaskArgs struct {
	AllUsers bool `json:"allUsers"`
}

var taskListHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	all, err := d.store.Tasks.List(d.user.ID, d.user.Perm.Admin)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return renderJSON(w, r, all)
})

var taskGetHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	task, err := d.store.Tasks.Get(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin)
	if err != nil {
		return taskErrorStatus(err), err
	}
	return renderJSON(w, r, task)
})

func taskCancelHandler(runtime *tasks.Runtime) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		task, err := runtime.Cancel(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin)
		if err != nil {
			return taskErrorStatus(err), err
		}
		recordHistory(d, "task.cancel", task.Title, task.ID, history.StatusSuccess)
		return renderJSONStatus(w, task, http.StatusAccepted)
	})
}

func taskRetryHandler(runtime *tasks.Runtime) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		original, err := d.store.Tasks.Get(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin)
		if err != nil {
			return taskErrorStatus(err), err
		}
		if !original.CanRetry() {
			return http.StatusConflict, tasks.ErrState
		}
		if !d.user.Perm.Admin && !d.user.Perm.Delete {
			return http.StatusForbidden, fmt.Errorf("没有重试此任务的权限")
		}

		owner, err := d.store.Users.Get(d.server.Root, original.UserID)
		if err != nil {
			return http.StatusConflict, fmt.Errorf("任务所有者已不可用: %w", err)
		}
		retry, err := enqueueTask(runtime, d, owner, original.Type, original.Title, original.Args, original.ID)
		if err != nil {
			return taskErrorStatus(err), err
		}
		recordHistory(d, "task.retry", original.Title, retry.ID, history.StatusSubmitted)
		return renderJSONStatus(w, retry, http.StatusAccepted)
	})
}

func enqueueTrashClearTask(runtime *tasks.Runtime, d *data) (*tasks.Task, error) {
	args, err := json.Marshal(trashClearTaskArgs{AllUsers: d.user.Perm.Admin})
	if err != nil {
		return nil, err
	}
	return enqueueTask(runtime, d, d.user, tasks.TypeTrashClear, "清空回收站", args, "")
}

func enqueueTask(runtime *tasks.Runtime, d *data, owner *users.User, taskType tasks.Type, title string, args json.RawMessage, retryOf string) (*tasks.Task, error) {
	task, err := d.store.Tasks.New(owner.ID, owner.Username, taskType, title, args, retryOf)
	if err != nil {
		return nil, err
	}
	runner, err := taskRunner(d, task)
	if err == nil {
		if task.Type == tasks.TypeTrashClear {
			err = runtime.StartExclusive(task, runner, "trash.clear")
		} else {
			err = runtime.Start(task, runner)
		}
	}
	if err != nil {
		task.Status = tasks.StatusFailed
		task.FinishedAt = time.Now().UnixMilli()
		task.Error = err.Error()
		_ = d.store.Tasks.Update(task)
		return nil, err
	}
	return task, nil
}

func taskRunner(d *data, task *tasks.Task) (tasks.Runner, error) {
	switch task.Type {
	case tasks.TypeTrashClear:
		var args trashClearTaskArgs
		if err := json.Unmarshal(task.Args, &args); err != nil {
			return nil, fmt.Errorf("任务参数损坏: %w", err)
		}
		if args.AllUsers {
			owner, err := d.store.Users.Get(d.server.Root, task.UserID)
			if err != nil {
				return nil, err
			}
			if !owner.Perm.Admin && !d.user.Perm.Admin {
				return nil, fmt.Errorf("没有清空全部用户回收站的权限")
			}
		}
		return trashClearRunner(d, task, args), nil
	default:
		return nil, fmt.Errorf("不支持的任务类型 %q", task.Type)
	}
}

func trashClearRunner(d *data, task *tasks.Task, args trashClearTaskArgs) tasks.Runner {
	store := d.store
	root := d.server.Root
	dirMode := d.settings.DirMode
	return func(ctx context.Context, report tasks.Reporter) error {
		items, err := store.Trash.List(task.UserID, args.AllUsers)
		if err != nil {
			return err
		}
		progress := tasks.Progress{TotalItems: len(items)}
		if err := report(progress); err != nil {
			return err
		}
		for index, item := range items {
			if err := ctx.Err(); err != nil {
				return err
			}
			owner, err := store.Users.Get(root, item.UserID)
			if err != nil {
				return fmt.Errorf("第 %d 项的所有者不可用: %w", index+1, err)
			}
			service := &trash.Service{
				Fs: owner.Fs, Records: store.Trash,
				Favorites: store.Favorites, Tags: store.Tags, Recent: store.Recent,
				DirMode: dirMode,
			}
			if err := service.DeletePermanent(task.UserID, item.ID, args.AllUsers); err != nil {
				return fmt.Errorf("第 %d 项永久删除失败: %w", index+1, err)
			}
			progress.ProcessedItems++
			if err := report(progress); err != nil {
				return err
			}
		}
		return nil
	}
}

func taskErrorStatus(err error) int {
	switch {
	case errors.Is(err, tasks.ErrNotExist):
		return http.StatusNotFound
	case errors.Is(err, tasks.ErrForbidden):
		return http.StatusForbidden
	case errors.Is(err, tasks.ErrState):
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}
