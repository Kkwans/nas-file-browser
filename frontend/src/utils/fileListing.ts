export const FILE_VIEW_MODES = [
  "mosaic",
  "list",
  "details",
  "compact",
] as const;

export type FileViewMode = (typeof FILE_VIEW_MODES)[number];

export interface FileListingSortItem {
  isDir: boolean;
  name: string;
  type: string;
}

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

export function sortItemsByType<T extends FileListingSortItem>(
  items: T[],
  ascending: boolean
): T[] {
  return [...items].sort((left, right) => {
    if (left.isDir !== right.isDir) {
      return left.isDir ? -1 : 1;
    }

    const typeComparison = left.type.localeCompare(right.type);
    const comparison =
      typeComparison === 0
        ? left.name.localeCompare(right.name)
        : typeComparison;

    return ascending ? comparison : -comparison;
  });
}
