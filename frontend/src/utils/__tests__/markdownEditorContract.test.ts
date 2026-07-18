import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  resolve(process.cwd(), "frontend/src/views/files/Editor.vue"),
  "utf8"
);
const vditorStyles = readFileSync(
  resolve(process.cwd(), "frontend/src/css/vditor-overrides.css"),
  "utf8"
);
const codeStyles = readFileSync(
  resolve(process.cwd(), "frontend/src/css/markdown-code.css"),
  "utf8"
);
const contentStyles = readFileSync(
  resolve(process.cwd(), "frontend/src/css/markdown-content.css"),
  "utf8"
);

describe("Markdown 编辑器交互契约", () => {
  it("默认使用类似 Typora 的所见即所得模式", () => {
    expect(editorSource).toContain(
      'const currentMode = ref<MarkdownMode>("wysiwyg")'
    );
    expect(editorSource).toContain('initVditorWithMode(content, "wysiwyg")');
    expect(editorSource).toContain("switchMode('wysiwyg')");
  });

  it("代码语言选择器使用顶部下拉面板而不是居中模态框", () => {
    expect(editorSource).toMatch(
      /\.markdown-language-picker-backdrop\s*\{[\s\S]*place-items:\s*start end;[\s\S]*background:\s*transparent;/
    );
    expect(editorSource).toMatch(
      /\.markdown-language-picker\s*\{[\s\S]*max-height:[\s\S]*box-shadow:/
    );
  });

  it("预览模式隐藏大纲后不保留右侧空白列", () => {
    expect(editorSource).toContain(
      "previewShell.className = getMarkdownPreviewShellClass(showOutline.value)"
    );
    expect(vditorStyles).toMatch(
      /\.markdown-preview-shell\.has-outline\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)\s+15rem;/
    );
    expect(vditorStyles).toMatch(
      /\.markdown-preview-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\);/
    );
  });

  it("代码行号使用紧凑 gutter，避免左侧出现大块空白", () => {
    expect(codeStyles).toMatch(/flex:\s*0 0 1\.85rem;/);
    expect(codeStyles).toMatch(
      /\.code-line-content\s*\{[\s\S]*padding:\s*0 0\.65rem;/
    );
  });
  it("uses a focused reading width and styles prose primitives", () => {
    expect(contentStyles).toMatch(/width:\s*min\(100%,\s*980px\);/);
    expect(contentStyles).toMatch(/blockquote[\s\S]*border-radius:\s*6px;/);
    expect(contentStyles).toContain("kbd {");
    expect(contentStyles).toContain("mark {");
  });
  it("语言选择器支持搜索、键盘导航并可修改当前代码块", () => {
    expect(editorSource).toContain('role="combobox"');
    expect(editorSource).toContain(
      '@keydown.down.prevent="moveCodeLanguageSelection(1)"'
    );
    expect(editorSource).toContain(
      '@keydown.up.prevent="moveCodeLanguageSelection(-1)"'
    );
    expect(editorSource).toContain("updateMarkdownCodeFenceLanguage(");
    expect(editorSource).toContain("getActiveMarkdownCodeBlockIndex()");
  });
});
