package search

import (
	"context"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/spf13/afero"

	"github.com/Kkwans/nas-file-browser/backend/rules"
)

type searchOptions struct {
	CaseSensitive bool
	Conditions    []condition
	Terms         []string
}

// Search searches for a query in a fs.
func Search(ctx context.Context,
	fs afero.Fs, scope, query string, checker rules.Checker, found func(path string, f os.FileInfo) error) error {
	search := parseSearch(query)

	scope = filepath.ToSlash(filepath.Clean(scope))
	scope = path.Join("/", scope)

	return afero.Walk(fs, scope, func(fPath string, f os.FileInfo, _ error) error {
		if ctx.Err() != nil {
			return context.Cause(ctx)
		}
		fPath = filepath.ToSlash(filepath.Clean(fPath))
		fPath = path.Join("/", fPath)
		relativePath := strings.TrimPrefix(fPath, scope)
		relativePath = strings.TrimPrefix(relativePath, "/")

		if fPath == scope {
			return nil
		}

		// Optimization: match filename first (cheap string ops) before
			// expensive permission checking. This avoids running the checker
			// on files that don't match the search terms.
		if len(search.Terms) > 0 {
			_, fileName := path.Split(fPath)
			matched := false
			for _, term := range search.Terms {
				checkName := fileName
				checkTerm := term
				if !search.CaseSensitive {
					checkName = strings.ToLower(checkName)
					checkTerm = strings.ToLower(checkTerm)
				}
				if strings.Contains(checkName, checkTerm) {
					matched = true
					break
				}
			}
			if !matched {
				return nil
			}
		}

		if !checker.Check(fPath) {
			return nil
		}

		if len(search.Conditions) > 0 {
			match := false

			for _, t := range search.Conditions {
				if t(fPath) {
					match = true
					break
				}
			}

			if !match {
				return nil
			}
		}

		return found(relativePath, f)
	})
}
