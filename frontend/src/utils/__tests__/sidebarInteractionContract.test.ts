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

  it("收藏项通过普通落点提示拖回未分组区域", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(sidebarSource).toContain("onUngroupedDrop");
    expect(sidebarSource).toContain(
      'moveFavoriteToGroup(draggedFavId.value, "")'
    );
    expect(sidebarSource).toContain("isDraggingGroupedFavorite");
    expect(sidebarSource).not.toContain("favorites-ungrouped-drop-target");
    expect(sidebarSource).not.toContain("拖到这里移出分组");
    expect(sidebarSource).toContain("favorites-ungrouped-drop-zone--empty");
    expect(cssSource).toContain(".favorites-ungrouped-drop-zone--empty");
  });

  it("收藏拖放事件不会冒泡到模块排序，且会校验拖拽来源", () => {
    const sidebarSource = readSource("components/Sidebar.vue");

    expect(sidebarSource).toContain(
      '@dragover.stop.prevent="onFavDragOverItem($event, fav.id)"'
    );
    expect(sidebarSource).toContain(
      '@drop.stop="onFavDropOnItem($event, fav.id)"'
    );
    expect(sidebarSource).toContain(
      '@dragover.stop.prevent="onFavDragOverGroup($event, group.id)"'
    );
    expect(sidebarSource).toContain(
      '@drop.stop="onFavDropOnGroup($event, group.id)"'
    );
    expect(sidebarSource).toMatch(
      /const onFavDragOverItem = [\s\S]*if \(!draggedFavId\.value\) \{[\s\S]*dropEffect = "none";[\s\S]*return;/
    );
  });

  it("跨类型或跨层级目标会清除旧落点提示", () => {
    const sidebarSource = readSource("components/Sidebar.vue");

    expect(sidebarSource).toMatch(
      /if \(!valid\) \{[\s\S]*sidebarDropTarget\.value = null;[\s\S]*dropEffect = "none";/
    );
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

  it("收藏拖动不改变原列表项视觉状态", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(sidebarSource).not.toContain("dragging: draggedFavId === fav.id");
    expect(cssSource).not.toContain(".favorite-item.dragging");
  });

  it("落点提示使用克制的纯色细线", () => {
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(cssSource).toMatch(
      /\.sidebar-drop-after::after\s*\{[\s\S]*height:\s*2px;[\s\S]*background:\s*var\(--blue, #1677ff\);/
    );
    expect(cssSource).not.toMatch(
      /\.sidebar-drop-after::after\s*\{[\s\S]*linear-gradient/
    );
  });

  it("同层收藏项与分组图标共用一致的水平起点，悬停不改变宽度", () => {
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(cssSource).toMatch(
      /\.sidebar-module \.favorites-ungrouped-drop-zone > \.favorite-item,[\s\S]*\.sidebar-module \.favorite-group-header,[\s\S]*\.sidebar-module \.category-group-header\s*\{[^}]*width:\s*calc\(100% - 1rem\)\s*!important;[^}]*margin-inline:\s*0\.5rem\s*!important;/s
    );
    expect(cssSource).not.toMatch(
      /\.sidebar-sortable-item\[draggable="true"\]:hover\s*\{[^}]*transform:/s
    );
  });

  it("收藏与标签的落点线绘制在条目内部，避免被圆角容器裁掉", () => {
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(cssSource).toMatch(
      /\.sidebar-drop-before::before\s*\{[^}]*top:\s*0;/s
    );
    expect(cssSource).toMatch(
      /\.sidebar-drop-after::after\s*\{[^}]*bottom:\s*0;/s
    );
  });
});
