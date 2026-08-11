import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(
    fileURLToPath(new URL(`../../${relativePath}`, import.meta.url)),
    "utf8"
  );

describe("桌面侧边栏图标轨契约", () => {
  it("使用用户偏好持久化 72px 桌面折叠状态", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const preferenceSource = readSource("utils/sidebarPreferences.ts");
    const storeSource = readSource("stores/sidebarPreferences.ts");
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(preferenceSource).toContain("desktopCollapsed: boolean");
    expect(storeSource).toContain("setDesktopCollapsed");
    expect(sidebarSource).toContain("sidebarPreferencesStore.desktopCollapsed");
    expect(cssSource).toContain("--sidebar-rail-width: 4.5rem");
  });

  it("普通页面直接导航，集合入口使用锚定浮层", () => {
    const sidebarSource = readSource("components/Sidebar.vue");

    expect(sidebarSource).toContain('v-for="option in orderedSystemOptions"');
    expect(sidebarSource).toContain('@click="runSystemOption(option.id)"');
    for (const panel of ["favorites", "tags", "categories", "volumes"]) {
      expect(sidebarSource).toContain(`toggleRailPanel('${panel}', $event)`);
    }
    expect(sidebarSource).toContain('class="sidebar-rail-popover"');
    expect(sidebarSource).toContain('@keydown.esc.stop="closeRailPanel(true)"');
  });

  it("完整侧栏内容栈占满可用高度且不会挤压页脚", () => {
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(cssSource).toMatch(
      /nav\.sidebar \.sidebar-personalized-stack\s*\{[^}]*flex:\s*1 0 auto;[^}]*min-height:\s*0;/s
    );
    expect(cssSource).toMatch(
      /nav\.sidebar \.sidebar-personalized-stack > #logout\s*\{[^}]*margin-top:\s*auto\s*!important;/s
    );
  });

  it("图标由本地 AppIcon 包装层管理并提供可访问标签和 Tooltip", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const iconRegistrySource = readSource("components/ui/iconRegistry.ts");

    expect(sidebarSource).toContain("<AppIcon");
    expect(sidebarSource).toContain(':data-tooltip="option.label"');
    expect(sidebarSource).toContain(':aria-label="option.label"');
    expect(iconRegistrySource).toContain('from "@lucide/vue"');
  });

  it("展开侧栏与图标轨使用稳定的视觉尺寸而不缩小点击区", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const sectionHeaderSource = readSource(
      "components/sidebar/SidebarSectionHeader.vue"
    );
    const groupHeaderSource = readSource(
      "components/sidebar/SidebarGroupHeader.vue"
    );
    const cssSource = readSource("css/sidebar-refinement.css");
    const iconRegistrySource = readSource("components/ui/iconRegistry.ts");

    expect(cssSource).toContain("--sidebar-primary-icon-size: 1.25rem");
    expect(cssSource).toContain("--sidebar-primary-icon-column: 1.75rem");
    expect(cssSource).toMatch(
      /\.sidebar-rail-action\s*\{[^}]*width:\s*2\.75rem;[^}]*height:\s*2\.75rem;/s
    );
    expect(sectionHeaderSource).toContain('name="chevron-right"');
    expect(groupHeaderSource).toContain('name="chevron-right"');
    expect(sectionHeaderSource).not.toContain("expand_more");
    expect(groupHeaderSource).not.toContain("expand_more");
    expect(sidebarSource).toContain('aria-label="新建收藏分组"');
    expect(sidebarSource).toContain('aria-label="清空收藏夹"');
    expect(iconRegistrySource).toContain("file: File");
    expect(iconRegistrySource).not.toContain("file: Files");
  });

  it("移动端保持完整抽屉并关闭桌面图标轨", () => {
    const sidebarSource = readSource("components/Sidebar.vue");
    const cssSource = readSource("css/sidebar-refinement.css");

    expect(sidebarSource).toContain('window.matchMedia("(min-width: 737px)")');
    expect(cssSource).toMatch(
      /@media \(max-width: 736px\)[\s\S]*\.sidebar-icon-rail\s*\{[\s\S]*display:\s*none;/
    );
  });
});
