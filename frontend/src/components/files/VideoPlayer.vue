<template>
  <div
    ref="stage"
    class="media-video-stage"
    :style="{ '--video-brightness': brightness }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
  >
    <video
      ref="videoPlayer"
      class="video-max video-js vjs-big-play-centered"
      controls
      playsinline
      preload="metadata"
    >
      <source />
      <track
        v-for="(sub, index) in subtitles"
        :key="index"
        kind="subtitles"
        :src="sub"
        :label="subLabel(sub)"
        :default="index === 0"
      />
      <p class="vjs-no-js">
        您的浏览器不支持嵌入式视频播放。
        <a :href="source">下载视频</a>
      </p>
    </video>

    <div v-if="gestureHud" class="media-gesture-hud" role="status">
      <i class="material-icons">{{ gestureHud.icon }}</i>
      <strong>{{ gestureHud.value }}</strong>
      <span>{{ gestureHud.label }}</span>
    </div>

    <div
      v-if="restoredPosition > 0"
      class="media-resume-chip"
      role="status"
      @pointerdown.stop
    >
      <i class="material-icons">history</i>
      <span>已从 {{ formatMediaTime(restoredPosition) }} 继续</span>
      <button type="button" @click.stop="restartFromBeginning">从头播放</button>
    </div>

    <div v-if="progressMessage" class="media-progress-message" role="status">
      {{ progressMessage }}
    </div>

    <button
      v-if="showCompatibilityBadge"
      type="button"
      class="media-compatibility-badge"
      @pointerdown.stop
      @click.stop="compatibilityPanelOpen = true"
    >
      <i class="material-icons" aria-hidden="true">movie_filter</i>
      <span>{{ compatibilityBadgeLabel }}</span>
      <i
        class="material-icons media-compatibility-badge__arrow"
        aria-hidden="true"
        >expand_less</i
      >
    </button>

    <section
      v-if="compatibilityPanelOpen"
      class="media-compatibility-card"
      :class="`media-compatibility-card--${compatibilityState}`"
      aria-live="polite"
      @pointerdown.stop
      @pointermove.stop
      @pointerup.stop
    >
      <div class="media-compatibility-card__icon" aria-hidden="true">
        <i class="material-icons">{{ compatibilityCopy.icon }}</i>
      </div>
      <div class="media-compatibility-card__body">
        <div class="media-compatibility-card__heading">
          <div>
            <span>兼容播放</span>
            <strong>{{ compatibilityCopy.title }}</strong>
          </div>
          <button
            type="button"
            class="media-compatibility-card__close"
            aria-label="收起兼容播放状态"
            @click.stop="compatibilityPanelOpen = false"
          >
            <i class="material-icons" aria-hidden="true">close</i>
          </button>
        </div>
        <p>{{ compatibilityCopy.description }}</p>
        <small v-if="compatibilityNetworkError" role="alert">
          <i class="material-icons" aria-hidden="true">cloud_off</i>
          {{ compatibilityNetworkError }}
        </small>
        <div class="media-compatibility-card__actions">
          <button
            v-if="canStartCompatibility"
            type="button"
            class="media-compatibility-action media-compatibility-action--primary"
            :disabled="compatibilityBusy"
            @click.stop="startCompatibilityPlayback"
          >
            <i class="material-icons" aria-hidden="true">movie_filter</i>
            {{ compatibilityBusy ? "正在提交…" : compatibilityStartLabel }}
          </button>
          <button
            v-if="canCancelCompatibility"
            type="button"
            class="media-compatibility-action"
            :disabled="compatibilityBusy"
            @click.stop="cancelCompatibilityPlayback"
          >
            <i class="material-icons" aria-hidden="true">stop_circle</i>
            {{ compatibilityBusy ? "正在取消…" : "取消任务" }}
          </button>
          <button
            v-if="canActivateCompatibility"
            type="button"
            class="media-compatibility-action media-compatibility-action--primary"
            @click.stop="useCompatibilityPlayback"
          >
            <i class="material-icons" aria-hidden="true">play_circle</i>
            使用兼容版本
          </button>
          <a
            v-if="showCompatibilityFallbacks"
            class="media-compatibility-action"
            :href="downloadFallbackSource"
            download
          >
            <i class="material-icons" aria-hidden="true">download</i>
            下载原文件
          </a>
          <a
            v-if="showCompatibilityFallbacks"
            class="media-compatibility-action"
            :href="directFallbackSource"
            target="_blank"
            rel="noopener"
          >
            <i class="material-icons" aria-hidden="true">open_in_new</i>
            直接打开
          </a>
          <button
            v-if="hlsActive"
            type="button"
            class="media-compatibility-action"
            @click.stop="tryDirectPlayback"
          >
            <i class="material-icons" aria-hidden="true">undo</i>
            返回原视频
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { media as mediaApi } from "@/api";
import {
  clampMediaValue,
  detectVideoGestureAxis,
  formatMediaTime,
  seekFromDoubleTap,
  seekFromSwipe,
  type VideoGestureAxis,
} from "@/utils/videoGestures";
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import type { HLSPlaybackState, HLSPlaybackStatus } from "@/api/media";
import "videojs-hotkeys";
import "video.js/dist/video-js.min.css";

const props = withDefaults(
  defineProps<{
    path: string;
    source: string;
    downloadSource?: string;
    directSource?: string;
    subtitles?: string[];
    options?: Record<string, unknown>;
  }>(),
  {
    subtitles: () => [],
    options: () => ({}),
    downloadSource: "",
    directSource: "",
  }
);

const videoPlayer = ref<HTMLVideoElement | null>(null);
const stage = ref<HTMLDivElement | null>(null);
const player = ref<Player | null>(null);
const brightness = ref(1);
const restoredPosition = ref(0);
const progressMessage = ref("");
const compatibilityPanelOpen = ref(isKnownIncompatibleVideo(props.path));
const compatibilityBusy = ref(false);
const compatibilityNetworkError = ref("");
const compatibilityStatus = ref<HLSPlaybackStatus | null>(null);
const directPlaybackFailed = ref(false);
const hlsActive = ref(false);
const gestureHud = ref<{
  icon: string;
  value: string;
  label: string;
} | null>(null);

let disposed = false;
let progressRequest = 0;
let lastSavedAt = 0;
let lastSavedPosition = -1;
let suppressPersistenceUntil = 0;
let messageTimer: number | null = null;
let hudTimer: number | null = null;
let tapTimer: number | null = null;
let lastTap = 0;
let compatibilityPollTimer: number | null = null;
let compatibilityRequest = 0;
let activeHLSURL = "";
let gesture:
  | {
      pointerId: number;
      startX: number;
      startY: number;
      startPosition: number;
      startVolume: number;
      startBrightness: number;
      axis: VideoGestureAxis | null;
    }
  | undefined;

nextTick(initVideoPlayer);

watch(
  () => [props.path, props.source] as const,
  ([nextPath, nextSource], previous) => {
    if (!player.value || !previous) return;
    void persistPlayback(true, previous[0]);
    restoredPosition.value = 0;
    brightness.value = 1;
    suppressPersistenceUntil = 0;
    resetCompatibility(nextPath);
    player.value.src({ src: nextSource, type: getSourceType(nextSource) });
    player.value.load();
    void restorePlayback(nextPath);
  }
);

onBeforeUnmount(() => {
  disposed = true;
  void persistPlayback(true);
  if (messageTimer) window.clearTimeout(messageTimer);
  if (hudTimer) window.clearTimeout(hudTimer);
  if (tapTimer) window.clearTimeout(tapTimer);
  stopCompatibilityPolling();
  compatibilityRequest++;
  player.value?.dispose();
  player.value = null;
});

async function initVideoPlayer() {
  try {
    const lang = document.documentElement.lang;
    const languagePack = await (
      languageImports[lang] || languageImports.en
    )?.();
    if (disposed || !videoPlayer.value) return;
    const code = languageImports[lang] ? lang : "en";
    videojs.addLanguage(code, languagePack.default);
    player.value = videojs(
      videoPlayer.value,
      getOptions(
        props.options,
        { language: code },
        { sources: { src: props.source, type: getSourceType(props.source) } },
        { playbackRates: [0.5, 1, 1.5, 2, 2.5, 3] }
      )
    );
    player.value.on("timeupdate", onTimeUpdate);
    player.value.on("pause", () => void persistPlayback(true));
    player.value.on("seeked", () => void persistPlayback(true));
    player.value.on("ended", () => void persistPlayback(true));
    player.value.on("error", onPlayerError);
    player.value.on("playing", onPlayerPlaying);
    await restorePlayback(props.path);
  } catch (error) {
    console.error("Error initializing video player:", error);
    showProgressMessage("视频播放器初始化失败");
  }
}

function getOptions(...sources: Record<string, unknown>[]) {
  const options = {
    controlBar: {
      skipButtons: { forward: 10, backward: 10 },
    },
    html5: { nativeTextTracks: false },
    plugins: {
      hotkeys: {
        volumeStep: 0.1,
        seekStep: 10,
        enableModifiersForNumbers: false,
      },
    },
  };
  return videojs.obj.merge(options, ...sources);
}

async function restorePlayback(path: string) {
  const request = ++progressRequest;
  try {
    const saved = await mediaApi.getPlayback(path);
    if (request !== progressRequest || path !== props.path || !saved.exists)
      return;
    restoredPosition.value = saved.position;
    const apply = () => {
      if (!player.value || request !== progressRequest) return;
      player.value.currentTime(saved.position);
      lastSavedPosition = saved.position;
    };
    if ((player.value?.readyState() ?? 0) >= 1) apply();
    else player.value?.one("loadedmetadata", apply);
  } catch {
    showProgressMessage("续播位置暂时无法读取");
  }
}

const compatibilityState = computed<HLSPlaybackState | "idle" | "error">(() => {
  if (compatibilityStatus.value) return compatibilityStatus.value.state;
  if (compatibilityNetworkError.value) return "error";
  return "idle";
});

const compatibilityCopy = computed(() => {
  const status = compatibilityStatus.value;
  switch (compatibilityState.value) {
    case "queued":
      return {
        icon: "hourglass_top",
        title: "已加入低并发队列",
        description:
          "NAS 会优先响应文件浏览和缩略图；轮到此视频后再生成首个可播放分段。",
      };
    case "preparing":
      return {
        icon: "movie_edit",
        title: "正在准备首个分段",
        description:
          "FFmpeg 正以低资源配置转换视频。可以离开此页，真实任务状态会保留在任务中心。",
      };
    case "streamable":
      return {
        icon: "play_circle",
        title: "首个分段已就绪",
        description: "播放器正在切换到兼容版本，后台会继续完成剩余分段。",
      };
    case "completed":
      return {
        icon: "offline_pin",
        title: "兼容版本已缓存",
        description: status?.sizeBytes
          ? `本次产物占用 ${formatCacheSize(status.sizeBytes)}，再次打开同一文件可直接复用。`
          : "转换已经完成，再次打开同一文件可直接复用缓存。",
      };
    case "failed":
      return {
        icon: "error_outline",
        title: "兼容播放准备失败",
        description:
          status?.error ||
          "FFmpeg 未能生成可播放分段，可下载后使用本地播放器。",
      };
    case "canceled":
      return {
        icon: "cancel",
        title: "兼容播放已取消",
        description: "原视频没有被修改；需要时可以重新创建兼容播放任务。",
      };
    case "error":
      return {
        icon: "cloud_off",
        title: "暂时无法读取任务状态",
        description:
          "网络恢复后可重新尝试；已提交的后台任务不会因此被自动取消。",
      };
    default:
      return {
        icon: "movie_filter",
        title: directPlaybackFailed.value
          ? "当前格式无法直接播放"
          : "此格式可能需要兼容播放",
        description:
          "只在你点击后，NAS 才会按需转换为 H.264/AAC 分段；不会自动转码其他视频。",
      };
  }
});

const canStartCompatibility = computed(
  () =>
    !compatibilityStatus.value ||
    compatibilityStatus.value.state === "failed" ||
    compatibilityStatus.value.state === "canceled"
);

const canCancelCompatibility = computed(() =>
  ["queued", "preparing", "streamable"].includes(
    compatibilityStatus.value?.state ?? ""
  )
);

const canActivateCompatibility = computed(
  () =>
    !hlsActive.value &&
    Boolean(compatibilityStatus.value?.playlistUrl) &&
    (compatibilityStatus.value?.state === "streamable" ||
      compatibilityStatus.value?.state === "completed")
);

const showCompatibilityFallbacks = computed(
  () =>
    directPlaybackFailed.value || compatibilityStatus.value?.state === "failed"
);

const showCompatibilityBadge = computed(
  () =>
    !compatibilityPanelOpen.value &&
    Boolean(compatibilityStatus.value || hlsActive.value)
);

const compatibilityBadgeLabel = computed(() => {
  if (compatibilityStatus.value?.state === "completed") return "兼容版本已缓存";
  if (compatibilityStatus.value?.state === "failed") return "兼容播放失败";
  if (compatibilityStatus.value?.state === "canceled") return "兼容播放已取消";
  if (hlsActive.value) return "正在使用兼容播放";
  return "兼容播放准备中";
});

const compatibilityStartLabel = computed(() =>
  compatibilityStatus.value?.state === "failed" ||
  compatibilityStatus.value?.state === "canceled"
    ? "重新准备"
    : "启动兼容播放"
);

const downloadFallbackSource = computed(
  () => props.downloadSource || props.source
);
const directFallbackSource = computed(() => props.directSource || props.source);

function onPlayerError() {
  if (hlsActive.value) {
    compatibilityNetworkError.value = "兼容视频流暂时中断，可重试或下载原文件";
  } else {
    directPlaybackFailed.value = true;
  }
  compatibilityPanelOpen.value = true;
}

function onPlayerPlaying() {
  if (!hlsActive.value) return;
  compatibilityNetworkError.value = "";
  compatibilityPanelOpen.value = false;
}

async function startCompatibilityPlayback() {
  if (compatibilityBusy.value) return;
  compatibilityBusy.value = true;
  compatibilityNetworkError.value = "";
  compatibilityPanelOpen.value = true;
  const request = ++compatibilityRequest;
  stopCompatibilityPolling();
  try {
    const status = await mediaApi.startHLSPlayback(props.path);
    if (disposed || request !== compatibilityRequest) return;
    applyCompatibilityStatus(status, request);
  } catch (error) {
    if (request === compatibilityRequest) {
      compatibilityNetworkError.value = errorMessage(error);
    }
  } finally {
    if (request === compatibilityRequest) compatibilityBusy.value = false;
  }
}

async function cancelCompatibilityPlayback() {
  const id = compatibilityStatus.value?.id;
  if (!id || compatibilityBusy.value) return;
  compatibilityBusy.value = true;
  compatibilityNetworkError.value = "";
  const request = compatibilityRequest;
  try {
    const status = await mediaApi.cancelHLSPlayback(id);
    if (disposed || request !== compatibilityRequest) return;
    applyCompatibilityStatus(status, request);
  } catch (error) {
    if (request === compatibilityRequest) {
      compatibilityNetworkError.value = errorMessage(error);
    }
  } finally {
    if (request === compatibilityRequest) compatibilityBusy.value = false;
  }
}

function applyCompatibilityStatus(status: HLSPlaybackStatus, request: number) {
  compatibilityStatus.value = status;
  compatibilityNetworkError.value = "";
  if (
    status.playlistUrl &&
    (status.state === "streamable" || status.state === "completed")
  ) {
    activateHLSPlayback(status.playlistUrl);
  }
  if (["queued", "preparing", "streamable"].includes(status.state)) {
    scheduleCompatibilityPoll(status.id, request);
  } else {
    stopCompatibilityPolling();
    if (status.state === "failed" || status.state === "canceled") {
      compatibilityPanelOpen.value = true;
    }
  }
}

function scheduleCompatibilityPoll(id: string, request: number) {
  stopCompatibilityPolling();
  compatibilityPollTimer = window.setTimeout(
    () => void pollCompatibilityStatus(id, request),
    750
  );
}

async function pollCompatibilityStatus(id: string, request: number) {
  try {
    const status = await mediaApi.getHLSPlayback(id);
    if (disposed || request !== compatibilityRequest) return;
    applyCompatibilityStatus(status, request);
  } catch (error) {
    if (disposed || request !== compatibilityRequest) return;
    compatibilityNetworkError.value = errorMessage(error);
    scheduleCompatibilityPoll(id, request);
  }
}

function stopCompatibilityPolling() {
  if (compatibilityPollTimer !== null) {
    window.clearTimeout(compatibilityPollTimer);
    compatibilityPollTimer = null;
  }
}

function activateHLSPlayback(playlistURL: string) {
  const currentPlayer = player.value;
  if (!currentPlayer || activeHLSURL === playlistURL) return;
  const resumeAt = Math.max(
    currentPlayer.currentTime() || 0,
    restoredPosition.value,
    lastSavedPosition
  );
  activeHLSURL = playlistURL;
  hlsActive.value = true;
  currentPlayer.src({ src: playlistURL, type: "application/x-mpegURL" });
  currentPlayer.one("loadedmetadata", () => {
    if (resumeAt > 0) currentPlayer.currentTime(resumeAt);
  });
  // player.src() already creates and loads the VHS tech. Calling load() here
  // resets the new MediaSource before VHS finishes its EME-ready handshake,
  // leaving decoded segments queued without ever appending them.
  const playback = currentPlayer.play();
  if (playback && typeof playback.catch === "function") {
    void playback.catch(() => {
      // Browser autoplay policy may require one more explicit tap.
    });
  }
}

function tryDirectPlayback() {
  const currentPlayer = player.value;
  if (!currentPlayer) return;
  activeHLSURL = "";
  hlsActive.value = false;
  directPlaybackFailed.value = false;
  compatibilityNetworkError.value = "";
  currentPlayer.src({ src: props.source, type: getSourceType(props.source) });
  currentPlayer.load();
  compatibilityPanelOpen.value = false;
}

function useCompatibilityPlayback() {
  const playlistURL = compatibilityStatus.value?.playlistUrl;
  if (!playlistURL) return;
  activateHLSPlayback(playlistURL);
}

function resetCompatibility(path: string) {
  compatibilityRequest++;
  stopCompatibilityPolling();
  compatibilityBusy.value = false;
  compatibilityNetworkError.value = "";
  compatibilityStatus.value = null;
  directPlaybackFailed.value = false;
  hlsActive.value = false;
  activeHLSURL = "";
  compatibilityPanelOpen.value = isKnownIncompatibleVideo(path);
}

function isKnownIncompatibleVideo(path: string) {
  const extension = path.split("?")[0].split(".").pop()?.toLowerCase();
  return Boolean(
    extension && ["mkv", "avi", "flv", "wmv", "rm", "rmvb"].includes(extension)
  );
}

function formatCacheSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function onTimeUpdate() {
  if (Date.now() - lastSavedAt >= 2000) void persistPlayback(false);
}

async function persistPlayback(force: boolean, path = props.path) {
  const currentPlayer = player.value;
  if (!currentPlayer || !path || Date.now() < suppressPersistenceUntil) return;
  const position = currentPlayer.currentTime();
  const duration = currentPlayer.duration();
  if (
    typeof position !== "number" ||
    !Number.isFinite(position) ||
    position < 0 ||
    typeof duration !== "number" ||
    !Number.isFinite(duration) ||
    duration < 0
  ) {
    return;
  }
  if (!force && Math.abs(position - lastSavedPosition) < 0.5) return;
  lastSavedAt = Date.now();
  lastSavedPosition = position;
  try {
    await mediaApi.savePlayback(path, position, duration);
  } catch {
    if (force && !disposed) showProgressMessage("播放位置暂时无法保存");
  }
}

async function restartFromBeginning() {
  restoredPosition.value = 0;
  lastSavedPosition = 0;
  suppressPersistenceUntil = Date.now() + 1000;
  player.value?.currentTime(0);
  try {
    await mediaApi.clearPlayback(props.path);
    showProgressMessage("已清除续播位置");
  } catch {
    showProgressMessage("续播位置清除失败");
  }
}

function showProgressMessage(message: string) {
  progressMessage.value = message;
  if (messageTimer) window.clearTimeout(messageTimer);
  messageTimer = window.setTimeout(() => {
    progressMessage.value = "";
  }, 2400);
}

function showGestureHud(icon: string, value: string, label: string) {
  gestureHud.value = { icon, value, label };
  if (hudTimer) window.clearTimeout(hudTimer);
  hudTimer = window.setTimeout(() => {
    gestureHud.value = null;
  }, 650);
}

function isControlTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(".vjs-control"));
}

function onPointerDown(event: PointerEvent) {
  if (event.pointerType === "mouse" || isControlTarget(event.target)) return;
  const currentPlayer = player.value;
  if (!currentPlayer || !stage.value) return;
  stage.value.setPointerCapture(event.pointerId);
  gesture = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startPosition: currentPlayer.currentTime() ?? 0,
    startVolume: currentPlayer.volume() ?? 1,
    startBrightness: brightness.value,
    axis: null,
  };
}

function onPointerMove(event: PointerEvent) {
  if (!gesture || gesture.pointerId !== event.pointerId || !stage.value) return;
  const currentPlayer = player.value;
  if (!currentPlayer) return;
  const rect = stage.value.getBoundingClientRect();
  const deltaX = event.clientX - gesture.startX;
  const deltaY = event.clientY - gesture.startY;
  gesture.axis ??= detectVideoGestureAxis(
    deltaX,
    deltaY,
    gesture.startX - rect.left,
    rect.width
  );
  if (!gesture.axis) return;
  if (event.cancelable) event.preventDefault();

  if (gesture.axis === "seek") {
    const duration = currentPlayer.duration() ?? 0;
    const next = seekFromSwipe(
      gesture.startPosition,
      deltaX,
      rect.width,
      duration
    );
    currentPlayer.currentTime(next);
    showGestureHud("swap_horiz", formatMediaTime(next), "播放进度");
    return;
  }
  const delta = -deltaY / Math.max(rect.height, 1);
  if (gesture.axis === "brightness") {
    brightness.value = clampMediaValue(
      gesture.startBrightness + delta,
      0.4,
      1.6
    );
    showGestureHud(
      "brightness_6",
      `${Math.round(brightness.value * 100)}%`,
      "视频画面亮度"
    );
    return;
  }
  const volume = clampMediaValue(gesture.startVolume + delta, 0, 1);
  currentPlayer.volume(volume);
  showGestureHud(
    volume === 0 ? "volume_off" : "volume_up",
    `${Math.round(volume * 100)}%`,
    "音量"
  );
}

function onPointerUp(event: PointerEvent) {
  if (!gesture || gesture.pointerId !== event.pointerId || !stage.value) return;
  const completed = gesture;
  gesture = undefined;
  if (completed.axis) {
    if (completed.axis === "seek") void persistPlayback(true);
    return;
  }
  const now = Date.now();
  const rect = stage.value.getBoundingClientRect();
  if (now - lastTap <= 280) {
    lastTap = 0;
    if (tapTimer) window.clearTimeout(tapTimer);
    tapTimer = null;
    const current = player.value?.currentTime() ?? 0;
    const duration = player.value?.duration() ?? 0;
    const next = seekFromDoubleTap(
      current,
      event.clientX - rect.left,
      rect.width,
      duration
    );
    player.value?.currentTime(next);
    const forward = event.clientX - rect.left >= rect.width / 2;
    showGestureHud(
      forward ? "forward_10" : "replay_10",
      forward ? "+10 秒" : "-10 秒",
      formatMediaTime(next)
    );
    void persistPlayback(true);
    return;
  }
  lastTap = now;
  tapTimer = window.setTimeout(() => {
    const active = player.value?.userActive();
    player.value?.userActive(!active);
    tapTimer = null;
  }, 240);
}

function onPointerCancel() {
  gesture = undefined;
}

function getSourceType(source: string) {
  const extension = source ? source.split("?")[0].split(".").pop() : "";
  if (extension?.toLowerCase() === "mkv") return "video/mp4";
  return "";
}

function subLabel(subUrl: string) {
  let parsed: URL;
  try {
    parsed = new URL(subUrl);
  } catch {
    parsed = new URL(subUrl, window.location.origin);
  }
  return decodeURIComponent(
    parsed.pathname
      .split("/")
      .pop()!
      .replace(/\.[^/.]+$/, "")
  );
}

interface LanguageImports {
  [key: string]: () => Promise<any>;
}

const languageImports: LanguageImports = {
  en: () => import("video.js/dist/lang/en.json"),
  "zh-cn": () => import("video.js/dist/lang/zh-CN.json"),
};
</script>

<style scoped>
.media-video-stage {
  --video-brightness: 1;
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #05070b;
  touch-action: none;
}

.video-max {
  width: 100%;
  height: 100%;
}

.media-video-stage :deep(.vjs-tech) {
  filter: brightness(var(--video-brightness));
  transition: filter 120ms ease-out;
}

.media-gesture-hud {
  position: absolute;
  z-index: 12;
  top: 50%;
  left: 50%;
  display: grid;
  min-width: 126px;
  padding: 16px 18px;
  color: #fff;
  text-align: center;
  pointer-events: none;
  background: rgb(7 10 16 / 78%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 16px;
  box-shadow: 0 16px 48px rgb(0 0 0 / 35%);
  backdrop-filter: blur(14px);
  transform: translate(-50%, -50%);
}

.media-gesture-hud i {
  margin: 0 auto 4px;
  font-size: 28px;
}

.media-gesture-hud strong {
  font-size: 18px;
}

.media-gesture-hud span {
  margin-top: 2px;
  color: rgb(255 255 255 / 66%);
  font-size: 12px;
}

.media-resume-chip,
.media-progress-message {
  position: absolute;
  z-index: 11;
  top: calc(3.5rem + 12px);
  left: 50%;
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  padding: 7px 8px 7px 12px;
  color: #fff;
  background: rgb(7 10 16 / 76%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 999px;
  box-shadow: 0 12px 32px rgb(0 0 0 / 24%);
  backdrop-filter: blur(14px);
  transform: translateX(-50%);
}

.media-compatibility-badge {
  position: absolute;
  z-index: 13;
  top: calc(3.5rem + 12px);
  right: 16px;
  display: flex;
  min-height: 38px;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  color: #f3f7ff;
  font: inherit;
  font-size: 12px;
  background: rgb(7 10 16 / 82%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  box-shadow: 0 12px 32px rgb(0 0 0 / 26%);
  backdrop-filter: blur(14px);
  cursor: pointer;
}

.media-compatibility-badge > i:first-child {
  color: #7cb5ff;
  font-size: 18px;
}

.media-compatibility-badge__arrow {
  color: rgb(255 255 255 / 58%);
  font-size: 17px;
}

.media-compatibility-badge:focus-visible,
.media-compatibility-action:focus-visible,
.media-compatibility-card__close:focus-visible {
  outline: 2px solid #7cb5ff;
  outline-offset: 2px;
}

.media-compatibility-card {
  position: absolute;
  z-index: 14;
  bottom: 76px;
  left: 50%;
  display: grid;
  width: min(620px, calc(100% - 32px));
  max-height: calc(100% - 152px);
  grid-template-columns: auto minmax(0, 1fr);
  gap: 14px;
  padding: 17px;
  overflow: auto;
  color: #f5f8ff;
  background:
    linear-gradient(135deg, rgb(30 77 135 / 22%), transparent 48%),
    rgb(8 12 19 / 94%);
  border: 1px solid rgb(124 181 255 / 25%);
  border-radius: 18px;
  box-shadow: 0 22px 64px rgb(0 0 0 / 42%);
  backdrop-filter: blur(18px);
  transform: translateX(-50%);
}

.media-compatibility-card--failed,
.media-compatibility-card--error {
  background:
    linear-gradient(135deg, rgb(150 49 59 / 24%), transparent 48%),
    rgb(14 10 15 / 95%);
  border-color: rgb(255 131 145 / 28%);
}

.media-compatibility-card--completed {
  background:
    linear-gradient(135deg, rgb(31 126 101 / 24%), transparent 48%),
    rgb(8 14 17 / 95%);
  border-color: rgb(112 219 181 / 27%);
}

.media-compatibility-card__icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  color: #a8ceff;
  background: rgb(124 181 255 / 13%);
  border: 1px solid rgb(124 181 255 / 18%);
  border-radius: 13px;
}

.media-compatibility-card--failed .media-compatibility-card__icon,
.media-compatibility-card--error .media-compatibility-card__icon {
  color: #ff9da8;
  background: rgb(255 117 132 / 12%);
  border-color: rgb(255 117 132 / 18%);
}

.media-compatibility-card__icon i {
  font-size: 24px;
}

.media-compatibility-card__body {
  min-width: 0;
}

.media-compatibility-card__heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.media-compatibility-card__heading > div {
  display: grid;
  gap: 2px;
}

.media-compatibility-card__heading span {
  color: #85baff;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.media-compatibility-card__heading strong {
  font-size: 16px;
  line-height: 1.35;
}

.media-compatibility-card__close {
  display: grid;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  color: rgb(255 255 255 / 65%);
  background: transparent;
  border: 0;
  border-radius: 9px;
  cursor: pointer;
}

.media-compatibility-card__close:hover {
  color: #fff;
  background: rgb(255 255 255 / 9%);
}

.media-compatibility-card__close i {
  font-size: 20px;
}

.media-compatibility-card__body > p {
  margin: 7px 0 0;
  color: rgb(235 242 255 / 68%);
  font-size: 13px;
  line-height: 1.55;
  overflow-wrap: anywhere;
}

.media-compatibility-card__body > small {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 9px;
  color: #ffb0ba;
  font-size: 12px;
}

.media-compatibility-card__body > small i {
  font-size: 16px;
}

.media-compatibility-card__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.media-compatibility-action {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 8px 12px;
  color: #e9f2ff;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 12%);
  border-radius: 10px;
  cursor: pointer;
}

.media-compatibility-action:hover:not(:disabled) {
  color: #fff;
  background: rgb(255 255 255 / 13%);
}

.media-compatibility-action--primary {
  color: #071321;
  background: #8bc0ff;
  border-color: transparent;
}

.media-compatibility-action--primary:hover:not(:disabled) {
  color: #04101d;
  background: #a8d0ff;
}

.media-compatibility-action:disabled {
  cursor: wait;
  opacity: 0.56;
}

.media-compatibility-action i {
  font-size: 18px;
}

.media-resume-chip i {
  font-size: 18px;
}

.media-resume-chip button {
  min-height: 30px;
  padding: 0 12px;
  color: #fff;
  background: rgb(255 255 255 / 13%);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
}

.media-resume-chip button:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
}

.media-progress-message {
  top: auto;
  bottom: 76px;
  padding: 9px 14px;
  font-size: 13px;
}

@media (max-width: 736px) {
  .media-resume-chip {
    top: calc(3rem + 12px);
    max-width: calc(100% - 24px);
    font-size: 12px;
  }

  .media-compatibility-badge {
    top: calc(3rem + 12px);
    right: 12px;
  }

  .media-compatibility-card {
    bottom: 68px;
    width: calc(100% - 24px);
    max-height: calc(100% - 132px);
    grid-template-columns: 36px minmax(0, 1fr);
    gap: 11px;
    padding: 14px;
    border-radius: 16px;
  }

  .media-compatibility-card__icon {
    width: 36px;
    height: 36px;
    border-radius: 11px;
  }

  .media-compatibility-card__icon i {
    font-size: 21px;
  }

  .media-compatibility-action {
    min-height: 42px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-video-stage :deep(.vjs-tech) {
    transition: none;
  }

  .media-compatibility-card,
  .media-compatibility-badge,
  .media-compatibility-action {
    transition: none;
  }
}
</style>
