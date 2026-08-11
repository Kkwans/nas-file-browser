import { describe, expect, it } from "vitest";

import { getVideoSourceType, isKnownIncompatibleVideo } from "../videoPlayback";

describe("视频播放源策略", () => {
  it("识别需要用户主动选择兼容播放的格式", () => {
    expect(isKnownIncompatibleVideo("/movie/demo.MKV")).toBe(true);
    expect(isKnownIncompatibleVideo("/movie/demo.avi?download=true")).toBe(
      true
    );
    expect(isKnownIncompatibleVideo("/movie/demo.mp4")).toBe(false);
    expect(isKnownIncompatibleVideo("/movie/mkv-not-extension.mp4")).toBe(
      false
    );
  });

  it("为浏览器和 Video.js 提供真实 MIME 类型", () => {
    expect(getVideoSourceType("/api/raw/movie.mp4?auth=1")).toBe("video/mp4");
    expect(getVideoSourceType("/api/raw/movie.mkv")).toBe("video/x-matroska");
    expect(
      getVideoSourceType("/api/raw/no-extension", "/movie/demo.webm")
    ).toBe("video/webm");
    expect(getVideoSourceType("/api/download.php", "/movie/demo.mp4")).toBe(
      "video/mp4"
    );
    expect(getVideoSourceType("/api/raw/unknown.xyz")).toBe("");
  });
});
