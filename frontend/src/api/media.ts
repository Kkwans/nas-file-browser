import { fetchJSON, fetchURL } from "./utils";

export interface PlaybackPosition {
  path: string;
  identity: string;
  position: number;
  duration: number;
  updatedAt: number;
  exists: boolean;
}

export function getPlayback(path: string): Promise<PlaybackPosition> {
  return fetchJSON<PlaybackPosition>(
    `/api/media/playback?path=${encodeURIComponent(path)}`
  );
}

export async function savePlayback(
  path: string,
  position: number,
  duration: number
): Promise<PlaybackPosition> {
  return fetchJSON<PlaybackPosition>("/api/media/playback", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, position, duration }),
  });
}

export async function clearPlayback(path: string): Promise<void> {
  await fetchURL(`/api/media/playback?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}
