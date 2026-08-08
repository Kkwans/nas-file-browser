import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const videoPlayerSource = readFileSync(
  fileURLToPath(
    new URL("../../components/files/VideoPlayer.vue", import.meta.url)
  ),
  "utf8"
);

describe("视频兼容播放恢复契约", () => {
  it("只在首个 HLS 源仍未就绪时执行一次可取消的延迟重选源", () => {
    expect(videoPlayerSource).toContain(
      "compatibilityRecoveryTimer = window.setTimeout"
    );
    expect(videoPlayerSource).toContain("currentPlayer.readyState() !== 0");
    expect(videoPlayerSource).toContain("}, 750)");
    expect(videoPlayerSource).toContain("stopCompatibilityRecovery()");
    expect(
      videoPlayerSource.match(
        /currentPlayer\.src\(\{ src: playlistURL, type: "application\/x-mpegURL" \}\)/g
      )
    ).toHaveLength(2);
    expect(videoPlayerSource).not.toContain('currentPlayer.one("loadstart"');
  });
});
