import type { TaskItem } from "./tasks";
import { fetchJSON, fetchURL } from "./utils";

export interface DuplicateFile {
  path: string;
  size: number;
  modified: number;
}

export interface DuplicateGroup {
  sha256: string;
  size: number;
  totalFiles: number;
  reclaimableBytes: number;
  files: DuplicateFile[];
}

export interface SkippedFile {
  path: string;
  reason: string;
}

export interface DuplicateReport {
  scopes: string[];
  scannedFiles: number;
  scannedBytes: number;
  candidateFiles: number;
  duplicateGroups: number;
  duplicateFiles: number;
  reclaimableBytes: number;
  groups: DuplicateGroup[];
  skippedCount: number;
  skipped?: SkippedFile[];
  truncated: boolean;
  completedAt: number;
  resultFileLimit: number;
}

export async function startDuplicateScan(paths: string[]) {
  const response = await fetchURL("/api/analysis/duplicates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  return (await response.json()) as TaskItem;
}

export function getDuplicateReport(taskId: string) {
  return fetchJSON<DuplicateReport>(
    `/api/analysis/${encodeURIComponent(taskId)}`
  );
}
