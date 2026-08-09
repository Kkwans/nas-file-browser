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

export interface StorageScope {
  path: string;
  isDir: boolean;
  files: number;
  directories: number;
  bytes: number;
}

export interface StorageFile {
  path: string;
  size: number;
  modified: number;
}

export interface StorageDirectory {
  path: string;
  files: number;
  bytes: number;
}

export interface StorageReport {
  scopes: StorageScope[];
  scannedFiles: number;
  scannedDirectories: number;
  scannedBytes: number;
  largestFiles: StorageFile[];
  largestDirectories: StorageDirectory[];
  skippedCount: number;
  skipped?: SkippedFile[];
  truncated: boolean;
  completedAt: number;
  resultLimit: number;
}

export interface AnalysisRecentMetrics {
  scannedFiles: number;
  scannedDirectories: number;
  scannedBytes: number;
  duplicateGroups: number;
  reclaimableBytes: number;
}

export interface AnalysisRecentItem {
  id: string;
  tool: "duplicates" | "storage";
  status: TaskItem["status"];
  createdAt: number;
  finishedAt?: number;
  scopes: string[];
  processedItems: number;
  totalItems: number;
  error?: string;
  resultReady: boolean;
  metrics?: AnalysisRecentMetrics;
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

export async function startStorageScan(paths: string[]) {
  const response = await fetchURL("/api/analysis/storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paths }),
  });
  return (await response.json()) as TaskItem;
}

export function getStorageReport(taskId: string) {
  return fetchJSON<StorageReport>(
    `/api/analysis/storage/${encodeURIComponent(taskId)}`
  );
}

export function listRecentScans(tool: AnalysisRecentItem["tool"], limit = 5) {
  const query = new URLSearchParams({ tool, limit: String(limit) });
  return fetchJSON<AnalysisRecentItem[]>(`/api/analysis/recent?${query}`);
}
