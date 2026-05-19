package fbhttp

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/tags"
	fberrors "github.com/Kkwans/nas-file-browser/backend/errors"
)

type tagCreateRequest struct {
	Name  string `json:"name"`
	Color string `json:"color"`
}

type tagUpdateRequest struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
}

type tagPathRequest struct {
	Path string `json:"path"`
}

var tagsGetHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	t, err := d.store.Tags.GetAll()
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return renderJSON(w, r, t)
})

var tagsPostHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if r.Body == nil {
		return http.StatusBadRequest, fberrors.ErrEmptyRequest
	}

	var req tagCreateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return http.StatusBadRequest, err
	}

	if req.Name == "" {
		return http.StatusBadRequest, fberrors.ErrInvalidRequestParams
	}

	if req.Color == "" {
		req.Color = "#2196F3" // default blue
	}

	tag, err := d.store.Tags.Create(req.Name, req.Color)
	if err != nil {
		return http.StatusInternalServerError, err
	}

	return renderJSON(w, r, tag)
})

var tagPutHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	vars := mux.Vars(r)
	id := vars["id"]

	if r.Body == nil {
		return http.StatusBadRequest, fberrors.ErrEmptyRequest
	}

	var req tagUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return http.StatusBadRequest, err
	}

	tag, err := d.store.Tags.UpdateFields(id, req.Name, req.Color)
	if err != nil {
		if errors.Is(err, tags.ErrNotExist) {
			return http.StatusNotFound, fberrors.ErrNotExist
		}
		return http.StatusInternalServerError, err
	}

	return renderJSON(w, r, tag)
})

var tagDeleteHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	vars := mux.Vars(r)
	id := vars["id"]

	err := d.store.Tags.Delete(id)
	if err != nil {
		if errors.Is(err, tags.ErrNotExist) {
			return http.StatusNotFound, fberrors.ErrNotExist
		}
		return http.StatusInternalServerError, err
	}

	return http.StatusOK, nil
})

var tagAddPathHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	vars := mux.Vars(r)
	id := vars["id"]

	if r.Body == nil {
		return http.StatusBadRequest, fberrors.ErrEmptyRequest
	}

	var req tagPathRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return http.StatusBadRequest, err
	}

	if req.Path == "" {
		return http.StatusBadRequest, fberrors.ErrInvalidRequestParams
	}

	tag, err := d.store.Tags.AddPath(id, req.Path)
	if err != nil {
		if errors.Is(err, tags.ErrNotExist) {
			return http.StatusNotFound, fberrors.ErrNotExist
		}
		return http.StatusInternalServerError, err
	}

	return renderJSON(w, r, tag)
})

var tagRemovePathHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	vars := mux.Vars(r)
	id := vars["id"]

	if r.Body == nil {
		return http.StatusBadRequest, fberrors.ErrEmptyRequest
	}

	var req tagPathRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return http.StatusBadRequest, err
	}

	if req.Path == "" {
		return http.StatusBadRequest, fberrors.ErrInvalidRequestParams
	}

	tag, err := d.store.Tags.RemovePath(id, req.Path)
	if err != nil {
		if errors.Is(err, tags.ErrNotExist) {
			return http.StatusNotFound, fberrors.ErrNotExist
		}
		return http.StatusInternalServerError, err
	}

	return renderJSON(w, r, tag)
})
