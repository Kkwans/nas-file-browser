import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const readStyles = () =>
  readFileSync(
    fileURLToPath(new URL("../../css/listing-icons.css", import.meta.url)),
    "utf8"
  );

const readMain = () =>
  readFileSync(
    fileURLToPath(new URL("../../main.ts", import.meta.url)),
    "utf8"
  );

const readListing = () =>
  readFileSync(
    fileURLToPath(new URL("../../css/listing.css", import.meta.url)),
    "utf8"
  );

const readWorkspace = () =>
  readFileSync(
    fileURLToPath(new URL("../../css/workspace-ui.css", import.meta.url)),
    "utf8"
  );

describe("文件列表视觉契约", () => {
  it("特殊前缀和备份文件不通过整项透明度弱化", () => {
    const styles = readStyles();

    expect(styles).not.toMatch(/\[aria-label\^="\."\]\s*\{[^}]*opacity:/s);
    expect(styles).not.toMatch(/\[data-ext="\.bak"\]\s*\{[^}]*opacity:/s);
  });

  it("本地图标不再依赖 Material 字体伪元素或全局字体加载门闩", () => {
    const styles = readStyles();
    const main = readMain();

    expect(styles).not.toContain('font-family: "Material Icons"');
    expect(styles).not.toContain(".file-type-icon::before");
    expect(main).not.toContain("fonts-loading");
    expect(main).not.toContain("document.fonts.ready");
  });

  it("详细网格把条目操作固定在卡片右上角，避免底部悬浮错位", () => {
    const styles = readListing();
    const workspaceStyles = readWorkspace();

    expect(styles).toMatch(
      /#listing\.mosaic \.item-controls\s*\{[^}]*top:\s*8px;[^}]*right:\s*8px;[^}]*bottom:\s*auto;[^}]*left:\s*auto;/s
    );
    expect(styles).not.toMatch(
      /#listing\.mosaic \.item-controls\s*\{[^}]*transform:\s*translateX\(-50%\)/s
    );
    expect(workspaceStyles).toMatch(
      /#listing\.mosaic \.item > \.item-controls\s*\{[^}]*top:\s*8px;[^}]*right:\s*8px;[^}]*bottom:\s*auto;[^}]*left:\s*auto;[^}]*width:\s*auto;/s
    );
  });
});
