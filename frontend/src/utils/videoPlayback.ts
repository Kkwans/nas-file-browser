const KNOWN_INCOMPATIBLE_VIDEO_EXTENSIONS = new Set([
  "mkv",
  "avi",
  "flv",
  "wmv",
  "rm",
  "rmvb",
  // Chromium commonly rejects the QuickTime container before issuing a media
  // request; keep the source detached until the user chooses a playback
  // path instead of leaving the player in an apparent loading state.
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
  const extension = extensionOf(path);
  if (!KNOWN_INCOMPATIBLE_VIDEO_EXTENSIONS.has(extension)) return false;

  // Container support is browser-dependent.  Prefer a direct source when the
  // active browser explicitly advertises support (Firefox and some desktop
  // players can play Matroska/QuickTime without a compatibility artifact).
  // Chromium commonly returns an empty result, so it keeps the safe opt-in
  // compatibility flow for those containers.
  if (typeof document !== "undefined") {
    const mime = VIDEO_MIME_TYPES[extension];
    if (mime) {
      const support = document.createElement("video").canPlayType(mime);
      // A container-only `maybe` is not enough: Chromium reports `maybe` for
      // Matroska even when the actual H.264/AAC tracks cannot be decoded.
      // Without codec metadata we only trust an explicit `probably` result;
      // otherwise the user gets the compatibility path instead of a black
      // player that appears to be loading forever.
      if (/probably/i.test(support)) return false;
    }
  }
  return true;
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

/**
 * The bundled Chromium on some NAS installations deliberately omits the
 * proprietary H.264 decoder.  Video.js then rejects HLS before requesting
 * the playlist, so compatibility playback must use the browser's WebM path.
 */
export function supportsH264CompatibilityPlayback() {
  if (typeof window === "undefined") return true;
  const mediaSource = window.MediaSource;
  if (mediaSource && typeof mediaSource.isTypeSupported === "function") {
    if (
      mediaSource.isTypeSupported(
        'video/mp4; codecs="avc1.4d401f,mp4a.40.2"'
      ) ||
      mediaSource.isTypeSupported('video/mp4; codecs="avc1.4d400d,mp4a.40.2"')
    ) {
      return true;
    }
  }
  const video = document.createElement("video");
  return /maybe|probably/i.test(
    video.canPlayType("application/vnd.apple.mpegurl")
  );
}

/**
 * A growing HLS playlist can expose metadata before it exposes the segment
 * containing a saved position.  Do not call currentTime() until the browser
 * reports that the target is inside its seekable range; otherwise Video.js
 * silently clamps the seek to zero and the resume chip becomes misleading.
 */
export function isPlaybackPositionSeekable(
  position: number,
  seekableStart: number,
  seekableEnd: number,
  duration: number
) {
  if (!Number.isFinite(position) || position < 0) return false;
  if (Number.isFinite(seekableStart) && Number.isFinite(seekableEnd)) {
    return position >= seekableStart && position <= seekableEnd;
  }
  return Number.isFinite(duration) && duration > 0 && position <= duration;
}
