package fbhttp

import (
	"fmt"
	"log"
	"net/http"
	"strconv"

	"github.com/Kkwans/nas-file-browser/backend/history"
)

var historyListHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	limit := history.MaxEntriesPerUser
	if raw := r.URL.Query().Get("limit"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil || parsed <= 0 {
			return http.StatusBadRequest, fmt.Errorf("历史记录数量无效")
		}
		limit = parsed
	}
	entries, err := d.store.History.List(d.user.ID, limit)
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return renderJSON(w, r, entries)
})

// recordHistory is deliberately best-effort: a completed filesystem
// operation must not be reported as failed solely because its activity entry
// could not be persisted.
func recordHistory(d *data, action, target, detail string, status history.Status) {
	if d.store.History == nil || d.user == nil {
		return
	}
	if _, err := d.store.History.Record(d.user.ID, action, target, detail, status); err != nil {
		log.Printf("WARNING: failed to record %s history for user %d: %v", action, d.user.ID, err)
	}
}
