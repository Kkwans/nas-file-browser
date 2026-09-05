import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = resolve(process.cwd(), "src");
const readSource = (path: string) =>
  readFileSync(resolve(sourceRoot, path), "utf8");

describe("桌面应用壳层布局契约", () => {
  it("侧栏贯通顶栏且主区域内容不受右侧按钮宽度影响", () => {
    const css = readSource("css/workspace-ui.css");

    expect(css).toContain('grid-template-areas: "leading main";');
    expect(css).toMatch(
      /header:has\(\.header-instance\) > \.header-center,\s*header:has\(\.header-instance\) > \.header-trailing\s*\{\s*grid-area: main;/s
    );
    expect(css).toMatch(
      /header:has\(\.header-instance\) > \.header-center\s*\{[^}]*justify-self: center;/s
    );
    expect(css).toMatch(
      /header:has\(\.header-instance\) > \.header-leading\s*\{[^}]*height: 100%;[^}]*border-right:/s
    );
  });

  it("搜索提示居中且任务中心返回文案保持简洁", () => {
    const css = readSource("css/workspace-ui.css");
    const taskCenter = readSource("views/TaskCenter.vue");

    expect(css).toMatch(
      /\.listing-search input::placeholder\s*\{\s*text-align: center;/s
    );
    expect(taskCenter).toContain('back-label="返回"');
    expect(taskCenter).not.toContain('back-label="返回文件"');
  });

  it("搜索框缩短四分之一且折叠无返回动作时保留品牌图标", () => {
    const css = readSource("css/workspace-ui.css");

    expect(css).toContain("width: min(27rem, 36%) !important;");
    expect(css).toMatch(
      /> \.header-leading:not\(:has\(\.header-back--leading\)\)\s*> img\s*\{[^}]*display:\s*block;[^}]*margin-inline:\s*auto;/s
    );
    expect(css).toMatch(
      /> \.header-leading:has\(\.header-back--leading\)\s*> img\s*\{[^}]*display:\s*none;/s
    );
  });
});
