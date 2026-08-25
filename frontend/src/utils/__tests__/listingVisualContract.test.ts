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

  it("详细网格把条目操作固定在卡片底部，和标题及时间共享基线", () => {
    const workspaceStyles = readWorkspace();

    expect(workspaceStyles).toMatch(
      /#listing\.mosaic \.item > \.item-controls\s*\{[^}]*top:\s*auto;[^}]*right:\s*12px;[^}]*bottom:\s*10px;[^}]*left:\s*12px;[^}]*width:\s*auto;[^}]*border-top:\s*1px/s
    );
    expect(workspaceStyles).toContain(
      "#listing.mosaic .item:hover > .item-controls"
    );
    expect(workspaceStyles).not.toMatch(
      /#listing\.mosaic \.item > \.item-controls\s*\{[^}]*transform:\s*translateX\(-50%\)/s
    );
  });
});
