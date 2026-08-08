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
import { nextTick, onBeforeUnmount, ref, watch } from "vue";
import videojs from "video.js";
import type Player from "video.js/dist/types/player";
import "videojs-hotkeys";
import "video.js/dist/video-js.min.css";

const props = withDefaults(
  defineProps<{
    path: string;
    source: string;
    subtitles?: string[];
    options?: Record<string, unknown>;
  }>(),
  {
    subtitles: () => [],
    options: () => ({}),
  }
);

const videoPlayer = ref<HTMLVideoElement | null>(null);
const stage = ref<HTMLDivElement | null>(null);
const player = ref<Player | null>(null);
const brightness = ref(1);
const restoredPosition = ref(0);
const progressMessage = ref("");
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
    const apply = () => {
      if (!player.value || request !== progressRequest) return;
      player.value.currentTime(saved.position);
      restoredPosition.value = saved.position;
      lastSavedPosition = saved.position;
    };
    if ((player.value?.readyState() ?? 0) >= 1) apply();
    else player.value?.one("loadedmetadata", apply);
  } catch {
    showProgressMessage("续播位置暂时无法读取");
  }
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
}

@media (prefers-reduced-motion: reduce) {
  .media-video-stage :deep(.vjs-tech) {
    transition: none;
  }
}
</style>
