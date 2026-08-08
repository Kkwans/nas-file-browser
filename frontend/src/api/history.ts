import { fetchJSON } from "./utils";

export type HistoryStatus = "success" | "failed" | "submitted";

export interface HistoryEntry {
  id: string;
  action: string;
  target: string;
  detail?: string;
  status: HistoryStatus;
  createdAt: number;
}

export function list(limit = 500): Promise<HistoryEntry[]> {
  return fetchJSON<HistoryEntry[]>(`/api/history?limit=${limit}`);
}
