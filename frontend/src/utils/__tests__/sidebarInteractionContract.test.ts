import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
    "utf8"
  );

describe("侧边栏分组交互契约", () => {
  it("收藏夹分组和目录分类都由整行切换展开状态", () => {
    const headerSource = readSource(
      "components/sidebar/SidebarGroupHeader.vue"
    );
    const sidebarSource = readSource("components/Sidebar.vue");

    expect(headerSource).toContain("@click=\"$emit('toggle')\"");
    expect(headerSource).not.toContain("$emit('primary')");
    expect(sidebarSource).not.toContain("navigateCategoryFirst");
  });

  it("收藏夹分组和目录分类保持相同的单行五列布局", () => {
    const headerSource = readSource(
      "components/sidebar/SidebarGroupHeader.vue"
    );
    const refinementCssSource = readSource("css/sidebar-refinement.css");

    expect(headerSource).toContain('class="sidebar-group-actions"');
    expect(refinementCssSource).toMatch(
      /\.sidebar-group-header\.sidebar-level-two\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*26px minmax\(0, 1fr\) auto 34px 24px;/s
    );
    expect(refinementCssSource).not.toContain(".sidebar-group-primary");
    expect(refinementCssSource).not.toContain(".sidebar-group-tools");
  });

  it("拖拽命中区不绘制独立边界线", () => {
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(cssSource).toMatch(
      /\.sidebar-resize-handle::after\s*\{[^}]*content:\s*none\s*!important;/s
    );
  });
});
