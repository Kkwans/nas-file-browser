package fbhttp

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"testing"

	"github.com/Kkwans/nas-file-browser/backend/history"
	"github.com/Kkwans/nas-file-browser/backend/users"
)

func TestHistoryHTTPIsPrivateEvenForAdmin(t *testing.T) {
	h := newTrashHTTPHarness(t,
		users.User{Username: "admin", Perm: users.Permissions{Admin: true}},
		users.User{Username: "member"},
	)
	admin := trashHTTPUserByName(t, h, "admin")
	member := trashHTTPUserByName(t, h, "member")
	if _, err := h.storage.History.Record(admin.ID, "file.rename", "/admin.txt", "", history.StatusSuccess); err != nil {
		t.Fatal(err)
	}
	if _, err := h.storage.History.Record(member.ID, "file.rename", "/member.txt", "", history.StatusSuccess); err != nil {
		t.Fatal(err)
	}

	response := h.request(t, admin.ID, historyListHandler, http.MethodGet, "/history", nil, nil)
	if response.Code != http.StatusOK {
		t.Fatalf("history status = %d body=%s", response.Code, response.Body.String())
	}
	if strings.Contains(response.Body.String(), "member.txt") || strings.Contains(response.Body.String(), "userId") {
		t.Fatalf("private history leaked: %s", response.Body.String())
	}
	var entries []*history.Entry
	if err := json.Unmarshal(response.Body.Bytes(), &entries); err != nil {
		t.Fatal(err)
	}
	if len(entries) != 1 || entries[0].Target != "/admin.txt" {
		t.Fatalf("admin private history = %#v", entries)
	}

	response = h.request(t, admin.ID, historyListHandler, http.MethodGet, "/history?limit=invalid", nil, nil)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("invalid limit status = %d body=%s", response.Code, response.Body.String())
	}
}

func TestTrashOperationsAreRecordedInHistory(t *testing.T) {
	h := newTrashHTTPHarness(t, users.User{
		Username: "member",
		Perm: users.Permissions{
			Create: true, Delete: true, Modify: true, Rename: true, Download: true,
		},
	})
	member := trashHTTPUserByName(t, h, "member")
	moveTrashFixture(t, h, member, "/history.txt")
	items, err := h.storage.Trash.List(member.ID, false)
	if err != nil {
		t.Fatal(err)
	}
	if len(items) != 1 {
		t.Fatalf("trash items = %#v", items)
	}
	response := h.request(t, member.ID, trashRestoreHandler, http.MethodPost, "/trash/"+items[0].ID+"/restore", bytes.NewBufferString(`{"conflict":"fail"}`), map[string]string{"id": items[0].ID})
	if response.Code != http.StatusOK {
		t.Fatalf("restore status = %d body=%s", response.Code, response.Body.String())
	}

	entries, err := h.storage.History.List(member.ID, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(entries) != 2 || entries[0].Action != "trash.restore" || entries[1].Action != "trash.move" {
		t.Fatalf("trash history = %#v", entries)
	}
	if entries[0].Status != history.StatusSuccess || entries[0].Target != "/history.txt" {
		t.Fatalf("restore history = %#v", entries[0])
	}
}
