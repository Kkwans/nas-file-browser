package fbhttp

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/spf13/afero"

	"github.com/Kkwans/nas-file-browser/backend/tasks"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

func TestTaskHTTPVisibilityAndCancellation(t *testing.T) {
	h := newTrashHTTPHarness(t,
		users.User{Username: "admin", Perm: users.Permissions{Admin: true, Delete: true}},
		users.User{Username: "member", Perm: users.Permissions{Delete: true}},
	)
	admin := trashHTTPUserByName(t, h, "admin")
	member := trashHTTPUserByName(t, h, "member")
	runtime, err := tasks.NewRuntime(h.storage.Tasks)
	if err != nil {
		t.Fatal(err)
	}
	memberTask, err := h.storage.Tasks.New(member.ID, member.Username, tasks.TypeTrashClear, "member task", json.RawMessage(`{"allUsers":false}`), "")
	if err != nil {
		t.Fatal(err)
	}
	adminTask, err := h.storage.Tasks.New(admin.ID, admin.Username, tasks.TypeTrashClear, "admin task", json.RawMessage(`{"allUsers":true}`), "")
	if err != nil {
		t.Fatal(err)
	}

	response := h.request(t, member.ID, taskListHandler, http.MethodGet, "/tasks", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("member list status = %d body=%s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), "allUsers") {
		t.Fatalf("task replay args leaked: %s", response.Body.String())
	}
	var visible []*tasks.Task
	if err := json.Unmarshal(response.Body.Bytes(), &visible); err != nil {
		t.Fatal(err)
	}
	if len(visible) != 1 || visible[0].ID != memberTask.ID {
		t.Fatalf("member tasks = %#v", visible)
	}

	response = h.request(t, member.ID, taskGetHandler, http.MethodGet, "/tasks/"+adminTask.ID, nil, map[string]string{"id": adminTask.ID})
	if response.Code != http.StatusForbidden {
		t.Fatalf("cross-user task status = %d body=%s", response.Code, response.Body.String())
	}
	response = h.request(t, member.ID, taskCancelHandler(runtime), http.MethodPost, "/tasks/"+adminTask.ID+"/cancel", nil, map[string]string{"id": adminTask.ID})
	if response.Code != http.StatusForbidden {
		t.Fatalf("cross-user cancel status = %d body=%s", response.Code, response.Body.String())
	}

	response = h.request(t, admin.ID, taskListHandler, http.MethodGet, "/tasks", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("admin list status = %d body=%s", response.Code, response.Body.String())
	}
	if err := json.Unmarshal(response.Body.Bytes(), &visible); err != nil {
		t.Fatal(err)
	}
	if len(visible) != 2 {
		t.Fatalf("admin tasks = %#v", visible)
	}
	response = h.request(t, admin.ID, taskCancelHandler(runtime), http.MethodPost, "/tasks/"+memberTask.ID+"/cancel", nil, map[string]string{"id": memberTask.ID})
	if response.Code != http.StatusAccepted {
		t.Fatalf("admin cancel status = %d body=%s", response.Code, response.Body.String())
	}
	canceled, err := h.storage.Tasks.Get(admin.ID, memberTask.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if canceled.Status != tasks.StatusCanceled {
		t.Fatalf("canceled task = %#v", canceled)
	}
}

func TestTrashClearRunsAsTrackedTaskAndScopesNormalUser(t *testing.T) {
	h := newTrashHTTPHarness(t,
		users.User{Username: "first", Perm: users.Permissions{Delete: true, Modify: true, Download: true}},
		users.User{Username: "second", Perm: users.Permissions{Delete: true, Modify: true, Download: true}},
	)
	first := trashHTTPUserByName(t, h, "first")
	second := trashHTTPUserByName(t, h, "second")
	moveTrashFixture(t, h, first, "/first.txt")
	moveTrashFixture(t, h, second, "/second.txt")
	runtime, err := tasks.NewRuntime(h.storage.Tasks)
	if err != nil {
		t.Fatal(err)
	}

	response := h.request(t, first.ID, trashClearHandler(runtime), http.MethodDelete, "/trash", nil, nil)
	if response.Code != http.StatusAccepted {
		t.Fatalf("clear status = %d body=%s", response.Code, response.Body.String())
	}
	if contentType := response.Header().Get("Content-Type"); !strings.Contains(contentType, "application/json") {
		t.Fatalf("clear content type = %q", contentType)
	}
	var created tasks.Task
	if err := json.Unmarshal(response.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	completed := waitForHTTPTask(t, h, created.ID, tasks.StatusCompleted)
	if completed.TotalItems != 1 || completed.ProcessedItems != 1 {
		t.Fatalf("clear progress = %#v", completed)
	}
	firstItems, err := h.storage.Trash.List(first.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	secondItems, err := h.storage.Trash.List(second.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(firstItems) != 0 || len(secondItems) != 1 {
		t.Fatalf("scoped clear left first=%d second=%d", len(firstItems), len(secondItems))
	}
}

func TestInterruptedTrashClearRequiresExplicitRetry(t *testing.T) {
	h := newTrashHTTPHarness(t, users.User{
		Username: "member", Perm: users.Permissions{Delete: true, Modify: true, Download: true},
	})
	member := trashHTTPUserByName(t, h, "member")
	moveTrashFixture(t, h, member, "/retry.txt")
	original, err := h.storage.Tasks.New(member.ID, member.Username, tasks.TypeTrashClear, "清空回收站", json.RawMessage(`{"allUsers":false}`), "")
	if err != nil {
		t.Fatal(err)
	}
	runtime, err := tasks.NewRuntime(h.storage.Tasks)
	if err != nil {
		t.Fatal(err)
	}
	interrupted, err := h.storage.Tasks.Get(member.ID, original.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if interrupted.Status != tasks.StatusInterrupted {
		t.Fatalf("startup task = %#v", interrupted)
	}

	response := h.request(t, member.ID, taskRetryHandler(runtime), http.MethodPost, "/tasks/"+original.ID+"/retry", nil, map[string]string{"id": original.ID})
	if response.Code != http.StatusAccepted {
		t.Fatalf("retry status = %d body=%s", response.Code, response.Body.String())
	}
	var retry tasks.Task
	if err := json.Unmarshal(response.Body.Bytes(), &retry); err != nil {
		t.Fatal(err)
	}
	if retry.RetryOf != original.ID || retry.ID == original.ID {
		t.Fatalf("retry relation = %#v", retry)
	}
	waitForHTTPTask(t, h, retry.ID, tasks.StatusCompleted)
	remaining, err := h.storage.Trash.List(member.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(remaining) != 0 {
		t.Fatalf("retry did not clear trash: %#v", remaining)
	}
}

func TestAdminTrashClearProcessesEveryOwnersFilesystem(t *testing.T) {
	h := newTrashHTTPHarness(t,
		users.User{Username: "admin", Perm: users.Permissions{Admin: true, Delete: true}},
		users.User{Username: "member", Perm: users.Permissions{Delete: true, Modify: true, Download: true}},
	)
	admin := trashHTTPUserByName(t, h, "admin")
	member := trashHTTPUserByName(t, h, "member")
	moveTrashFixture(t, h, member, "/member-owned.txt")
	runtime, err := tasks.NewRuntime(h.storage.Tasks)
	if err != nil {
		t.Fatal(err)
	}

	response := h.request(t, admin.ID, trashClearHandler(runtime), http.MethodDelete, "/trash", nil, nil)
	if response.Code != http.StatusAccepted {
		t.Fatalf("admin clear status = %d body=%s", response.Code, response.Body.String())
	}
	var created tasks.Task
	if err := json.Unmarshal(response.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	waitForHTTPTask(t, h, created.ID, tasks.StatusCompleted)
	remaining, err := h.storage.Trash.List(admin.ID, true)
	if err != nil {
		t.Fatal(err)
	}
	if len(remaining) != 0 {
		t.Fatalf("admin clear left items: %#v", remaining)
	}
	if exists, _ := afero.Exists(h.fs[member.ID], "/.nas-file-browser-trash"); !exists {
		// The per-volume root is intentionally retained for future moves; only
		// the tracked item directory must be gone.
		t.Fatal("admin clear removed the recycle-bin root")
	}
}

func moveTrashFixture(t *testing.T, h *trashHTTPHarness, owner *users.User, path string) {
	t.Helper()
	if err := afero.WriteFile(h.fs[owner.ID], path, []byte("fixture"), 0o640); err != nil {
		t.Fatal(err)
	}
	response := h.request(t, owner.ID, resourceDeleteHandler(noopTrashFileCache{}), http.MethodDelete, path+"?mode=trash", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("move fixture status = %d body=%s", response.Code, response.Body.String())
	}
}

func waitForHTTPTask(t *testing.T, h *trashHTTPHarness, id string, status tasks.Status) *tasks.Task {
	t.Helper()
	deadline := time.Now().Add(3 * time.Second)
	for time.Now().Before(deadline) {
		task, err := h.storage.Tasks.Get(0, id, true)
		if err != nil {
			t.Fatal(err)
		}
		if task.Status == status {
			return task
		}
		time.Sleep(time.Millisecond)
	}
	task, _ := h.storage.Tasks.Get(0, id, true)
	t.Fatalf("task did not reach %q: %#v", status, task)
	return nil
}

func trashHTTPUserByName(t *testing.T, h *trashHTTPHarness, username string) *users.User {
	t.Helper()
	for _, user := range h.users {
		if user.Username == username {
			return user
		}
	}
	t.Fatalf("user %q not found", username)
	return nil
}
