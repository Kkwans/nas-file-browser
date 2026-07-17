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

  it("默认只展开收藏夹和存储卷", () => {
    const sidebarSource = readSource("components/Sidebar.vue");

    expect(sidebarSource).toMatch(
      /const collapsedSections = reactive\(\{\s*systemOptions: true,\s*favorites: false,\s*tags: true,\s*volumes: false,\s*categories: true,/s
    );
  });

  it("侧边栏排序提供统一的前后落点提示", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(sidebarSource).toContain("sidebarDropClass");
    expect(cssSource).toContain(".sidebar-drop-before::before");
    expect(cssSource).toContain(".sidebar-drop-after::after");
  });

  it("收藏项可以拖回未分组区域", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(sidebarSource).toContain("onUngroupedDrop");
    expect(sidebarSource).toContain(
      'moveFavoriteToGroup(draggedFavId.value, "")'
    );
    expect(sidebarSource).toContain("isDraggingGroupedFavorite");
    expect(sidebarSource).toContain("favorites-ungrouped-drop-target");
    expect(cssSource).toContain(".favorites-ungrouped-drop-target");
    expect(cssSource).toContain(".favorites-ungrouped-drop-target.active");
  });

  it("收藏拖拽结束统一清理全部临时状态", () => {
    const sidebarSource = readSource("components/Sidebar.vue");

    expect(sidebarSource).toMatch(
      /const onFavDragEnd = \(\) => \{[\s\S]*dragOverGroupId\.value = "";[\s\S]*dragOverFavoriteId\.value = "";[\s\S]*draggedFavId\.value = "";[\s\S]*ungroupedDropActive\.value = false;[\s\S]*\};/
    );
    expect(sidebarSource).toMatch(
      /const onFavDropOnItem = async[\s\S]*finally \{\s*clearSidebarDrag\(\);\s*\}/
    );
    expect(sidebarSource).toMatch(
      /const onFavDropOnGroup = async[\s\S]*finally \{\s*clearSidebarDrag\(\);\s*\}/
    );
  });

  it("收藏拖动反馈不降低整项透明度", () => {
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(cssSource).toMatch(
      /\.favorite-item\.dragging\s*\{[^}]*opacity:\s*1\s*!important;/s
    );
  });
});
