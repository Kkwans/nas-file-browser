import { describe, expect, it } from "vitest";
import {
  canDropFilePaths,
  fileNameFromPath,
  isExternalFileDrag,
  readFileDragPayload,
  writeFileDragPayload,
} from "../fileDrag";

function transfer() {
  const values = new Map<string, string>();
  return {
    setData(type: string, value: string) {
      values.set(type, value);
    },
    getData(type: string) {
      return values.get(type) ?? "";
    },
    effectAllowed: "none",
  } as unknown as DataTransfer;
}

describe("file drag payload", () => {
  it("keeps canonical paths and supports Chinese names", () => {
    const data = transfer();
    writeFileDragPayload(data, [
      "/volume2/电影/海报.png",
      "/volume2/电影/海报.png",
    ]);
    expect(readFileDragPayload(data)).toEqual(["/volume2/电影/海报.png"]);
    expect(fileNameFromPath("/volume2/电影/海报.png")).toBe("海报.png");
  });

  it("rejects self and descendant targets", () => {
    expect(canDropFilePaths(["/docs"], "/docs")).toBe(false);
    expect(canDropFilePaths(["/docs"], "/docs/archive")).toBe(false);
    expect(canDropFilePaths(["/docs"], "/documents")).toBe(true);
  });

  it("ignores external drops without the internal MIME type", () => {
    expect(readFileDragPayload(transfer())).toEqual([]);
  });

  it("recognizes OS file drops but not this app's internal drags", () => {
    expect(isExternalFileDrag(["Files"])).toBe(true);
    expect(isExternalFileDrag(["text/uri-list"])).toBe(true);
    expect(isExternalFileDrag(["Files", "application/x-nas-file-paths"])).toBe(
      false
    );
    expect(isExternalFileDrag([])).toBe(false);
  });
});
