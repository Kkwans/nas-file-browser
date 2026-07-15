package fbhttp

import "testing"

func TestUGREENSharedFoldersAreClassifiedAsShared(t *testing.T) {
	t.Parallel()

	paths := []string{
		"/volume2/OpenClaw",
		"/volume2/Project",
		"/volume2/Hermes",
		"/volume2/docker",
		"/volume2/docker-apps",
		"/volume2/Common",
		"/volume2/DockerProject",
		"/volume2/Download",
		"/volume2/迅雷下载",
		"/volume2/ViEDO",
	}

	for _, path := range paths {
		path := path
		t.Run(path, func(t *testing.T) {
			t.Parallel()
			if category := classifyPath(path); category.ID != "shared" {
				t.Fatalf("classifyPath(%q) = %q, want shared", path, category.ID)
			}
		})
	}
}

func TestDockerSystemFolderRemainsSystem(t *testing.T) {
	t.Parallel()

	if category := classifyPath("/volume2/Docker"); category.ID != "system" {
		t.Fatalf("classifyPath(/volume2/Docker) = %q, want system", category.ID)
	}
}
