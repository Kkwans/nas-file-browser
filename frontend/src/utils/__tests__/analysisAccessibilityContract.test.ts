import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const analysisSource = readFileSync(
  fileURLToPath(new URL("../../views/Analysis.vue", import.meta.url)),
  "utf8"
);

describe("存储工具无障碍契约", () => {
  it("扫描范围移除按钮保留至少 32px 的触摸目标", () => {
    expect(analysisSource).toMatch(
      /\.analysis-scope-list button\s*\{[\s\S]*?width:\s*32px;[\s\S]*?height:\s*32px;/
    );
  });
});
