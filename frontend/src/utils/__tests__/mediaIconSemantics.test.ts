import { describe, expect, it } from "vitest";
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
});
