import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const editorSource = readFileSync(
  resolve(process.cwd(), "frontend/src/views/files/Editor.vue"),
  "utf8"
);

describe("Markdown 编辑器交互契约", () => {
  it("默认使用类似 Typora 的即时渲染模式", () => {
    expect(editorSource).toContain(
      'const currentMode = ref<MarkdownMode>("ir")'
    );
    expect(editorSource).toContain('initVditorWithMode(content, "ir")');
    expect(editorSource).not.toContain("switchMode('wysiwyg')");
  });

  it("代码语言选择器使用顶部下拉面板而不是居中模态框", () => {
    expect(editorSource).toMatch(
      /\.markdown-language-picker-backdrop\s*\{[\s\S]*place-items:\s*start end;[\s\S]*background:\s*transparent;/
    );
    expect(editorSource).toMatch(
      /\.markdown-language-picker\s*\{[\s\S]*max-height:[\s\S]*box-shadow:/
    );
  });
});
