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
    expect(videoPlayerSource).toContain("? {}\n      : {");
    expect(videoPlayerSource).not.toContain("<source />");
    expect(videoPlayerSource).toContain(
      'player.value.on("play", applyPendingResume)'
    );
  });
});
