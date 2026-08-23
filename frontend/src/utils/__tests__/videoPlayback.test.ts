import { describe, expect, it } from "vitest";

import {
  getVideoSourceType,
  isDefinitelyUnsupportedVideoCodec,
  isKnownIncompatibleVideo,
  isPlaybackPositionSeekable,
  shouldPreflightVideoCodec,
  supportsH264CompatibilityPlayback,
} from "../videoPlayback";

describe("视频播放源策略", () => {
  it("识别需要用户主动选择兼容播放的格式", () => {
    expect(isKnownIncompatibleVideo("/movie/demo.MKV")).toBe(true);
    expect(isKnownIncompatibleVideo("/movie/demo.avi?download=true")).toBe(
      true
    );
    expect(isKnownIncompatibleVideo("/movie/demo.MOV")).toBe(true);
    expect(isKnownIncompatibleVideo("/movie/demo.mp4")).toBe(false);
    expect(isKnownIncompatibleVideo("/movie/mkv-not-extension.mp4")).toBe(
      false
    );
  });

  it("浏览器明确支持容器时不强制走兼容播放", () => {
    const scope = globalThis as typeof globalThis & {
      document?: { createElement: () => { canPlayType: () => string } };
    };
    const originalDocument = scope.document;
    Object.defineProperty(scope, "document", {
      configurable: true,
      value: {
        createElement: () => ({ canPlayType: () => "probably" }),
      },
    });
    expect(isKnownIncompatibleVideo("/movie/demo.mkv")).toBe(false);
    expect(isKnownIncompatibleVideo("/movie/demo.mov")).toBe(false);
    Object.defineProperty(scope, "document", {
      configurable: true,
      value: originalDocument,
    });
  });

  it("容器只返回 maybe 时仍走兼容播放，避免未知编码黑屏", () => {
    const scope = globalThis as typeof globalThis & {
      document?: { createElement: () => { canPlayType: () => string } };
    };
    const originalDocument = scope.document;
    Object.defineProperty(scope, "document", {
      configurable: true,
      value: {
        createElement: () => ({ canPlayType: () => "maybe" }),
      },
    });
    expect(isKnownIncompatibleVideo("/movie/demo.mkv")).toBe(true);
    expect(isKnownIncompatibleVideo("/movie/demo.mov")).toBe(true);
    Object.defineProperty(scope, "document", {
      configurable: true,
      value: originalDocument,
    });
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

  it("只为可能容纳不兼容编码的 MP4 容器做快速预检", () => {
    expect(shouldPreflightVideoCodec("/movie/demo.mp4")).toBe(true);
    expect(shouldPreflightVideoCodec("/movie/demo.M4V?inline=true")).toBe(true);
    expect(shouldPreflightVideoCodec("/movie/demo.webm")).toBe(false);
    expect(shouldPreflightVideoCodec("/movie/demo.mkv")).toBe(false);
  });

  it("只拦截 Chromium 明确无法直接解码的编码", () => {
    expect(isDefinitelyUnsupportedVideoCodec("hevc")).toBe(true);
    expect(isDefinitelyUnsupportedVideoCodec("H.265")).toBe(true);
    expect(isDefinitelyUnsupportedVideoCodec("h264")).toBe(false);
    expect(isDefinitelyUnsupportedVideoCodec("av1")).toBe(false);
    expect(isDefinitelyUnsupportedVideoCodec(undefined)).toBe(false);
  });

  it("只在 HLS 已暴露目标时间范围后应用续播位置", () => {
    expect(
      isPlaybackPositionSeekable(60, 0, 120, Number.POSITIVE_INFINITY)
    ).toBe(true);
    expect(
      isPlaybackPositionSeekable(60, 0, 30, Number.POSITIVE_INFINITY)
    ).toBe(false);
    expect(isPlaybackPositionSeekable(60, Number.NaN, Number.NaN, 120)).toBe(
      true
    );
    expect(
      isPlaybackPositionSeekable(
        60,
        Number.NaN,
        Number.NaN,
        Number.POSITIVE_INFINITY
      )
    ).toBe(false);
  });

  it("在没有 H.264 MSE 的 Chromium 上选择 WebM 兼容路径", () => {
    const scope = globalThis as typeof globalThis & {
      window?: { MediaSource?: unknown };
      document?: { createElement: () => { canPlayType: () => string } };
    };
    const originalWindow = scope.window;
    const originalDocument = scope.document;
    Object.defineProperty(scope, "window", {
      configurable: true,
      value: { isTypeSupported: () => false },
    });
    Object.defineProperty(scope.window, "MediaSource", {
      configurable: true,
      value: { isTypeSupported: () => false },
    });
    Object.defineProperty(scope, "document", {
      configurable: true,
      value: { createElement: () => ({ canPlayType: () => "" }) },
    });
    expect(supportsH264CompatibilityPlayback()).toBe(false);
    Object.defineProperty(scope, "window", {
      configurable: true,
      value: originalWindow,
    });
    Object.defineProperty(scope, "document", {
      configurable: true,
      value: originalDocument,
    });
  });
});
