import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const readStyles = () =>
  readFileSync(
    fileURLToPath(new URL("../../css/listing-icons.css", import.meta.url)),
    "utf8"
  );

describe("文件列表视觉契约", () => {
  it("特殊前缀和备份文件不通过整项透明度弱化", () => {
    const styles = readStyles();

    expect(styles).not.toMatch(/\[aria-label\^="\."\]\s*\{[^}]*opacity:/s);
    expect(styles).not.toMatch(/\[data-ext="\.bak"\]\s*\{[^}]*opacity:/s);
  });
});
