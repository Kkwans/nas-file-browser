import { fetchJSON, fetchURL } from "./utils";

export type TaskType =
  | "trash.clear"
  | "analysis.duplicates"
  | "analysis.storage"
  | "archive.extract";
export type TaskStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled"
  | "interrupted";

export interface TaskItem {
  id: string;
  userId: number;
  ownerName: string;
  type: TaskType;
  title: string;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  totalItems: number;
  processedItems: number;
  totalBytes: number;
  processedBytes: number;
  error?: string;
  retryOf?: string;
}

export function list(): Promise<TaskItem[]> {
  return fetchJSON<TaskItem[]>("/api/tasks");
}

export function get(id: string): Promise<TaskItem> {
  return fetchJSON<TaskItem>(`/api/tasks/${encodeURIComponent(id)}`);
}

async function mutate(id: string, action: "cancel" | "retry") {
  const response = await fetchURL(
    `/api/tasks/${encodeURIComponent(id)}/${action}`,
    { method: "POST" }
  );
  return (await response.json()) as TaskItem;
}

export function cancel(id: string): Promise<TaskItem> {
  return mutate(id, "cancel");
}

export function retry(id: string): Promise<TaskItem> {
  return mutate(id, "retry");
}
