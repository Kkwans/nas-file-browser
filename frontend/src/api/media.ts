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
