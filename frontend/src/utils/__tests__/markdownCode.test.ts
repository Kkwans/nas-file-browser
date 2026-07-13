import { describe, expect, it } from "vitest";
import {
  createMarkdownCodeFence,
  getMarkdownLineNumberStorageKey,
  inferMarkdownCodeLanguage,
  resolveMarkdownCodeLanguage,
  wrapMarkdownCodeLines,
} from "../markdownCode";

describe("Markdown 代码块契约", () => {
  it("优先使用围栏声明的语言并规范常见别名", () => {
    expect(resolveMarkdownCodeLanguage("language-js", "const value = 1;")).toBe(
      "javascript"
    );
    expect(resolveMarkdownCodeLanguage("lang-sh", "echo hello")).toBe("bash");
  });

  it("只对受控语言做自动识别，未知语言安全降级", () => {
    expect(
      inferMarkdownCodeLanguage("public class Demo { }\nSystem.out.println();")
    ).toBe("java");
    expect(
      inferMarkdownCodeLanguage("some completely unknown syntax $$$")
    ).toBe(null);
    expect(
      resolveMarkdownCodeLanguage("language-not-real", "const value = 1;")
    ).toBe(null);
  });

  it("行号关闭时不创建 gutter，开启时每一行只包装一次", () => {
    const source = "第一行\n第二行\n第三行\n";
    expect(wrapMarkdownCodeLines(source, false)).toEqual({
      html: source.slice(0, -1),
      hasLineNumbers: false,
    });
    const withLineNumbers = wrapMarkdownCodeLines("a\nb\nc", true);
    expect(withLineNumbers.hasLineNumbers).toBe(true);
    expect(withLineNumbers.html.match(/class=\"code-line\"/g)).toHaveLength(3);
  });

  it("按用户 ID 隔离行号偏好，访客使用固定命名空间", () => {
    expect(getMarkdownLineNumberStorageKey("42")).toBe(
      "nas-file-browser:markdown-line-numbers:42"
    );
    expect(getMarkdownLineNumberStorageKey(null)).toBe(
      "nas-file-browser:markdown-line-numbers:guest"
    );
  });

  it("语言选择器写回可复现的 Markdown 围栏", () => {
    expect(createMarkdownCodeFence("JavaScript")).toBe(
      "```javascript\n\n```\n"
    );
    expect(createMarkdownCodeFence("unknown-language")).toBe("```\n\n```\n");
  });
});
