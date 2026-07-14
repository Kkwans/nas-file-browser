import type { ViewModeType } from "@/types/user";

export type ListingLayout = "table" | "mobile";

/**
 * The detailed list switches layout from the available listing container,
 * not from the viewport. This keeps the contract correct when the sidebar is
 * resized or a tablet is used in split view.
 */
export function chooseListingLayout(containerWidth: number): ListingLayout {
  return containerWidth >= 900 ? "table" : "mobile";
}

/** The mobile selection bar only exists while selection is actionable. */
export function shouldRenderMobileSelection(
  isMobile: boolean,
  multiple: boolean,
  selectedCount: number
): boolean {
  return isMobile && (multiple || selectedCount > 0);
}

/** A double click on row content opens it; embedded action controls never do. */
export function shouldOpenDetailedRow(isActionControl: boolean): boolean {
  return !isActionControl;
}

export function shouldOpenDetailedRowFromClick(
  clickCount: number,
  singleClickEnabled: boolean,
  multipleSelection: boolean
): boolean {
  return clickCount >= 2 || (singleClickEnabled && !multipleSelection);
}

export interface TapSelectionInput {
  isTouch: boolean;
  multiple: boolean;
  selectedCount: number;
}

/** Keep touch selection additive and prevent a second selection from opening an item. */
export function getTapSelectionBehavior({
  isTouch,
  multiple,
  selectedCount,
}: TapSelectionInput) {
  const preserveExisting = multiple || (isTouch && selectedCount > 0);
  return {
    preserveExisting,
    allowDoubleOpen: !preserveExisting,
  };
}

/**
 * Return a stable grid column count. CSS remains the source of truth for the
 * final width; this helper is only used for responsive state and tests.
 */
export function getGridColumnCount(
  mode: Extract<ViewModeType, "mosaic" | "compact-grid">,
  containerWidth: number
): number {
  if (containerWidth <= 736) return 2;

  const minimumCardWidth = mode === "compact-grid" ? 108 : 180;
  return Math.max(
    2,
    Math.min(6, Math.floor(containerWidth / minimumCardWidth))
  );
}
