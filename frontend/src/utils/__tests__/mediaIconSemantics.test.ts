import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mediaIcon } from "../mediaIconSemantics";

describe("media icon semantics", () => {
  it("maps preview controls to the shared local icon vocabulary", () => {
    expect(mediaIcon("chevron_left")).toBe("chevron-left");
    expect(mediaIcon("chevron_right")).toBe("chevron-right");
    expect(mediaIcon("open_in_new")).toBe("external-link");
    expect(mediaIcon("file_download")).toBe("download");
    expect(mediaIcon("unknown-icon")).toBe("info");
  });

  it("keeps image and video gestures visually distinguishable", () => {
    expect(mediaIcon("zoom_in")).toBe("zoom-in");
    expect(mediaIcon("zoom_out")).toBe("zoom-out");
    expect(mediaIcon("rotate_left")).toBe("rotate-ccw");
    expect(mediaIcon("rotate_right")).toBe("rotate-cw");
    expect(mediaIcon("brightness_6")).toBe("sun");
    expect(mediaIcon("volume_up")).toBe("volume-2");
  });

  it("maps document and audio controls without falling back to font icons", () => {
    expect(mediaIcon("print")).toBe("printer");
    expect(mediaIcon("fullscreen")).toBe("maximize");
    expect(mediaIcon("fullscreen_exit")).toBe("minimize-2");
    expect(mediaIcon("music_note")).toBe("music");
    expect(mediaIcon("skip_previous")).toBe("skip-back");
    expect(mediaIcon("skip_next")).toBe("skip-forward");
    expect(mediaIcon("location_on")).toBe("map-pin");
    expect(mediaIcon("my_location")).toBe("locate-fixed");
  });

  it("keeps the global audio player and dropdown on the local SVG icon path", () => {
    const sourceRoot = resolve(process.cwd(), "src");
    for (const relativePath of [
      "components/files/GlobalAudioPlayer.vue",
      "components/DropdownModal.vue",
      "components/Breadcrumbs.vue",
    ]) {
      const source = readFileSync(resolve(sourceRoot, relativePath), "utf8");
      expect(source).not.toContain("material-icons");
      expect(source).toContain("AppIcon");
    }
  });
});
