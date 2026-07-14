import { describe, expect, it } from "vitest";
import {
  getFileTypeLabel,
  normalizeViewMode,
  selectForContextMenu,
  sortItemsByType,
} from "../fileListing";

describe("file listing preferences", () => {
  it("keeps directory type explicit in the detailed list", () => {
    expect(getFileTypeLabel({ isDir: true })).toBe("文件夹");
    expect(getFileTypeLabel({ isDir: false, extension: ".md" })).toBe(
      "Markdown 文件"
    );
  });
  it("supports the four required file views", () => {
    expect(normalizeViewMode("mosaic")).toBe("mosaic");
    expect(normalizeViewMode("compact-grid")).toBe("compact-grid");
    expect(normalizeViewMode("details")).toBe("details");
    expect(normalizeViewMode("compact-list")).toBe("compact-list");
  });

  it("migrates the legacy gallery preference to details", () => {
    expect(normalizeViewMode("mosaic gallery")).toBe("details");
  });

  it("falls back to the grid view for invalid stored data", () => {
    expect(normalizeViewMode("unknown")).toBe("mosaic");
    expect(normalizeViewMode(null)).toBe("mosaic");
  });

  it("uses four explicit views and migrates removed legacy modes", () => {
    expect(normalizeViewMode("mosaic")).toBe("mosaic");
    expect(normalizeViewMode("compact-grid")).toBe("compact-grid");
    expect(normalizeViewMode("details")).toBe("details");
    expect(normalizeViewMode("compact-list")).toBe("compact-list");
    expect(normalizeViewMode("list")).toBe("details");
    expect(normalizeViewMode("compact")).toBe("compact-list");
  });

  it("selects the right-clicked item without discarding an existing target selection", () => {
    expect(selectForContextMenu([1, 3], 3)).toEqual([1, 3]);
    expect(selectForContextMenu([1, 3], 8)).toEqual([8]);
  });

  it("sorts by directory, type, name, and direction", () => {
    const items = [
      { name: "notes-b.txt", type: "text", isDir: false },
      { name: "photos.png", type: "image", isDir: false },
      { name: "documents", type: "directory", isDir: true },
      { name: "notes-a.txt", type: "text", isDir: false },
    ];

    expect(sortItemsByType(items, true).map((item) => item.name)).toEqual([
      "documents",
      "photos.png",
      "notes-a.txt",
      "notes-b.txt",
    ]);
    expect(sortItemsByType(items, false).map((item) => item.name)).toEqual([
      "documents",
      "notes-b.txt",
      "notes-a.txt",
      "photos.png",
    ]);
  });
});
