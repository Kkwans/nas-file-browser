import { describe, expect, it } from "vitest";

import {
  chooseListingLayout,
  getTapSelectionBehavior,
  getGridColumnCount,
  shouldOpenDetailedRow,
  shouldOpenDetailedRowFromClick,
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

  it("keeps prior selections when a touch user taps another item", () => {
    expect(
      getTapSelectionBehavior({
        isTouch: true,
        multiple: false,
        selectedCount: 1,
      })
    ).toEqual({ preserveExisting: true, allowDoubleOpen: false });

    expect(
      getTapSelectionBehavior({
        isTouch: true,
        multiple: false,
        selectedCount: 0,
      })
    ).toEqual({ preserveExisting: false, allowDoubleOpen: true });

    expect(
      getTapSelectionBehavior({
        isTouch: false,
        multiple: false,
        selectedCount: 1,
      })
    ).toEqual({ preserveExisting: false, allowDoubleOpen: true });
  });

  it("opens a detailed row from its content but never from an action button", () => {
    expect(shouldOpenDetailedRow(false)).toBe(true);
    expect(shouldOpenDetailedRow(true)).toBe(false);
  });

  it("opens on the second click even when selection state updates between clicks", () => {
    expect(shouldOpenDetailedRowFromClick(2, false, false)).toBe(true);
    expect(shouldOpenDetailedRowFromClick(1, true, false)).toBe(true);
    expect(shouldOpenDetailedRowFromClick(1, true, true)).toBe(false);
    expect(shouldOpenDetailedRowFromClick(1, false, false)).toBe(false);
  });
});
