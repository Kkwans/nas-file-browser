import { describe, expect, it } from "vitest";
import { normalizeViewMode, selectForContextMenu } from "../fileListing";

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
});
