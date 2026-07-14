export const FILE_VIEW_MODES = [
  "mosaic",
  "compact-grid",
  "details",
  "compact-list",
] as const;

export type FileViewMode = (typeof FILE_VIEW_MODES)[number];

export interface FileListingSortItem {
  isDir: boolean;
  name: string;
  type: string;
}

const FILE_TYPE_LABELS: Record<string, string> = {
  md: "Markdown 文件",
  db: "数据库文件",
  json: "JSON 文件",
  js: "JavaScript 文件",
  ts: "TypeScript 文件",
  vue: "Vue 组件文件",
  sh: "Shell 脚本",
  mp4: "视频文件",
  mp3: "音频文件",
  jpg: "JPEG 图片",
  jpeg: "JPEG 图片",
  png: "PNG 图片",
};

export function getFileTypeLabel({
  isDir,
  extension,
}: {
  isDir: boolean;
  extension?: string;
}): string {
  if (isDir) return "文件夹";
  const normalized = extension?.replace(/^\./, "").toLowerCase();
  if (!normalized) return "文件";
  return FILE_TYPE_LABELS[normalized] || `${normalized.toUpperCase()} 文件`;
}

export function normalizeViewMode(value: unknown): FileViewMode {
  if (value === "mosaic gallery") {
    return "details";
  }

  if (value === "list") return "details";
  if (value === "compact") return "compact-list";

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
