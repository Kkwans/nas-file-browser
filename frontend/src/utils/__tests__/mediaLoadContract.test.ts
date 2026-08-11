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
});
