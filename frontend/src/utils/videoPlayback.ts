const KNOWN_INCOMPATIBLE_VIDEO_EXTENSIONS = new Set([
  "mkv",
  "avi",
  "flv",
  "wmv",
  "rm",
  "rmvb",
  // Chrome on TX5 rejects the QuickTime container before issuing a media
  // request; show the explicit compatibility-playback action instead of
  // leaving the player in an apparent loading state.
  "mov",
]);

const VIDEO_MIME_TYPES: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogg: "video/ogg",
  ogv: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  wmv: "video/x-ms-wmv",
  flv: "video/x-flv",
  rm: "application/vnd.rn-realmedia",
  rmvb: "application/vnd.rn-realmedia-vbr",
  ts: "video/mp2t",
  m2ts: "video/mp2t",
  "3gp": "video/3gpp",
};

const VIDEO_CODEC_PREFLIGHT_EXTENSIONS = new Set(["mp4", "m4v"]);
const DEFINITELY_UNSUPPORTED_BROWSER_CODECS = new Set([
  "hevc",
  "h265",
  "x265",
  "mpeg2video",
  "mpeg2",
  "mpeg1video",
  "mpeg1",
  "vc1",
  "wmv1",
  "wmv2",
  "wmv3",
  "rv10",
  "rv20",
  "rv30",
  "rv40",
  "realvideo",
]);

function extensionOf(value: string) {
  const path = value.split("?", 1)[0].split("#", 1)[0];
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const separator = fileName.lastIndexOf(".");
  if (separator < 0 || separator === fileName.length - 1) return "";
  return fileName.slice(separator + 1).toLowerCase();
}

export function isKnownIncompatibleVideo(path: string) {
  return KNOWN_INCOMPATIBLE_VIDEO_EXTENSIONS.has(extensionOf(path));
}

/**
 * MP4/M4V can contain codecs that look browser-friendly from the extension
 * alone (for example HEVC). Probe those containers before attaching the raw
 * source so Chromium does not read megabytes of an unplayable file first.
 */
export function shouldPreflightVideoCodec(path: string) {
  return VIDEO_CODEC_PREFLIGHT_EXTENSIONS.has(extensionOf(path));
}

function normalizeCodec(codec?: string) {
  return (
    codec
      ?.trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") ?? ""
  );
}

export function isDefinitelyUnsupportedVideoCodec(codec?: string) {
  const normalized = normalizeCodec(codec);
  return (
    normalized.length > 0 &&
    DEFINITELY_UNSUPPORTED_BROWSER_CODECS.has(normalized)
  );
}

export function getVideoSourceType(source: string, fallbackPath = "") {
  // The resource path is authoritative; signed/download URLs may end in an
  // endpoint suffix that does not describe the media file.
  const extension = extensionOf(fallbackPath) || extensionOf(source);
  return VIDEO_MIME_TYPES[extension] ?? "";
}
