import { fetchJSON, fetchURL } from "./utils";

export type TransferKind = "upload" | "download";
export type TransferStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "canceled"
  | "interrupted";

export interface TransferItem {
  id: string;
  kind: TransferKind;
  status: TransferStatus;
  name: string;
  target: string;
  bytesTotal?: number;
  bytesTransferred: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
}

export interface TransferListResponse {
  items: TransferItem[];
  total: number;
}

export interface DownloadTransferInput {
  id: string;
  name: string;
  target: string;
  url: string;
  bytesTotal?: number;
}

export interface DownloadTransferResponse {
  item: TransferItem;
  url?: string;
}

export function list(
  kind?: TransferKind,
  signal?: AbortSignal
): Promise<TransferListResponse> {
  const query = kind ? `?kind=${encodeURIComponent(kind)}` : "";
  return fetchJSON<TransferListResponse>(`/api/transfers${query}`, { signal });
}

export async function createDownload(
  input: DownloadTransferInput,
  signal?: AbortSignal
): Promise<DownloadTransferResponse> {
  const response = await fetchURL("/api/transfers/downloads", {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return (await response.json()) as DownloadTransferResponse;
}

export function cancel(id: string): Promise<TransferItem> {
  return fetchJSON<TransferItem>(
    `/api/transfers/${encodeURIComponent(id)}/cancel`,
    { method: "POST" }
  );
}

export async function remove(id: string): Promise<void> {
  await fetchURL(`/api/transfers/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
