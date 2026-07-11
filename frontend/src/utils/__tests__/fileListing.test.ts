import { describe, expect, it } from "vitest";
import {
  normalizeViewMode,
  selectForContextMenu,
  sortItemsByType,
} from "../fileListing";

describe("file listing preferences", () => {
  it("supports the four required file views", () => {
    expect(normalizeViewMode("mosaic")).toBe("mosaic");
    expect(normalizeViewMode("list")).toBe("list");
    expect(normalizeViewMode("details")).toBe("details");
    expect(normalizeViewMode("compact")).toBe("compact");
  });

  it("migrates the legacy gallery preference to details", () => {
    expect(normalizeViewMode("mosaic gallery")).toBe("details");
  });

  it("falls back to the grid view for invalid stored data", () => {
    expect(normalizeViewMode("unknown")).toBe("mosaic");
    expect(normalizeViewMode(null)).toBe("mosaic");
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
