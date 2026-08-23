package fbhttp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/files"
	"github.com/Kkwans/nas-file-browser/backend/history"
	"github.com/Kkwans/nas-file-browser/backend/hls"
	"github.com/Kkwans/nas-file-browser/backend/pathmeta"
	"github.com/Kkwans/nas-file-browser/backend/tasks"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

type mediaHLSStartRequest struct {
	Path   string `json:"path"`
	Format string `json:"format,omitempty"`
}

type mediaHLSTaskArgs struct {
	Path     string `json:"path"`
	CacheID  string `json:"cacheId"`
	Identity string `json:"identity"`
	Format   string `json:"format,omitempty"`
}

type mediaHLSResponse struct {
	ID           string    `json:"id"`
	TaskID       string    `json:"taskId,omitempty"`
	Path         string    `json:"path"`
	Identity     string    `json:"identity"`
	Profile      string    `json:"profile"`
	State        hls.State `json:"state"`
	Error        string    `json:"error,omitempty"`
	UpdatedAt    int64     `json:"updatedAt"`
	LastAccessAt int64     `json:"lastAccessAt,omitempty"`
	SizeBytes    int64     `json:"sizeBytes,omitempty"`
	Format       string    `json:"format"`
	PlaylistURL  string    `json:"playlistUrl,omitempty"`
	SourceURL    string    `json:"sourceUrl,omitempty"`
}

func mediaHLSStartHandler(service *hls.Service, runtime *tasks.Runtime) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		var request mediaHLSStartRequest
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&request); err != nil {
			return http.StatusBadRequest, fmt.Errorf("兼容播放参数无效: %w", err)
		}
		input, status, err := mediaHLSInputWithContext(r.Context(), d, d.user, request.Path, request.Format != "webm")
		if err != nil {
			return status, err
		}
		var task *tasks.Task
		reserve := service.Reserve
		if request.Format == "webm" {
			reserve = service.ReserveWebM
		} else if request.Format != "" && request.Format != "hls" {
			return http.StatusBadRequest, fmt.Errorf("不支持的兼容播放格式")
		} else if mediaHLSFormatForInput(input) == "copy" {
			reserve = service.ReserveCopy
		}
		cached, created, err := reserve(input, func(job hls.Job) (string, error) {
			task, err = enqueueMediaHLSTask(runtime, d, d.user, service, job, "")
			if err != nil {
				return "", err
			}
			return task.ID, nil
		})
		if err != nil {
			return taskErrorStatus(err), err
		}
		if created && task != nil {
			recordHistory(d, "media.hls", input.Path, task.ID, history.StatusSubmitted)
			return renderJSONStatus(w, mediaHLSStatusResponse(d.server.BaseURL, cached), http.StatusAccepted)
		}
		return renderJSON(w, r, mediaHLSStatusResponse(d.server.BaseURL, cached))
	})
}

func mediaHLSGetHandler(service *hls.Service) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		status, err := service.Get(mux.Vars(r)["id"], d.user.ID)
		if err != nil {
			return mediaHLSErrorStatus(err), err
		}
		return renderJSON(w, r, mediaHLSStatusResponse(d.server.BaseURL, status))
	})
}

func mediaHLSCancelHandler(service *hls.Service, runtime *tasks.Runtime) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		status, err := service.Get(mux.Vars(r)["id"], d.user.ID)
		if err != nil {
			return mediaHLSErrorStatus(err), err
		}
		if status.TaskID == "" || (status.State != hls.StateQueued && status.State != hls.StatePreparing && status.State != hls.StateStreamable) {
			return http.StatusConflict, hls.ErrState
		}
		if _, err := runtime.Cancel(d.user.ID, status.TaskID, false); err != nil {
			return taskErrorStatus(err), err
		}
		recordHistory(d, "task.cancel", "兼容播放 "+path.Base(status.Path), status.TaskID, history.StatusSuccess)
		latest, _ := service.Get(status.ID, d.user.ID)
		return renderJSONStatus(w, mediaHLSStatusResponse(d.server.BaseURL, latest), http.StatusAccepted)
	})
}

func mediaHLSAssetHandler(service *hls.Service) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		name := mux.Vars(r)["asset"]
		filename, state, err := service.Asset(mux.Vars(r)["id"], d.user.ID, name)
		if err != nil {
			return mediaHLSErrorStatus(err), err
		}
		file, err := os.Open(filename)
		if err != nil {
			return errToStatus(err), err
		}
		defer func() { _ = file.Close() }()
		info, err := file.Stat()
		if err != nil {
			return http.StatusInternalServerError, err
		}
		w.Header().Set("X-HLS-State", string(state))
		if strings.HasSuffix(name, ".m3u8") {
			w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
			w.Header().Set("Cache-Control", "private, no-cache")
		} else if strings.HasSuffix(name, ".webm") {
			w.Header().Set("Content-Type", "video/webm")
			w.Header().Set("Cache-Control", "private, no-cache")
		} else {
			w.Header().Set("Content-Type", "video/mp2t")
			w.Header().Set("Cache-Control", "private, max-age=31536000, immutable")
		}
		http.ServeContent(w, r, name, info.ModTime(), file)
		return 0, nil
	})
}

func mediaHLSInput(d *data, owner *users.User, value string) (hls.Input, int, error) {
	return mediaHLSInputWithContext(context.Background(), d, owner, value, true)
}

func mediaHLSInputWithContext(ctx context.Context, d *data, owner *users.User, value string, probeCodecs bool) (hls.Input, int, error) {
	if owner == nil || !owner.Perm.Download {
		return hls.Input{}, http.StatusForbidden, fmt.Errorf("没有兼容播放该视频的权限")
	}
	if value == "" {
		return hls.Input{}, http.StatusBadRequest, fmt.Errorf("视频路径不能为空")
	}
	value = pathmeta.Clean(value)
	ownerData := *d
	ownerData.user = owner
	file, err := files.NewFileInfo(&files.FileOptions{
		Fs: owner.Fs, Path: value, Modify: owner.Perm.Modify,
		Expand: true, SkipSubtitles: true,
		ReadHeader: d.server.TypeDetectionByHeader, Checker: &ownerData,
	})
	if err != nil {
		return hls.Input{}, errToStatus(err), err
	}
	if file.IsDir || file.Type != "video" {
		return hls.Input{}, http.StatusBadRequest, fmt.Errorf("兼容播放仅适用于视频文件")
	}
	identity := "v1:" + strconv.FormatInt(file.Size, 10) + ":" + strconv.FormatInt(file.ModTime.UnixNano(), 10)
	input := hls.Input{
		UserID: owner.ID, Path: file.Path, Identity: identity, SourcePath: file.RealPath(),
	}
	// Compatibility playback is already an explicit user action. A short,
	// best-effort probe lets H.264/AAC MKV and MOV files take the remux-only
	// path; probe failures fall back to the existing transcode profile.
	if probeCodecs {
		probeCtx, cancel := context.WithTimeout(ctx, 2*time.Second)
		probe, probeErr := defaultMediaProbe(probeCtx, input.SourcePath, false)
		cancel()
		if probeErr == nil {
			input.VideoCodec = probe.VideoCodec
			input.AudioCodec = probe.AudioCodec
		}
	}
	return input, 0, nil
}

func mediaHLSFormatForInput(input hls.Input) string {
	if hls.CanCopyMedia(input.VideoCodec, input.AudioCodec) {
		return "copy"
	}
	return "hls"
}

func enqueueMediaHLSTask(runtime *tasks.Runtime, d *data, owner *users.User, service *hls.Service, job hls.Job, retryOf string) (*tasks.Task, error) {
	format := "hls"
	if hls.IsWebMProfile(job.Profile) {
		format = "webm"
	} else if hls.IsCopyProfile(job.Profile) {
		format = "copy"
	}
	args, err := json.Marshal(mediaHLSTaskArgs{Path: job.Path, CacheID: job.ID, Identity: job.Identity, Format: format})
	if err != nil {
		return nil, err
	}
	task, err := d.store.Tasks.New(owner.ID, owner.Username, tasks.TypeMediaHLS, "兼容播放 "+path.Base(job.Path), args, retryOf)
	if err != nil {
		return nil, err
	}
	runner := func(ctx context.Context, _ tasks.Reporter) (json.RawMessage, error) {
		if err := service.Run(ctx, job); err != nil {
			return nil, err
		}
		return json.Marshal(struct {
			CacheID string `json:"cacheId"`
		}{CacheID: job.ID})
	}
	if err := runtime.StartExclusive(task, runner, "media.hls:"+job.ID); err != nil {
		task.Status = tasks.StatusFailed
		task.FinishedAt = time.Now().UnixMilli()
		task.Error = err.Error()
		_ = d.store.Tasks.Update(task)
		return nil, err
	}
	return task, nil
}

func mediaHLSStatusResponse(baseURL string, status hls.Status) mediaHLSResponse {
	response := mediaHLSResponse{
		ID: status.ID, TaskID: status.TaskID, Path: status.Path,
		Identity: status.Identity, Profile: status.Profile, State: status.State,
		Error: status.Error, UpdatedAt: status.UpdatedAt,
		LastAccessAt: status.LastAccessAt, SizeBytes: status.SizeBytes,
		Format: "hls",
	}
	if hls.IsWebMProfile(status.Profile) {
		response.Format = "webm"
	} else if hls.IsCopyProfile(status.Profile) {
		response.Format = "copy"
	}
	if status.State == hls.StateStreamable || status.State == hls.StateCompleted {
		base := strings.TrimSuffix(baseURL, "/") + "/api/media/hls/" + status.ID + "/"
		if response.Format == "webm" {
			response.SourceURL = base + "index.webm"
		} else {
			response.PlaylistURL = base + "index.m3u8"
		}
	}
	return response
}

func mediaHLSErrorStatus(err error) int {
	switch {
	case errors.Is(err, hls.ErrNotFound):
		return http.StatusNotFound
	case errors.Is(err, hls.ErrForbidden):
		return http.StatusForbidden
	case errors.Is(err, hls.ErrState):
		return http.StatusConflict
	default:
		return http.StatusInternalServerError
	}
}
