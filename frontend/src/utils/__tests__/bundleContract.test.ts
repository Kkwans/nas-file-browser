import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const themeSource = readFileSync(
  fileURLToPath(new URL("../theme.ts", import.meta.url)),
  "utf8"
);
const editorSource = readFileSync(
  fileURLToPath(new URL("../../views/files/Editor.vue", import.meta.url)),
  "utf8"
);

describe("前端拆包契约", () => {
  it("全局主题工具不引入 Ace，编辑器按需加载编辑器主题", () => {
    expect(themeSource).not.toContain("ace-builds");
    expect(themeSource).not.toContain("getEditorTheme");
    expect(editorSource).toContain('from "@/utils/editorTheme"');
  });
});
