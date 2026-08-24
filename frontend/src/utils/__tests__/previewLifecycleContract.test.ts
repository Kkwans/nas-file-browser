import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const filesViewSource = readFileSync(
  fileURLToPath(new URL("../../views/Files.vue", import.meta.url)),
  "utf8"
);
const videoPlayerSource = readFileSync(
  fileURLToPath(
    new URL("../../components/files/VideoPlayer.vue", import.meta.url)
  ),
  "utf8"
);

describe("媒体预览生命周期契约", () => {
  it("等待新资源元数据后再按资源路径重建预览", () => {
    expect(filesViewSource).toContain(':key="currentViewKey"');
    expect(filesViewSource).not.toContain(':key="route.fullPath"');
    expect(filesViewSource).toContain("`${fileStore.req.path}:${mode}`");
  });

  it("已知不兼容格式不会在用户选择前绑定原视频源", () => {
    expect(videoPlayerSource).toContain("isKnownIncompatibleVideo(props.path)");
    expect(videoPlayerSource).toContain("const initialSource");
    expect(videoPlayerSource).toMatch(/\? \{\}\s+: \{/);
    expect(videoPlayerSource).not.toContain("<source />");
    expect(videoPlayerSource).toContain(
      "'media-video-stage--awaiting-source': !sourceAttached"
    );
    expect(videoPlayerSource).toContain(
      ".media-video-stage--awaiting-source :deep(.vjs-big-play-button)"
    );
    expect(videoPlayerSource).toContain(
      'player.value.on("play", applyPendingResume)'
    );
    expect(videoPlayerSource).toContain(
      "const canTryDirectPlayback = computed("
    );
    expect(videoPlayerSource).toContain("isKnownIncompatibleVideo(props.path)");
    expect(videoPlayerSource).toContain("再次尝试原视频");
  });

  it("当前浏览器无法解码 H.264 时先预检 MP4 编码，避免读取整段原视频后才失败", () => {
    expect(videoPlayerSource).toContain("shouldPreflightVideoCodec");
    expect(videoPlayerSource).toContain("getMediaInformation");
    expect(videoPlayerSource).toContain("isDefinitelyUnsupportedVideoCodec");
    expect(videoPlayerSource).toContain("preflightDirectPlayback");
    expect(videoPlayerSource).toContain("directPlaybackPreflightBlocked");
  });

  it("兼容播放等待 HLS 可寻址范围后再恢复进度", () => {
    expect(videoPlayerSource).toContain("isPlaybackPositionSeekable");
    expect(videoPlayerSource).toContain('"durationchange"');
    expect(videoPlayerSource).toContain("currentPlayer.seekable()");
    expect(videoPlayerSource).not.toMatch(
      /currentPlayer\.one\("loadedmetadata", \(\) => \{[\s\S]*currentPlayer\.currentTime\(resumeAt\)/
    );
  });

  it("兼容源切换不异步重置 Video.js tech", () => {
    const activation = videoPlayerSource.slice(
      videoPlayerSource.indexOf("function activateCompatibilityPlayback"),
      videoPlayerSource.indexOf("function clearHLSResumeWait")
    );
    expect(activation).not.toContain("currentPlayer.reset()");
    expect(activation).toContain("currentPlayer.load()");
    expect(activation).toContain('type: isWebM ? "video/webm"');
  });

  it("大图生成期间先显示真实缩略图占位", () => {
    const previewSource = readFileSync(
      fileURLToPath(new URL("../../views/files/Preview.vue", import.meta.url)),
      "utf8"
    );
    const imageSource = readFileSync(
      fileURLToPath(
        new URL("../../components/files/ExtendedImage.vue", import.meta.url)
      ),
      "utf8"
    );
    expect(previewSource).toContain(':placeholder-src="imagePlaceholderUrl"');
    expect(previewSource).toContain(
      'getPreviewURL(fileStore.req, "thumb", { warm: "big" })'
    );
    expect(imageSource).toContain("imageStatus === 'loading'");
    expect(imageSource).toContain("placeholderFailed");
    expect(imageSource).toContain("PLACEHOLDER_MAX_WAIT_MS");
    expect(imageSource).toContain(
      'class="image-ex-img image-ex-img-placeholder"'
    );
  });
});
