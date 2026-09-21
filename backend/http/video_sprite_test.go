package fbhttp

import "testing"

func TestSpriteTileGeometryPreservesSourceAspectInsideBounds(t *testing.T) {
	tests := []struct {
		name                                 string
		width, height, wantWidth, wantHeight int
	}{
		{"landscape", 1920, 1080, 160, 90},
		{"portrait", 1080, 1920, 50, 90},
		{"square", 1000, 1000, 90, 90},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			width, height := spriteTileGeometry(test.width, test.height)
			if width != test.wantWidth || height != test.wantHeight {
				t.Fatalf("geometry = %dx%d, want %dx%d", width, height, test.wantWidth, test.wantHeight)
			}
		})
	}
}

func TestSpriteSamplingIsBounded(t *testing.T) {
	interval, number := spriteSampling(3600)
	if interval != 30 || number != 100 {
		t.Fatalf("long sampling = %.2f/%d", interval, number)
	}
	interval, number = spriteSampling(12)
	if interval != 1 || number != 12 {
		t.Fatalf("short sampling = %.2f/%d", interval, number)
	}
}
