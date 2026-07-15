import { describe, expect, it } from "vitest";

import {
  chooseListingLayout,
  getTapSelectionBehavior,
  getGridColumnCount,
  getListingFieldVisibility,
  isEditableKeyboardTarget,
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

  it("keeps compact grids limited to the visual and file name", () => {
    expect(getListingFieldVisibility("compact-grid")).toEqual({
      quickActions: false,
      tags: false,
      type: false,
      size: false,
      modified: false,
    });

    expect(getListingFieldVisibility("mosaic")).toEqual({
      quickActions: true,
      tags: true,
      type: true,
      size: true,
      modified: true,
    });
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

  it("does not let file shortcuts capture keyboard input from editable controls", () => {
    expect(isEditableKeyboardTarget({ tagName: "INPUT" })).toBe(true);
    expect(isEditableKeyboardTarget({ tagName: "TEXTAREA" })).toBe(true);
    expect(isEditableKeyboardTarget({ isContentEditable: true })).toBe(true);
    expect(isEditableKeyboardTarget({ tagName: "DIV" })).toBe(false);
    expect(isEditableKeyboardTarget(null)).toBe(false);
  });
});
