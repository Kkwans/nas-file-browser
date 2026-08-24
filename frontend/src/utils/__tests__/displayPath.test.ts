import { describe, expect, it } from "vitest";
import { displayPath } from "@/utils/displayPath";

describe("displayPath", () => {
  it("解码旧客户端保存的 UTF-8 路径", () => {
    expect(displayPath("/tmp/%E6%B5%8B%E8%AF%95.md")).toBe("/tmp/测试.md");
  });

  it("保留普通百分号和无法解码的路径", () => {
    expect(displayPath("/tmp/100%/report.txt")).toBe("/tmp/100%/report.txt");
    expect(displayPath("/tmp/%E6%ZZ.txt")).toBe("/tmp/%E6%ZZ.txt");
  });
});
