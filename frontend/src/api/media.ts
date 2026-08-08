import { fetchJSON, fetchURL } from "./utils";

export interface PlaybackPosition {
  path: string;
  identity: string;
  position: number;
  duration: number;
  updatedAt: number;
  exists: boolean;
}

export interface MediaInformation {
  path: string;
  name: string;
  type: "image" | "video" | "audio";
  extension: string;
  size: number;
  modified: string;
  resolution?: { width: number; height: number };
  format?: string;
  duration?: number;
  bitRate?: number;
  videoCodec?: string;
  audioCodec?: string;
  channels?: number;
  sampleRate?: number;
  title?: string;
  artist?: string;
  album?: string;
  date?: string;
  location?: string;
  technicalError?: string;
}

export type HLSPlaybackState =
  | "queued"
  | "preparing"
  | "streamable"
  | "completed"
  | "failed"
  | "canceled";

export interface HLSPlaybackStatus {
  id: string;
  taskId?: string;
  path: string;
  identity: string;
  profile: string;
  state: HLSPlaybackState;
  error?: string;
  updatedAt: number;
  lastAccessAt?: number;
  sizeBytes?: number;
  playlistUrl?: string;
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

export function getMediaInformation(
  path: string,
  includeLocation = false
): Promise<MediaInformation> {
  const query = new URLSearchParams({ path });
  if (includeLocation) query.set("includeLocation", "true");
  return fetchJSON<MediaInformation>(`/api/media/info?${query.toString()}`);
}

export async function startHLSPlayback(
  path: string
): Promise<HLSPlaybackStatus> {
  const response = await fetchURL("/api/media/hls", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return response.json() as Promise<HLSPlaybackStatus>;
}

export function getHLSPlayback(id: string): Promise<HLSPlaybackStatus> {
  return fetchJSON<HLSPlaybackStatus>(
    `/api/media/hls/${encodeURIComponent(id)}`
  );
}

export async function cancelHLSPlayback(
  id: string
): Promise<HLSPlaybackStatus> {
  const response = await fetchURL(
    `/api/media/hls/${encodeURIComponent(id)}/cancel`,
    { method: "POST" }
  );
  return response.json() as Promise<HLSPlaybackStatus>;
}
