import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const baseCss = readFileSync(
  new URL("../../css/base.css", import.meta.url),
  "utf8"
);

describe("本地图标对齐契约", () => {
  it("让 SVG 图标脱离文字基线并保持稳定的内联尺寸", () => {
    expect(baseCss).toContain(".app-icon {");
    expect(baseCss).toContain("display: inline-block;");
    expect(baseCss).toContain("vertical-align: middle;");
    expect(baseCss).toContain("flex: 0 0 auto;");
  });
});
