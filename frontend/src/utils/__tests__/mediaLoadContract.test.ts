import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const thumbnailSource = readFileSync(
  new URL("../../components/files/FileThumbnail.vue", import.meta.url),
  "utf8"
);
const imageSource = readFileSync(
  new URL("../../components/files/ExtendedImage.vue", import.meta.url),
  "utf8"
);
const previewSource = readFileSync(
  new URL("../../views/files/Preview.vue", import.meta.url),
  "utf8"
);
const videoSource = readFileSync(
  new URL("../../components/files/VideoPlayer.vue", import.meta.url),
  "utf8"
);

describe("media loading contract", () => {
  it("releases listing image connections while the resource is loading", () => {
    expect(thumbnailSource).toContain("useLayoutStore");
    expect(thumbnailSource).toContain("layoutStore.loading");
    expect(thumbnailSource).toContain('removeAttribute("src")');
    expect(thumbnailSource).toContain("request?.cancel()");
    expect(thumbnailSource).toContain('{ flush: "sync" }');
  });

  it("does not prefetch adjacent media before the current image is ready", () => {
    expect(previewSource).toContain('@ready="onCurrentImageReady"');
    expect(previewSource).toContain("requestIdleCallback");
    expect(previewSource).toContain('v-if="nextPrefetchEnabled"');
    expect(previewSource).not.toContain('rel="prefetch" :href="previousRaw"');
    expect(previewSource).not.toContain('<link rel="prefetch"');
    expect(previewSource).toContain(
      "if (currentImageReady.value) scheduleNextPrefetch();"
    );
  });

  it("exposes explicit image states and recovery actions", () => {
    expect(imageSource).toContain(':data-status="imageStatus"');
    expect(imageSource).toContain('@error="onError"');
    expect(imageSource).toContain("retryImage");
    expect(imageSource).toContain("directSrc");
    expect(imageSource).toContain("downloadSrc");
    expect(imageSource).toContain("cancelImageLoad");
    expect(imageSource).toContain("IMAGE_LOAD_TIMEOUT_MS = 30_000");
    expect(imageSource).toContain("armLoadTimeout(token)");
    expect(imageSource).toContain("window.clearTimeout(loadTimeout)");
    expect(imageSource).toContain("UTIF._imgLoaded.call(xhr, event)");
    expect(imageSource).toContain("UTIF._xhrs.splice(index, 1)");
    expect(imageSource).toContain("UTIF._imgs.splice(index, 1)");
    const failStart = imageSource.indexOf("const failImageLoad");
    const failEnd = imageSource.indexOf("const onError", failStart);
    const failSource = imageSource.slice(failStart, failEnd);
    expect(failSource).toContain("loadToken += 1");
    expect(failSource).toContain("request.abort()");
  });

  it("prioritizes the full preview while retaining a real thumbnail placeholder", () => {
    expect(imageSource).toContain('fetchpriority="high"');
    expect(imageSource).toContain('loading="eager"');
    expect(imageSource).toContain(
      'class="image-ex-img image-ex-img-placeholder"'
    );
    expect(imageSource).toContain('@load="onPlaceholderLoad"');
  });

  it("大图 JPEG 先显示真实缩略图，再启动大图请求", () => {
    expect(imageSource).toContain("onPlaceholderLoad");
    expect(imageSource).toContain("startFullImageLoad");
    expect(imageSource).toContain("clearPlaceholderTimer");
    expect(imageSource).toContain("PLACEHOLDER_MAX_WAIT_MS");
    expect(imageSource).toContain("RAW_IMAGE_FALLBACK_DELAY_MS");
    expect(imageSource).toContain("RAW_IMAGE_FALLBACK_DELAY_MS = 4000");
    expect(imageSource).toContain("startRawImageFallback");
    expect(imageSource).toContain("placeholderFailed");
    expect(imageSource).toContain("placeholderIsFull");
    expect(imageSource).toContain("deferFullUntilPlaceholder");
    expect(previewSource).toContain("if (isLargeJpegPreview.value)");
    expect(previewSource).toContain(
      'return api.getPreviewURL(fileStore.req, "thumb");'
    );
    expect(previewSource).toContain(
      ':defer-full-until-placeholder="isLargeJpegPreview"'
    );
    expect(previewSource).not.toContain(
      ':placeholder-is-full="isLargeJpegPreview"'
    );
  });

  it("预热大图失败时回退到原图而不是重复请求失败地址", () => {
    const errorStart = imageSource.indexOf("const onPlaceholderError");
    const errorEnd = imageSource.indexOf("const loadImage", errorStart);
    const errorSource = imageSource.slice(errorStart, errorEnd);
    expect(errorStart).toBeGreaterThanOrEqual(0);
    expect(errorSource).toContain("startRawImageFallback");
    expect(errorSource).toContain("placeholderIsFull");
  });

  it("大图原图回退期间保留可见的普通缩略图", () => {
    expect(imageSource).toContain("fallbackPlaceholderSrc");
    expect(imageSource).toContain("placeholderUsingFallback");
    expect(imageSource).toContain("props.fallbackPlaceholderSrc");
    expect(imageSource).toContain(
      "imageStatus === 'loading' && !placeholderUsingFallback"
    );
    expect(previewSource).toContain(
      ':fallback-placeholder-src="imageFallbackPlaceholderUrl"'
    );
    expect(previewSource).toContain(
      'api.getPreviewURL(fileStore.req, "thumb")'
    );
  });

  it("uses a real server poster only for directly playable videos", () => {
    expect(previewSource).toContain(':poster="videoPosterUrl"');
    expect(previewSource).toContain("isKnownIncompatibleVideo(resource.path)");
    expect(videoSource).toContain(':poster="posterSource || undefined"');
    expect(videoSource).toContain("poster?: string;");
    expect(videoSource).toContain("loadPosterAfterVideoReady");
  });

  it("exposes a delayed loading and stalled recovery state for video", () => {
    expect(videoSource).toContain("showVideoLoadOverlay");
    expect(videoSource).toContain('role="status"');
    expect(videoSource).toContain('videoLoadState === "stalled"');
    expect(videoSource).toContain("retryVideoSource");
    expect(videoSource).toContain('player.value.on("waiting", onVideoWaiting)');
    expect(videoSource).toContain('player.value.on("stalled", onVideoWaiting)');
    expect(videoSource).toContain('player.value.on("canplay", onVideoReady)');
    expect(videoSource).toContain('next === "stalled" ? 320 : 240');
    expect(videoSource).toContain("prefers-reduced-motion: reduce");
  });
});
