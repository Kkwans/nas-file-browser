import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

describe("标签控件无障碍契约", () => {
  it("标签选择器的图标按钮提供可访问名称", () => {
    const source = readSource("components/TagPicker.vue");

    expect(source).toContain('aria-label="管理标签"');
    expect(source).toContain('aria-label="关闭"');
    expect(source).toContain(':aria-pressed="isAssigned(tag.id)"');
  });

  it("标签管理器的图标按钮提供可访问名称", () => {
    const source = readSource("components/TagManager.vue");

    for (const label of ["关闭", "编辑标签", "删除标签", "保存", "取消"]) {
      expect(source).toContain(`aria-label="${label}"`);
    }
  });
});
