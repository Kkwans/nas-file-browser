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

export function getVideoSourceType(source: string, fallbackPath = "") {
  // The resource path is authoritative; signed/download URLs may end in an
  // endpoint suffix that does not describe the media file.
  const extension = extensionOf(fallbackPath) || extensionOf(source);
  return VIDEO_MIME_TYPES[extension] ?? "";
}
