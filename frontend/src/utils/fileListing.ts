export const FILE_VIEW_MODES = [
  "mosaic",
  "list",
  "details",
  "compact",
] as const;

export type FileViewMode = (typeof FILE_VIEW_MODES)[number];

export function normalizeViewMode(value: unknown): FileViewMode {
  if (value === "mosaic gallery") {
    return "details";
  }

  return FILE_VIEW_MODES.includes(value as FileViewMode)
    ? (value as FileViewMode)
    : "mosaic";
}

export function selectForContextMenu(
  selectedIndices: number[],
  targetIndex: number
): number[] {
  return selectedIndices.includes(targetIndex)
    ? selectedIndices
    : [targetIndex];
}
