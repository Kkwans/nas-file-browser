import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const videoPlayerSource = readFileSync(
  fileURLToPath(
    new URL("../../components/files/VideoPlayer.vue", import.meta.url)
  ),
  "utf8"
);
const videoJsPatchSource = readFileSync(
  fileURLToPath(
    new URL("../../../patches/video.js@8.23.7.patch", import.meta.url)
  ),
  "utf8"
);
const pnpmWorkspaceSource = readFileSync(
  fileURLToPath(new URL("../../../pnpm-workspace.yaml", import.meta.url)),
  "utf8"
);
const customDockerfileSource = readFileSync(
  fileURLToPath(new URL("../../../../Dockerfile.custom", import.meta.url)),
  "utf8"
);

describe("视频兼容播放依赖契约", () => {
  it("组件不调用 VHS 私有 API 或依赖延迟重选源", () => {
    expect(videoPlayerSource).not.toContain("IWillNotUseThisInPlugins");
    expect(videoPlayerSource).not.toContain(".vhs");
    expect(videoPlayerSource).not.toContain("setupEme_");
    expect(videoPlayerSource).not.toContain("compatibilityRecoveryTimer");
    expect(
      videoPlayerSource.match(
        /currentPlayer\.src\(\{ src: playlistURL, type: "application\/x-mpegURL" \}\)/g
      )
    ).toHaveLength(1);
  });

  it("对无 DRM 的 HLS 通过受管补丁解除 EME 初始化等待", () => {
    expect(videoJsPatchSource).toContain("if (!this.source_.keySystems)");
    expect(videoJsPatchSource).toContain(
      "this.playlistController_.sourceUpdater_.initializedEme()"
    );
    expect(pnpmWorkspaceSource).toContain(
      "video.js@8.23.7: patches/video.js@8.23.7.patch"
    );
    expect(customDockerfileSource).toContain("frontend/pnpm-workspace.yaml");
    expect(customDockerfileSource).toContain(
      "COPY frontend/patches/ ./patches/"
    );
    expect(
      customDockerfileSource.indexOf("COPY frontend/patches/")
    ).toBeLessThan(
      customDockerfileSource.indexOf("pnpm install --frozen-lockfile")
    );
  });
});
