import { describe, expect, it } from "vitest";
import { normalizeTagPath } from "../tagPath";

describe("normalizeTagPath", () => {
  it("removes the UI files prefix and trailing slash", () => {
    expect(normalizeTagPath("/files/volume2/Project/")).toBe(
      "/volume2/Project"
    );
  });

  it("decodes URL encoded path segments", () => {
    expect(
      normalizeTagPath("/volume2/%E6%B5%8B%E8%AF%95/%E6%96%87%E4%BB%B6")
    ).toBe("/volume2/测试/文件");
  });

  it("keeps malformed segments displayable", () => {
    expect(normalizeTagPath("/volume2/%E6%B5%8B%")).toBe("/volume2/%E6%B5%8B%");
  });
});
