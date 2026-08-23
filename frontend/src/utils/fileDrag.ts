import { normalizeFileKey } from "./fileListing";

export const FILE_DRAG_MIME = "application/x-nas-file-paths";

/**
 * Returns true for files coming from the operating system, not an internal
 * drag created by this application. The listing uses this distinction to keep
 * its upload drop-zone behavior while handling app-to-app moves separately.
 */
export function isExternalFileDrag(
  types?: DataTransfer["types"] | null
): boolean {
  if (!types) return false;
  const values = Array.from(types as ArrayLike<string>);
  return (
    !values.includes(FILE_DRAG_MIME) &&
    (values.includes("Files") || values.includes("text/uri-list"))
  );
}

/** Writes an internal file drag payload without exposing encoded UI routes. */
export function writeFileDragPayload(
  dataTransfer: DataTransfer | null,
  paths: string[]
) {
  if (!dataTransfer) return;
  const normalized = [...new Set(paths.map(normalizeFileKey))];
  if (normalized.length === 0) return;
  dataTransfer.setData(FILE_DRAG_MIME, JSON.stringify(normalized));
  dataTransfer.setData("text/plain", normalized.join("\n"));
  dataTransfer.effectAllowed = "copyMove";
}

/** Reads only the payload created by this app; OS file drops stay uploads. */
export function readFileDragPayload(
  dataTransfer: DataTransfer | null
): string[] {
  if (!dataTransfer) return [];
  const raw = dataTransfer.getData(FILE_DRAG_MIME);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed
          .filter((value): value is string => typeof value === "string")
          .map(normalizeFileKey)
      ),
    ];
  } catch {
    return [];
  }
}

/** A folder cannot receive itself or one of its own descendants. */
export function canDropFilePaths(paths: string[], target: string) {
  const normalizedTarget = normalizeFileKey(target);
  return paths.every((path) => {
    const source = normalizeFileKey(path);
    return (
      source !== normalizedTarget && !normalizedTarget.startsWith(`${source}/`)
    );
  });
}

export function fileNameFromPath(path: string) {
  return normalizeFileKey(path).split("/").at(-1) || "";
}
