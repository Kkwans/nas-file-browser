package fbhttp

import (
	"io"
	"net/http"
	"path"
	"strings"

	"github.com/Kkwans/nas-file-browser/backend/events"
	"github.com/Kkwans/nas-file-browser/backend/transfers"
)

const uploadProgressFlushBytes int64 = 1 << 20

// uploadTracker records resource-POST uploads without buffering the request
// body. TUS has its own offset source; this reader covers the fallback
// XMLHttpRequest upload path used when TUS is unavailable.
type uploadTracker struct {
	request  *http.Request
	data     *data
	item     *transfers.Item
	bytes    int64
	flushed  int64
	finished bool
}

func newUploadTracker(r *http.Request, d *data) *uploadTracker {
	if d == nil || d.store == nil || d.store.Transfers == nil {
		return nil
	}
	id := strings.TrimSpace(r.Header.Get("X-Transfer-ID"))
	if id == "" {
		return nil
	}
	total := r.ContentLength
	if total < 0 {
		total = 0
	}
	name := path.Base(strings.TrimSuffix(r.URL.Path, "/"))
	item, err := d.store.Transfers.Ensure(d.user.ID, id, transfers.KindUpload, name, r.URL.Path, total)
	if err != nil {
		return nil
	}
	return &uploadTracker{request: r, data: d, item: item}
}

func (tracker *uploadTracker) Reader(reader io.Reader) io.Reader {
	if tracker == nil || reader == nil {
		return reader
	}
	return &trackedUploadReader{Reader: reader, tracker: tracker}
}

func (tracker *uploadTracker) progress(bytes int64) {
	if tracker == nil || tracker.item == nil || bytes <= 0 {
		return
	}
	tracker.bytes += bytes
	if tracker.bytes-tracker.flushed < uploadProgressFlushBytes {
		return
	}
	tracker.flush()
}

func (tracker *uploadTracker) flush() {
	if tracker == nil || tracker.item == nil || tracker.bytes <= tracker.flushed {
		return
	}
	if _, err := tracker.data.store.Transfers.Progress(tracker.item.ID, tracker.data.user.ID, tracker.bytes); err == nil {
		tracker.flushed = tracker.bytes
		if latest, getErr := tracker.data.store.Transfers.Get(tracker.data.user.ID, tracker.item.ID, false); getErr == nil {
			events.Default.PublishForUser(latest.UserID, "transfer.changed", latest)
		}
	}
}

func (tracker *uploadTracker) finish(status int, responseErr error) {
	if tracker == nil || tracker.finished {
		return
	}
	tracker.finished = true
	tracker.flush()
	if tracker.item == nil {
		return
	}
	final := transfers.StatusCompleted
	message := ""
	if tracker.request != nil && tracker.request.Context().Err() != nil {
		final = transfers.StatusInterrupted
		message = tracker.request.Context().Err().Error()
	} else if responseErr != nil || status >= http.StatusBadRequest {
		final = transfers.StatusFailed
		if responseErr != nil {
			message = responseErr.Error()
		} else {
			message = http.StatusText(status)
		}
	}
	updated, err := tracker.data.store.Transfers.SetStatus(tracker.item.ID, tracker.data.user.ID, final, message)
	if err == nil {
		events.Default.PublishForUser(updated.UserID, "transfer.changed", updated)
	}
}

type trackedUploadReader struct {
	io.Reader
	tracker *uploadTracker
}

func (reader *trackedUploadReader) Read(payload []byte) (int, error) {
	count, err := reader.Reader.Read(payload)
	if count > 0 {
		reader.tracker.progress(int64(count))
	}
	return count, err
}
