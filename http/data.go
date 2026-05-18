package fbhttp

import (
	"log"
	"net/http"
	"strconv"

	"github.com/tomasen/realip"

	"github.com/filebrowser/filebrowser/v2/rules"
	"github.com/filebrowser/filebrowser/v2/runner"
	"github.com/filebrowser/filebrowser/v2/settings"
	"github.com/filebrowser/filebrowser/v2/storage"
	"github.com/filebrowser/filebrowser/v2/users"
)

type handleFunc func(w http.ResponseWriter, r *http.Request, d *data) (int, error)

type data struct {
	*runner.Runner
	settings *settings.Settings
	server   *settings.Server
	store    *storage.Storage
	user     *users.User
	raw      interface{}
}

// Check implements rules.Checker.
func (d *data) Check(path string) bool {
	if d.user.HideDotfiles && rules.MatchHidden(path) {
		return false
	}

	allow := true
	for _, rule := range d.settings.Rules {
		if rule.Matches(path) {
			allow = rule.Allow
		}
	}

	for _, rule := range d.user.Rules {
		if rule.Matches(path) {
			allow = rule.Allow
		}
	}

	return allow
}



// getStatusTextCN 返回 HTTP 状态码的中文文本
func getStatusTextCN(status int) string {
    switch status {
    case 400:
        return "请求参数错误"
    case 401:
        return "未授权，请重新登录"
    case 403:
        return "没有权限执行此操作"
    case 404:
        return "请求的资源不存在"
    case 405:
        return "请求方法不允许"
    case 408:
        return "请求超时"
    case 409:
        return "资源冲突"
    case 413:
        return "请求体过大"
    case 415:
        return "不支持的媒体类型"
    case 422:
        return "请求参数无效"
    case 429:
        return "请求过于频繁，请稍后再试"
    case 500:
        return "服务器内部错误"
    case 502:
        return "网关错误"
    case 503:
        return "服务不可用"
    case 504:
        return "网关超时"
    default:
        return http.StatusText(status)
    }
}

func handle(fn handleFunc, prefix string, store *storage.Storage, server *settings.Server) http.Handler {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		for k, v := range globalHeaders {
			w.Header().Set(k, v)
		}

		settings, err := store.Settings.Get()
		if err != nil {
			log.Fatalf("ERROR: couldn't get settings: %v\n", err)
			return
		}

		status, err := fn(w, r, &data{
			Runner:   &runner.Runner{Enabled: server.EnableExec, Settings: settings},
			store:    store,
			settings: settings,
			server:   server,
		})

		if status >= 400 || err != nil {
			clientIP := realip.FromRequest(r)
			log.Printf("%s: %v %s %v", r.URL.Path, status, clientIP, err)
		}

		if status != 0 {
			txt := getStatusTextCN(status)
			if status >= 400 && err != nil {
				// 优先返回中文错误信息，不带 HTTP 状态文本前缀
				txt = err.Error()
			}
			http.Error(w, strconv.Itoa(status)+" "+txt, status)
			return
		}
	})

	return stripPrefix(prefix, handler)
}
