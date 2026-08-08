package fbhttp

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/analysis"
	"github.com/Kkwans/nas-file-browser/backend/history"
	"github.com/Kkwans/nas-file-browser/backend/pathmeta"
	"github.com/Kkwans/nas-file-browser/backend/tasks"
)

const maxAnalysisScopes = 32

var analysisWorkerSlot = make(chan struct{}, 1)
var errAnalysisScopeForbidden = errors.New("没有访问分析路径的权限")

type duplicateAnalysisArgs struct {
	Paths []string `json:"paths"`
}

func duplicateAnalysisStartHandler(runtime *tasks.Runtime) handleFunc {
	return withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
		if !d.user.Perm.Download {
			return http.StatusForbidden, fmt.Errorf("没有读取文件内容的权限")
		}
		var request duplicateAnalysisArgs
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64*1024))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&request); err != nil {
			return http.StatusBadRequest, fmt.Errorf("重复文件扫描参数无效: %w", err)
		}
		paths, err := validateAnalysisScopes(d, request.Paths)
		if err != nil {
			if errors.Is(err, errAnalysisScopeForbidden) {
				return http.StatusForbidden, err
			}
			return http.StatusBadRequest, err
		}
		args, err := json.Marshal(duplicateAnalysisArgs{Paths: paths})
		if err != nil {
			return http.StatusInternalServerError, err
		}
		task, err := enqueueTask(runtime, d, d.user, tasks.TypeDuplicateAnalysis, "查找重复文件", args, "")
		if err != nil {
			return taskErrorStatus(err), err
		}
		recordHistory(d, "analysis.duplicates", strings.Join(paths, "、"), task.ID, history.StatusSubmitted)
		return renderJSONStatus(w, task, http.StatusAccepted)
	})
}

var analysisResultHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	task, err := d.store.Tasks.Get(d.user.ID, mux.Vars(r)["id"], d.user.Perm.Admin)
	if err != nil {
		return taskErrorStatus(err), err
	}
	if task.Type != tasks.TypeDuplicateAnalysis {
		return http.StatusNotFound, tasks.ErrNotExist
	}
	if task.Status != tasks.StatusCompleted || len(task.Result) == 0 {
		return http.StatusConflict, fmt.Errorf("分析结果尚未完成")
	}
	var report analysis.DuplicateReport
	if err := json.Unmarshal(task.Result, &report); err != nil {
		return http.StatusInternalServerError, fmt.Errorf("分析结果损坏: %w", err)
	}
	return renderJSON(w, r, &report)
})

func validateAnalysisScopes(d *data, requested []string) ([]string, error) {
	if len(requested) == 0 || len(requested) > maxAnalysisScopes {
		return nil, fmt.Errorf("分析范围必须包含 1–%d 个路径", maxAnalysisScopes)
	}
	unique := make(map[string]struct{}, len(requested))
	paths := make([]string, 0, len(requested))
	for _, requestedPath := range requested {
		if requestedPath == "" {
			return nil, fmt.Errorf("分析路径不能为空")
		}
		cleaned := pathmeta.Clean(requestedPath)
		if !d.Check(cleaned) {
			return nil, fmt.Errorf("%w: %s", errAnalysisScopeForbidden, cleaned)
		}
		if _, err := d.user.Fs.Stat(cleaned); err != nil {
			return nil, fmt.Errorf("无法读取分析路径 %s", cleaned)
		}
		if _, exists := unique[cleaned]; exists {
			continue
		}
		unique[cleaned] = struct{}{}
		paths = append(paths, cleaned)
	}
	sort.Slice(paths, func(i, j int) bool {
		if len(paths[i]) != len(paths[j]) {
			return len(paths[i]) < len(paths[j])
		}
		return paths[i] < paths[j]
	})
	minimal := make([]string, 0, len(paths))
	for _, candidate := range paths {
		covered := false
		for _, root := range minimal {
			if root == "/" || candidate == root || strings.HasPrefix(candidate, root+"/") {
				covered = true
				break
			}
		}
		if !covered {
			minimal = append(minimal, candidate)
		}
	}
	return minimal, nil
}

func duplicateAnalysisRunner(d *data, task *tasks.Task, args duplicateAnalysisArgs) tasks.Runner {
	return func(ctx context.Context, report tasks.Reporter) (json.RawMessage, error) {
		select {
		case analysisWorkerSlot <- struct{}{}:
			defer func() { <-analysisWorkerSlot }()
		case <-ctx.Done():
			return nil, ctx.Err()
		}

		lastReported := -16
		result, err := analysis.FindDuplicates(ctx, d.user.Fs, args.Paths, d, func(progress analysis.ScanProgress) error {
			if progress.ProcessedItems != progress.TotalItems && progress.ProcessedItems-lastReported < 16 {
				return nil
			}
			lastReported = progress.ProcessedItems
			return report(tasks.Progress{
				TotalItems: progress.TotalItems, ProcessedItems: progress.ProcessedItems,
				TotalBytes: progress.TotalBytes, ProcessedBytes: progress.ProcessedBytes,
			})
		})
		if err != nil {
			return nil, err
		}
		encoded, err := json.Marshal(result)
		if err != nil {
			return nil, err
		}
		return encoded, nil
	}
}
