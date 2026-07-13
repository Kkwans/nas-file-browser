import { describe, expect, it } from "vitest";

import {
  chooseListingLayout,
  getGridColumnCount,
  shouldRenderMobileSelection,
} from "../layoutContract";

describe("file listing layout contract", () => {
  it("uses a semantic table only when the listing container is wide enough", () => {
    expect(chooseListingLayout(899)).toBe("mobile");
    expect(chooseListingLayout(900)).toBe("table");
  });

  it("does not render an empty mobile selection bar", () => {
    expect(shouldRenderMobileSelection(true, false, 0)).toBe(false);
    expect(shouldRenderMobileSelection(true, true, 0)).toBe(true);
    expect(shouldRenderMobileSelection(true, false, 2)).toBe(true);
    expect(shouldRenderMobileSelection(false, true, 2)).toBe(false);
  });

  it("keeps detailed grids at two columns on phone widths", () => {
    expect(getGridColumnCount("mosaic", 360)).toBe(2);
    expect(getGridColumnCount("mosaic", 736)).toBe(2);
    expect(getGridColumnCount("mosaic", 1200)).toBeGreaterThanOrEqual(4);
  });
});
