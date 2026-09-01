package analysis

import (
	"testing"
	"time"
)

func TestRecommendDuplicateKeeperRequiresUniqueEarliestBirthTime(t *testing.T) {
	early := time.Unix(100, 1)
	later := time.Unix(100, 2)
	for _, test := range []struct {
		name         string
		files        []DuplicateFile
		path, reason string
	}{
		{"nanosecond precision", []DuplicateFile{{Path: "later", Created: &later}, {Path: "oldest", Created: &early}}, "oldest", "oldest-created"},
		{"any missing", []DuplicateFile{{Path: "oldest", Created: &early}, {Path: "unknown"}}, "", "missing-created"},
		{"tied earliest", []DuplicateFile{{Path: "a", Created: &early}, {Path: "b", Created: &early}}, "", "tied-created"},
		{"later tie irrelevant", []DuplicateFile{{Path: "a", Created: &later}, {Path: "b", Created: &later}, {Path: "oldest", Created: &early}}, "oldest", "oldest-created"},
	} {
		t.Run(test.name, func(t *testing.T) {
			path, reason := RecommendDuplicateKeeper(test.files)
			if path != test.path || reason != test.reason {
				t.Fatalf("got %q %q", path, reason)
			}
		})
	}
}
