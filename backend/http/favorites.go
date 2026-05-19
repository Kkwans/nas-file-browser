package fbhttp

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/favorites"
	fberrors "github.com/Kkwans/nas-file-browser/backend/errors"
)

type favoriteRequest struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

type favoriteUpdateRequest struct {
	Name  *string `json:"name,omitempty"`
	Order *int    `json:"order,omitempty"`
}

type reorderRequest struct {
	IDs []string `json:"ids"`
}

var favoritesGetHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	favs, err := d.store.Favorites.GetAll()
	if err != nil {
		return http.StatusInternalServerError, err
	}
	return renderJSON(w, r, favs)
})

var favoritesPostHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if r.Body == nil {
		return http.StatusBadRequest, fberrors.ErrEmptyRequest
	}

	var req favoriteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return http.StatusBadRequest, err
	}

	if req.Path == "" {
		return http.StatusBadRequest, fberrors.ErrInvalidRequestParams
	}

	// Get current count for ordering
	all, err := d.store.Favorites.GetAll()
	if err != nil {
		return http.StatusInternalServerError, err
	}

	fav, err := d.store.Favorites.Add(req.Path, req.Name, len(all))
	if err != nil {
		if errors.Is(err, favorites.ErrExist) {
			return http.StatusConflict, fberrors.ErrExist
		}
		return http.StatusInternalServerError, err
	}

	return renderJSON(w, r, fav)
})

var favoritePutHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	vars := mux.Vars(r)
	id := vars["id"]

	if r.Body == nil {
		return http.StatusBadRequest, fberrors.ErrEmptyRequest
	}

	var req favoriteUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return http.StatusBadRequest, err
	}

	fav, err := d.store.Favorites.UpdateFields(id, req.Name, req.Order)
	if err != nil {
		if errors.Is(err, favorites.ErrNotExist) {
			return http.StatusNotFound, fberrors.ErrNotExist
		}
		return http.StatusInternalServerError, err
	}

	return renderJSON(w, r, fav)
})

var favoriteDeleteHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	vars := mux.Vars(r)
	id := vars["id"]

	err := d.store.Favorites.Delete(id)
	if err != nil {
		if errors.Is(err, favorites.ErrNotExist) {
			return http.StatusNotFound, fberrors.ErrNotExist
		}
		return http.StatusInternalServerError, err
	}

	return http.StatusOK, nil
})

var favoritesReorderHandler = withUser(func(w http.ResponseWriter, r *http.Request, d *data) (int, error) {
	if r.Body == nil {
		return http.StatusBadRequest, fberrors.ErrEmptyRequest
	}

	var req reorderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		return http.StatusBadRequest, err
	}

	if err := d.store.Favorites.Reorder(req.IDs); err != nil {
		return http.StatusInternalServerError, err
	}

	return http.StatusOK, nil
})
