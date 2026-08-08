package fbhttp

import (
	"io/fs"
	"net/http"

	"github.com/gorilla/mux"

	"github.com/Kkwans/nas-file-browser/backend/settings"
	"github.com/Kkwans/nas-file-browser/backend/storage"
	"github.com/Kkwans/nas-file-browser/backend/tasks"
)

type modifyRequest struct {
	What            string   `json:"what"`             // Answer to: what data type?
	Which           []string `json:"which"`            // Answer to: which fields?
	CurrentPassword string   `json:"current_password"` // Answer to: user logged password
}

func NewHandler(
	imgSvc ImgService,
	fileCache FileCache,
	uploadCache UploadCache,
	store *storage.Storage,
	server *settings.Server,
	assetsFs fs.FS,
	videoPreviewWorkers int,
) (http.Handler, error) {
	server.Clean()
	taskRuntime, err := tasks.NewRuntime(store.Tasks)
	if err != nil {
		return nil, err
	}

	r := mux.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Security-Policy", `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self';`)
			next.ServeHTTP(w, r)
		})
	})
	index, static := getStaticHandlers(store, server, assetsFs)

	monkey := func(fn handleFunc, prefix string) http.Handler {
		return handle(fn, prefix, store, server)
	}

	r.HandleFunc("/health", healthHandler)
	r.PathPrefix("/static").Handler(static)
	r.NotFoundHandler = index

	api := r.PathPrefix("/api").Subrouter()

	api.Handle("/login", monkey(loginHandler(), ""))
	api.Handle("/signup", monkey(signupHandler, ""))
	api.Handle("/renew", monkey(renewHandler(), ""))

	users := api.PathPrefix("/users").Subrouter()
	users.Handle("", monkey(usersGetHandler, "")).Methods("GET")
	users.Handle("", monkey(userPostHandler, "")).Methods("POST")
	users.Handle("/{id:[0-9]+}", monkey(userPutHandler, "")).Methods("PUT")
	users.Handle("/{id:[0-9]+}", monkey(userGetHandler, "")).Methods("GET")
	users.Handle("/{id:[0-9]+}", monkey(userDeleteHandler, "")).Methods("DELETE")

	api.Handle("/resources/batch", monkey(resourceBatchHandler, "")).Methods("POST")
	api.PathPrefix("/resources/recursive").Handler(monkey(resourceGetRecursiveHandler, "/api/resources/recursive")).Methods("GET")
	api.PathPrefix("/resources").Handler(monkey(resourceGetHandler, "/api/resources")).Methods("GET")
	api.PathPrefix("/resources").Handler(monkey(resourceDeleteHandler(fileCache), "/api/resources")).Methods("DELETE")
	api.PathPrefix("/resources").Handler(monkey(resourcePostHandler(fileCache), "/api/resources")).Methods("POST")
	api.PathPrefix("/resources").Handler(monkey(resourcePutHandler, "/api/resources")).Methods("PUT")
	api.PathPrefix("/resources").Handler(monkey(resourcePatchHandler(fileCache), "/api/resources")).Methods("PATCH")

	api.Handle("/trash", monkey(trashListHandler, "")).Methods("GET")
	api.Handle("/trash", monkey(trashClearHandler(taskRuntime), "")).Methods("DELETE")
	api.Handle("/trash/{id}/restore", monkey(trashRestoreHandler, "")).Methods("POST")
	api.Handle("/trash/{id}", monkey(trashDeleteHandler, "")).Methods("DELETE")

	api.Handle("/tasks", monkey(taskListHandler, "")).Methods("GET")
	api.Handle("/tasks/{id}", monkey(taskGetHandler, "")).Methods("GET")
	api.Handle("/tasks/{id}/cancel", monkey(taskCancelHandler(taskRuntime), "")).Methods("POST")
	api.Handle("/tasks/{id}/retry", monkey(taskRetryHandler(taskRuntime), "")).Methods("POST")
	api.Handle("/history", monkey(historyListHandler, "")).Methods("GET")

	api.PathPrefix("/tus").Handler(monkey(tusPostHandler(uploadCache), "/api/tus")).Methods("POST")
	api.PathPrefix("/tus").Handler(monkey(tusHeadHandler(uploadCache), "/api/tus")).Methods("HEAD", "GET")
	api.PathPrefix("/tus").Handler(monkey(tusPatchHandler(uploadCache), "/api/tus")).Methods("PATCH")
	api.PathPrefix("/tus").Handler(monkey(tusDeleteHandler(uploadCache), "/api/tus")).Methods("DELETE")

	api.PathPrefix("/usage").Handler(monkey(diskUsage, "/api/usage")).Methods("GET")

	api.Handle("/shares", monkey(shareListHandler, "")).Methods("GET")
	api.PathPrefix("/share").Handler(monkey(shareGetsHandler, "/api/share")).Methods("GET")
	api.PathPrefix("/share").Handler(monkey(sharePostHandler, "/api/share")).Methods("POST")
	api.PathPrefix("/share").Handler(monkey(shareDeleteHandler, "/api/share")).Methods("DELETE")

	api.Handle("/settings", monkey(settingsGetHandler, "")).Methods("GET")
	api.Handle("/settings", monkey(settingsPutHandler, "")).Methods("PUT")

	api.PathPrefix("/raw").Handler(monkey(rawHandler, "/api/raw")).Methods("GET")
	api.PathPrefix("/preview/{size}/{path:.*}").
		Handler(monkey(previewHandler(imgSvc, fileCache, server.EnableThumbnails, server.ResizePreview, videoPreviewWorkers), "/api/preview")).Methods("GET")
	api.PathPrefix("/command").Handler(monkey(commandsHandler, "/api/command")).Methods("GET")
	api.PathPrefix("/search").Handler(monkey(searchHandler, "/api/search")).Methods("GET")
	api.PathPrefix("/subtitle").Handler(monkey(subtitleHandler, "/api/subtitle")).Methods("GET")

	api.Handle("/favorites", monkey(favoritesGetHandler, "")).Methods("GET")
	api.Handle("/favorites", monkey(favoritesPostHandler, "")).Methods("POST")
	api.Handle("/favorites/reorder", monkey(favoritesReorderHandler, "")).Methods("PUT")
	api.Handle("/favorites/{id}", monkey(favoritePutHandler, "")).Methods("PUT")
	api.Handle("/favorites/{id}", monkey(favoriteDeleteHandler, "")).Methods("DELETE")

	api.Handle("/favorites/groups", monkey(favoriteGroupsGetHandler, "")).Methods("GET")
	api.Handle("/favorites/groups", monkey(favoriteGroupsPostHandler, "")).Methods("POST")
	api.Handle("/favorites/groups/reorder", monkey(favoriteGroupsReorderHandler, "")).Methods("PUT")
	api.Handle("/favorites/groups/{id}", monkey(favoriteGroupPutHandler, "")).Methods("PUT")
	api.Handle("/favorites/groups/{id}", monkey(favoriteGroupDeleteHandler, "")).Methods("DELETE")

	api.Handle("/tags", monkey(tagsGetHandler, "")).Methods("GET")
	api.Handle("/tags", monkey(tagsPostHandler, "")).Methods("POST")
	api.Handle("/tags/{id}", monkey(tagPutHandler, "")).Methods("PUT")
	api.Handle("/tags/{id}", monkey(tagDeleteHandler, "")).Methods("DELETE")
	api.Handle("/tags/{id}/paths", monkey(tagAddPathHandler, "")).Methods("POST")
	api.Handle("/tags/{id}/paths", monkey(tagRemovePathHandler, "")).Methods("DELETE")

	api.Handle("/volumes", monkey(volumesHandler, "")).Methods("GET")
	api.Handle("/categories", monkey(categoriesHandler, "")).Methods("GET")
	api.Handle("/classify", monkey(classifyHandler, "")).Methods("GET")

	public := api.PathPrefix("/public").Subrouter()
	public.PathPrefix("/dl").Handler(monkey(publicDlHandler, "/api/public/dl/")).Methods("GET")
	public.PathPrefix("/share").Handler(monkey(publicShareHandler, "/api/public/share/")).Methods("GET")

	return stripPrefix(server.BaseURL, r), nil
}
