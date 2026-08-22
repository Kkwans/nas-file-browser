import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");
const readSource = (path: string) =>
  readFileSync(resolve(sourceRoot, path), "utf8");

describe("文件工具栏图标契约", () => {
  it("通用操作按钮支持受控的本地图标注册表", () => {
    const actionSource = readSource("components/header/Action.vue");
    const registrySource = readSource("components/ui/iconRegistry.ts");

    expect(actionSource).toContain(':name="resolvedIconName"');
    expect(actionSource).toContain("appIcon?: AppIconName");
    expect(actionSource).toContain("resolveLegacyAppIcon");
    expect(registrySource).toContain("menu: Menu");
    expect(registrySource).toContain("more: MoreVertical");
    expect(registrySource).toContain("share: Share2");
    expect(registrySource).toContain("terminal: SquareTerminal");
    expect(registrySource).toContain('"view-mosaic": Grid2X2');
  });

  it("文件页首要操作使用同一套语义图标", () => {
    const headerSource = readSource("components/header/HeaderBar.vue");
    const listingSource = readSource("views/files/FileListing.vue");

    expect(headerSource).toContain('app-icon="menu"');
    expect(headerSource).toContain('app-icon="more"');
    expect(listingSource).toContain('app-icon="share"');
    expect(listingSource).toContain('app-icon="rename"');
    expect(listingSource).toContain('app-icon="copy"');
    expect(listingSource).toContain('app-icon="move"');
    expect(listingSource).toContain('app-icon="analysis"');
    expect(listingSource).toContain('app-icon="trash"');
    expect(listingSource).toContain('app-icon="download"');
    expect(listingSource).toContain('app-icon="upload"');
    expect(listingSource).toContain(':app-icon="viewAppIcon"');
  });

  it("桌面点击区和图形尺寸彼此独立", () => {
    const headerCss = readSource("css/header.css");
    const contextCss = readSource("css/context-menu.css");
    const workspaceCss = readSource("css/workspace-ui.css");

    expect(headerCss).toMatch(
      /header \.action\s*\{[^}]*width:\s*2\.5rem;[^}]*height:\s*2\.5rem;/s
    );
    expect(headerCss).toMatch(
      /header \.action > \.app-icon\s*\{[^}]*width:\s*1\.25rem;[^}]*height:\s*1\.25rem;/s
    );
    expect(contextCss).toContain(".context-menu .action > .app-icon");
    expect(contextCss).toMatch(
      /\.context-menu \.action > \.app-icon\s*\{[^}]*width:\s*18px;[^}]*height:\s*18px;/s
    );
    expect(workspaceCss).toMatch(
      /@media \(max-width: 899px\)[\s\S]*header > \.header-trailing > #more\s*\{[^}]*display:\s*inline-grid;[^}]*width:\s*40px;/
    );
    expect(workspaceCss).toContain(
      "header > .header-trailing #dropdown.active"
    );
    expect(workspaceCss).toMatch(
      /header > \.header-trailing #dropdown\s*\{[^}]*position:\s*fixed;[^}]*display:\s*block;/s
    );
    expect(workspaceCss).toMatch(
      /header > \.header-trailing #dropdown > div\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;/s
    );
    expect(workspaceCss).toMatch(
      /header > \.header-trailing #dropdown \.action\s*\{[^}]*display:\s*flex;[^}]*width:\s*100%;[^}]*min-height:\s*42px;/s
    );
    expect(workspaceCss).toMatch(
      /@media \(max-width: 736px\)[\s\S]*header > \.header-trailing > #more\s*\{[^}]*width:\s*44px;[^}]*height:\s*44px;/
    );
  });
});
