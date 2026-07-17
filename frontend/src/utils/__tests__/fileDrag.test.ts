import { describe, expect, it } from "vitest";

import { isExternalFileDrag } from "../fileDrag";

describe("isExternalFileDrag", () => {
  it("只把浏览器外部文件识别为上传拖拽", () => {
    expect(isExternalFileDrag(["Files"])).toBe(true);
    expect(isExternalFileDrag(["text/plain"])).toBe(false);
    expect(isExternalFileDrag([])).toBe(false);
    expect(isExternalFileDrag(undefined)).toBe(false);
  });
});
