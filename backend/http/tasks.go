package fbhttp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/archivefs"
	"github.com/Kkwans/nas-file-browser/backend/history"
	"github.com/Kkwans/nas-file-browser/backend/hls"
	"github.com/Kkwans/nas-file-browser/backend/tasks"
	"github.com/Kkwans/nas-file-browser/backend/trash"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

type trashClearTaskArgs struct {
	AllUsers bool `json:"allUsers"`
}

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

func taskRetryHandler(runtime *tasks.Runtime, hlsServices ...*hls.Service) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		original, err := d.store.Tasks.Get(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin)
		if err != nil {
			return taskErrorStatus(err), err
		}
		retry, status, err := retryExistingTask(runtime, d, original, hlsServices...)
		if err != nil {
			return status, err
		}
		recordHistory(d, "task.retry", original.Title, retry.ID, history.StatusSubmitted)
		return renderJSONStatus(w, retry, http.StatusAccepted)
	})
}

func retryExistingTask(runtime *tasks.Runtime, d *data, original *tasks.Task, hlsServices ...*hls.Service) (*tasks.Task, int, error) {
	if !original.CanRetry() {
		return nil, http.StatusConflict, tasks.ErrState
	}
	if !d.user.Perm.Admin && !canRunTaskType(d.user, original.Type) {
		return nil, http.StatusForbidden, fmt.Errorf("没有重试此任务的权限")
	}

	owner, err := d.store.Users.Get(d.server.Root, original.UserID)
	if err != nil {
		return nil, http.StatusConflict, fmt.Errorf("任务所有者已不可用: %w", err)
	}
	var retry *tasks.Task
	if original.Type == tasks.TypeMediaHLS {
		if len(hlsServices) == 0 || hlsServices[0] == nil {
			return nil, http.StatusConflict, fmt.Errorf("兼容播放服务不可用")
		}
		var args mediaHLSTaskArgs
		if err := json.Unmarshal(original.Args, &args); err != nil {
			return nil, http.StatusConflict, fmt.Errorf("任务参数损坏: %w", err)
		}
		input, status, err := mediaHLSInput(d, owner, args.Path)
		if err != nil {
			return nil, status, err
		}
		reserve := hlsServices[0].Reserve
		if args.Format == "webm" {
			reserve = hlsServices[0].ReserveWebM
		}
		_, created, reserveErr := reserve(input, func(job hls.Job) (string, error) {
			retry, err = enqueueMediaHLSTask(runtime, d, owner, hlsServices[0], job, original.ID)
			if err != nil {
				return "", err
			}
			return retry.ID, nil
		})
		if reserveErr != nil {
			return nil, taskErrorStatus(reserveErr), reserveErr
		}
		if !created || retry == nil {
			return nil, http.StatusConflict, fmt.Errorf("该视频已有可用或正在执行的兼容播放任务")
		}
	} else {
		retry, err = enqueueTask(runtime, d, owner, original.Type, original.Title, original.Args, original.ID)
	}
	if err != nil {
		return nil, taskErrorStatus(err), err
	}
	return retry, http.StatusAccepted, nil
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
	case tasks.TypeDuplicateAnalysis:
		var args duplicateAnalysisArgs
		if err := json.Unmarshal(task.Args, &args); err != nil {
			return nil, fmt.Errorf("任务参数损坏: %w", err)
		}
		owner, err := d.store.Users.Get(d.server.Root, task.UserID)
		if err != nil {
			return nil, fmt.Errorf("任务所有者已不可用: %w", err)
		}
		if !owner.Perm.Download {
			return nil, fmt.Errorf("任务所有者没有读取文件内容的权限")
		}
		ownerData := *d
		ownerData.user = owner
		paths, err := validateAnalysisScopes(&ownerData, args.Paths)
		if err != nil {
			return nil, err
		}
		return duplicateAnalysisRunner(&ownerData, task, duplicateAnalysisArgs{Paths: paths}), nil
	case tasks.TypeStorageAnalysis:
		var args storageAnalysisArgs
		if err := json.Unmarshal(task.Args, &args); err != nil {
			return nil, fmt.Errorf("任务参数损坏: %w", err)
		}
		owner, err := d.store.Users.Get(d.server.Root, task.UserID)
		if err != nil {
			return nil, fmt.Errorf("任务所有者已不可用: %w", err)
		}
		if !owner.Perm.Download {
			return nil, fmt.Errorf("任务所有者没有读取文件元数据的权限")
		}
		ownerData := *d
		ownerData.user = owner
		paths, err := validateAnalysisScopes(&ownerData, args.Paths)
		if err != nil {
			return nil, err
		}
		return storageAnalysisRunner(&ownerData, task, storageAnalysisArgs{Paths: paths}), nil
	case tasks.TypeArchiveExtract:
		var args archiveExtractTaskArgs
		if err := json.Unmarshal(task.Args, &args); err != nil {
			return nil, fmt.Errorf("任务参数损坏: %w", err)
		}
		owner, err := d.store.Users.Get(d.server.Root, task.UserID)
		if err != nil {
			return nil, fmt.Errorf("任务所有者已不可用: %w", err)
		}
		if !owner.Perm.Download || !owner.Perm.Create {
			return nil, fmt.Errorf("任务所有者没有读取压缩包或创建文件的权限")
		}
		ownerData := *d
		ownerData.user = owner
		if !ownerData.Check(args.ArchivePath) || !ownerData.Check(args.Destination) {
			return nil, fmt.Errorf("任务路径已不可访问")
		}
		selected, err := archivefs.NormalizeSelections(args.Selected, archivefs.DefaultMaxSelected)
		if err != nil {
			return nil, err
		}
		args.Selected = selected
		return archiveExtractRunner(&ownerData, task, args), nil
	default:
		return nil, fmt.Errorf("不支持的任务类型 %q", task.Type)
	}
}

func canRunTaskType(user *users.User, taskType tasks.Type) bool {
	if user == nil {
		return false
	}
	switch taskType {
	case tasks.TypeTrashClear:
		return user.Perm.Delete
	case tasks.TypeDuplicateAnalysis:
		return user.Perm.Download
	case tasks.TypeStorageAnalysis:
		return user.Perm.Download
	case tasks.TypeArchiveExtract:
		return user.Perm.Download && user.Perm.Create
	case tasks.TypeMediaHLS:
		return user.Perm.Download
	default:
		return false
	}
}

func trashClearRunner(d *data, task *tasks.Task, args trashClearTaskArgs) tasks.Runner {
	store := d.store
	root := d.server.Root
	dirMode := d.settings.DirMode
	return func(ctx context.Context, report tasks.Reporter) (json.RawMessage, error) {
		items, err := store.Trash.List(task.UserID, args.AllUsers)
		if err != nil {
			return nil, err
		}
		progress := tasks.Progress{TotalItems: len(items)}
		if err := report(progress); err != nil {
			return nil, err
		}
		for index, item := range items {
			if err := ctx.Err(); err != nil {
				return nil, err
			}
			owner, err := store.Users.Get(root, item.UserID)
			if err != nil {
				return nil, fmt.Errorf("第 %d 项的所有者不可用: %w", index+1, err)
			}
			service := &trash.Service{
				Fs: owner.Fs, Records: store.Trash,
				Favorites: store.Favorites, Tags: store.Tags, Recent: store.Recent,
				DirMode: dirMode,
			}
			if err := service.DeletePermanent(task.UserID, item.ID, args.AllUsers); err != nil {
				return nil, fmt.Errorf("第 %d 项永久删除失败: %w", index+1, err)
			}
			progress.ProcessedItems++
			if err := report(progress); err != nil {
				return nil, err
			}
		}
		return nil, nil
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
