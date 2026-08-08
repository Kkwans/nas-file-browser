import { fetchJSON, fetchURL } from "./utils";

export type TrashStatus = "pending" | "available" | "restoring" | "failed";
export type TrashConflict = "fail" | "keep-both" | "replace" | "skip";

export interface TrashItem {
  id: string;
  userId: number;
  ownerName: string;
  originalPath: string;
  name: string;
  isDir: boolean;
  size: number;
  deletedAt: number;
  status: TrashStatus;
  error?: string;
}

export interface TrashRestoreResult {
  path: string;
  skipped: boolean;
}

export function list(): Promise<TrashItem[]> {
  return fetchJSON<TrashItem[]>("/api/trash");
}

export async function restore(
  id: string,
  conflict: TrashConflict = "fail"
): Promise<TrashRestoreResult> {
  const response = await fetchURL(
    `/api/trash/${encodeURIComponent(id)}/restore`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conflict }),
    }
  );
  return (await response.json()) as TrashRestoreResult;
}

export async function removePermanent(id: string): Promise<void> {
  await fetchURL(`/api/trash/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function clear(): Promise<void> {
  await fetchURL("/api/trash", { method: "DELETE" });
}
