package fbhttp

import (
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/spf13/afero"

	"github.com/Kkwans/nas-file-browser/backend/tasks"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

func TestFileTransferTaskCopiesAndMovesWithoutLosingSource(t *testing.T) {
	h := newTrashHTTPHarness(t, users.User{
		Username: "owner",
		Perm:     users.Permissions{Create: true, Modify: true, Rename: true, Download: true},
	})
	owner := firstTrashHTTPUser(h)
	filesystem := h.fs[owner.ID]
	if err := afero.WriteFile(filesystem, "/source.txt", []byte("payload"), 0o640); err != nil {
		t.Fatal(err)
	}
	if err := filesystem.MkdirAll("/target", 0o750); err != nil {
		t.Fatal(err)
	}
	runtime, err := tasks.NewRuntime(h.storage.Tasks)
	if err != nil {
		t.Fatal(err)
	}

	response := h.request(t, owner.ID, fileTransferTaskHandler(runtime), http.MethodPost, "/resources/transfer", strings.NewReader(`{"action":"copy","items":[{"from":"/source.txt","to":"/target/copied.txt"}]}`), nil)
	if response.Code != http.StatusAccepted {
		t.Fatalf("copy status = %d body=%s", response.Code, response.Body.String())
	}
	var copyTask tasks.Task
	if err := json.Unmarshal(response.Body.Bytes(), &copyTask); err != nil {
		t.Fatal(err)
	}
	copyDone := waitForHTTPTask(t, h, copyTask.ID, tasks.StatusCompleted)
	if copyDone.ProcessedItems != 1 {
		t.Fatalf("copy progress = %#v", copyDone)
	}
	if content, err := afero.ReadFile(filesystem, "/target/copied.txt"); err != nil || string(content) != "payload" {
		t.Fatalf("copied content = %q err=%v", content, err)
	}
	if exists, _ := afero.Exists(filesystem, "/source.txt"); !exists {
		t.Fatal("copy removed the source")
	}

	response = h.request(t, owner.ID, fileTransferTaskHandler(runtime), http.MethodPost, "/resources/transfer", strings.NewReader(`{"action":"move","items":[{"from":"/source.txt","to":"/target/moved.txt"}]}`), nil)
	if response.Code != http.StatusAccepted {
		t.Fatalf("move status = %d body=%s", response.Code, response.Body.String())
	}
	var moveTask tasks.Task
	if err := json.Unmarshal(response.Body.Bytes(), &moveTask); err != nil {
		t.Fatal(err)
	}
	waitForHTTPTask(t, h, moveTask.ID, tasks.StatusCompleted)
	if exists, _ := afero.Exists(filesystem, "/source.txt"); exists {
		t.Fatal("move left the source")
	}
	if content, err := afero.ReadFile(filesystem, "/target/moved.txt"); err != nil || string(content) != "payload" {
		t.Fatalf("moved content = %q err=%v", content, err)
	}
}

func TestNormalizeTransferPathDecodesFilesRouteOnce(t *testing.T) {
	path, err := normalizeTransferPath("/files/a%20b.txt")
	if err != nil || path != "/a b.txt" {
		t.Fatalf("normalized path = %q err=%v", path, err)
	}
}
