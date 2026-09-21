<template>
  <section class="art-player-shell" aria-label="视频播放器">
    <div ref="container" class="art-player-stage"></div>
    <div
      v-if="askingMode"
      class="player-choice"
      role="dialog"
      aria-label="选择播放方式"
    >
      <strong>选择播放方式</strong>
      <p>原生播放速度最快；兼容播放会创建浏览器可解码的临时媒体。</p>
      <div>
        <button type="button" @click="chooseMode('native')">原生播放</button>
        <button type="button" class="primary" @click="chooseMode('compat')">
          兼容播放
        </button>
      </div>
    </div>
    <div v-if="resumePrompt" class="resume-prompt" role="status">
      <span>上次播放到 {{ formatClock(resumePrompt.position) }}</span>
      <button type="button" @click="applyResume(resumePrompt.position)">
        继续播放
      </button>
      <button type="button" @click="dismissResume">从头播放</button>
    </div>
    <div v-if="busyMessage" class="player-status" aria-live="polite">
      <span class="spinner"></span>{{ busyMessage }}
    </div>
    <div v-if="errorMessage" class="player-error" role="alert">
      <strong>视频无法播放</strong>
      <span>{{ errorMessage }}</span>
      <div>
        <button type="button" @click="retry">重试</button>
        <a :href="downloadSource" download>下载原文件</a>
      </div>
    </div>
    <div class="player-tools" aria-label="播放器附加设置">
      <label>
        字幕
        <select :value="subtitlePrefs.url" @change="selectSubtitle">
          <option value="">关闭</option>
          <option v-for="item in subtitles" :key="item.url" :value="item.url">
            {{ item.name || fileName(item.url) }}
          </option>
        </select>
      </label>
      <button type="button" @click="subtitlePickerOpen = true">
        从 NAS 选择字幕
      </button>
      <label>
        字号
        <select v-model="subtitlePrefs.size" @change="applySubtitlePreferences">
          <option value="small">小</option>
          <option value="medium">中</option>
          <option value="large">大</option>
        </select>
      </label>
      <label>
        位置
        <select
          v-model.number="subtitlePrefs.bottom"
          @change="applySubtitlePreferences"
        >
          <option :value="16">低</option>
          <option :value="44">中</option>
          <option :value="80">高</option>
        </select>
      </label>
      <label>
        偏移
        <input
          v-model.number="subtitlePrefs.offset"
          type="number"
          min="-10"
          max="10"
          step="0.1"
          @change="applySubtitlePreferences"
        />
        秒
      </label>
    </div>
    <PathPicker
      v-if="subtitlePickerOpen"
      title="选择字幕文件"
      mode="file"
      :model-value="''"
      :file-extensions="['vtt', 'srt', 'ass']"
      @select="pickSubtitleFile"
      @close="subtitlePickerOpen = false"
    />
  </section>
</template>

<script setup lang="ts">
import Artplayer from "artplayer";
import Hls from "hls.js";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { media } from "@/api";
import { createURL } from "@/api/utils";
import { useAuthStore } from "@/stores/auth";
import { useAccountPreferencesStore } from "@/stores/accountPreferences";
import { resolveControlsTimeoutMs } from "@/utils/playerControls";
import { supportsH264CompatibilityPlayback } from "@/utils/videoPlayback";
import PathPicker from "@/components/prompts/PathPicker.vue";

type ActualMode = "native" | "compat";
type Quality = "source" | "4k" | "2k" | "1080p" | "720p" | "480p";
type SubtitleItem = { url: string; name?: string; lang?: string };

const props = defineProps<{
  path: string;
  source: string;
  poster?: string;
  downloadSource: string;
  subtitles?: SubtitleItem[];
}>();

const container = ref<HTMLDivElement | null>(null);
const auth = useAuthStore();
const accountPreferences = useAccountPreferencesStore();
const art = ref<Artplayer | null>(null);
const hls = ref<Hls | null>(null);
const busyMessage = ref("");
const errorMessage = ref("");
const askingMode = ref(false);
const actualMode = ref<ActualMode>("native");
const selectedQuality = ref<Quality>("source");
const subtitlePickerOpen = ref(false);
const resumePrompt = ref<{ position: number } | null>(null);
const destroyed = ref(false);
let compatPollTimer: number | undefined;
let resumePromptTimer: number | undefined;
let rateSaveTimer: number | undefined;
let lastProgressWrite = 0;
let pendingResume = 0;

const subtitleStorageKey = computed(
  () => `nas-file-browser-subtitle-v1:${auth.user?.id ?? "guest"}`
);
const subtitlePrefs = reactive(loadSubtitlePreferences());

function loadSubtitlePreferences() {
  const fallback = { url: "", size: "medium", bottom: 44, offset: 0 };
  try {
    const parsed = JSON.parse(
      localStorage.getItem(subtitleStorageKey?.value ?? "") || "null"
    );
    return {
      ...fallback,
      ...(parsed && typeof parsed === "object" ? parsed : {}),
    };
  } catch {
    return fallback;
  }
}

function persistSubtitlePreferences() {
  try {
    localStorage.setItem(
      subtitleStorageKey.value,
      JSON.stringify(subtitlePrefs)
    );
  } catch {
    // Playback must remain usable when browser storage is unavailable.
  }
}

function subtitleType(url: string) {
  const extension = url.split(/[?#]/, 1)[0].split(".").pop()?.toLowerCase();
  return extension === "ass" || extension === "srt" ? extension : "vtt";
}

function subtitleFontSize() {
  return subtitlePrefs.size === "small"
    ? "16px"
    : subtitlePrefs.size === "large"
      ? "28px"
      : "21px";
}

async function switchSubtitle(url: string) {
  if (!art.value) return;
  if (!url) {
    art.value.subtitle.show = false;
    return;
  }
  await art.value.subtitle.switch(url, {
    name: fileName(url),
    type: subtitleType(url),
    style: {
      fontSize: subtitleFontSize(),
      bottom: `${subtitlePrefs.bottom}px`,
    },
  });
  art.value.subtitle.show = true;
  art.value.subtitleOffset = Number(subtitlePrefs.offset) || 0;
}

function applySubtitlePreferences() {
  subtitlePrefs.offset = Math.max(
    -10,
    Math.min(10, Number(subtitlePrefs.offset) || 0)
  );
  art.value?.subtitle.style({
    fontSize: subtitleFontSize(),
    bottom: `${subtitlePrefs.bottom}px`,
  });
  if (art.value) art.value.subtitleOffset = subtitlePrefs.offset;
  persistSubtitlePreferences();
}

function selectSubtitle(event: Event) {
  subtitlePrefs.url = (event.target as HTMLSelectElement).value;
  persistSubtitlePreferences();
  void switchSubtitle(subtitlePrefs.url);
}

function pickSubtitleFile(value: string | string[]) {
  const path = Array.isArray(value) ? value[0] : value;
  subtitlePickerOpen.value = false;
  if (!path) return;
  subtitlePrefs.url = createURL(`api/subtitle${path}`, { inline: "true" });
  persistSubtitlePreferences();
  void switchSubtitle(subtitlePrefs.url);
}

function fileName(value: string) {
  try {
    return decodeURIComponent(
      value.split(/[?#]/, 1)[0].split("/").pop() || "字幕"
    );
  } catch {
    return value.split("/").pop() || "字幕";
  }
}

function playbackRate() {
  const value = Number(auth.user?.playerPreferences?.playbackRate ?? 1);
  return Number.isFinite(value) ? Math.max(0.1, Math.min(5, value)) : 1;
}

function playbackMode(): ActualMode | "ask" {
  const value = auth.user?.playerPreferences?.playbackMode;
  return value === "compat" || value === "ask" ? value : "native";
}

function resumeMode(): "resume" | "from-start" | "ask" {
  const value = auth.user?.playerPreferences?.resumeMode;
  return value === "from-start" || value === "ask" ? value : "resume";
}

function resumeMinimum() {
  const value = Number(auth.user?.playerPreferences?.resumeMinSec ?? 10);
  return Number.isFinite(value) ? Math.max(5, Math.min(600, value)) : 10;
}

function playerSettings() {
  return [
    {
      html: "播放方式",
      selector: ["native", "compat"].map((value) => ({
        html: value === "native" ? "原生播放" : "兼容播放",
        value,
        default: actualMode.value === value,
      })),
      onSelect(item: { value?: ActualMode; html: string }) {
        if (item.value) void chooseMode(item.value);
        return item.html;
      },
    },
    {
      html: "转码画质",
      selector: (
        ["source", "4k", "2k", "1080p", "720p", "480p"] as Quality[]
      ).map((value) => ({
        html: qualityLabel(value),
        value,
        default: selectedQuality.value === value,
      })),
      onSelect(item: { value?: Quality; html: string }) {
        if (item.value) void switchQuality(item.value);
        return item.html;
      },
    },
  ];
}

function createPlayer() {
  if (!container.value) return;
  const timeout = resolveControlsTimeoutMs(
    auth.user?.playerPreferences?.controlsTimeoutSec
  );
  Artplayer.CONTROL_HIDE_TIME = timeout > 0 ? timeout : 2_147_483_647;
  art.value = new Artplayer({
    container: container.value,
    url: props.source,
    poster: props.poster || "",
    lang: "zh-cn",
    setting: true,
    settings: playerSettings(),
    playbackRate: true,
    aspectRatio: true,
    fullscreen: true,
    fullscreenWeb: true,
    pip: true,
    mutex: true,
    hotkey: true,
    miniProgressBar: true,
    subtitleOffset: true,
    moreVideoAttr: { playsInline: true, preload: "metadata" },
  });
  art.value.playbackRate = playbackRate();
  const video = art.value.video;
  video.addEventListener("timeupdate", onTimeUpdate);
  video.addEventListener("pause", saveProgress);
  video.addEventListener("error", onVideoError);
  video.addEventListener("ratechange", scheduleRateSave);
  art.value.on("ready", () => {
    busyMessage.value = "";
    if (pendingResume > 0) applyResume(pendingResume);
    if (subtitlePrefs.url) void switchSubtitle(subtitlePrefs.url);
  });
}

function snapshotPlayback() {
  return {
    position: pendingResume || art.value?.currentTime || 0,
    rate: art.value?.playbackRate ?? playbackRate(),
    playing: art.value?.playing ?? false,
  };
}

async function chooseMode(mode: ActualMode) {
  askingMode.value = false;
  const snapshot = snapshotPlayback();
  actualMode.value = mode;
  await accountPreferences
    .save({
      playerPreferences: {
        ...auth.user?.playerPreferences,
        playbackMode: mode,
      },
    })
    .catch(() => {
      showNotice("播放偏好保存失败");
    });
  if (mode === "native") {
    detachHls();
    if (art.value) await art.value.switchUrl(props.source);
    restorePlayback(snapshot);
    return;
  }
  await startCompatibility(selectedQuality.value, snapshot);
}

async function switchQuality(quality: Quality) {
  selectedQuality.value = quality;
  if (actualMode.value === "compat")
    await startCompatibility(quality, snapshotPlayback());
}

async function startCompatibility(
  quality: Quality,
  snapshot = snapshotPlayback()
) {
  clearCompatTimer();
  detachHls();
  errorMessage.value = "";
  busyMessage.value = "正在准备兼容播放…";
  try {
    const format = supportsH264CompatibilityPlayback() ? "hls" : "webm";
    let status = await media.startHLSPlayback(props.path, format, quality);
    while (
      !destroyed.value &&
      !["streamable", "completed", "failed", "canceled"].includes(status.state)
    ) {
      await waitForPoll();
      status = await media.getHLSPlayback(status.id);
      if (status.durationSeconds && status.processedSeconds) {
        busyMessage.value = `正在准备兼容播放… ${formatClock(status.processedSeconds)} / ${formatClock(status.durationSeconds)}`;
      }
    }
    if (destroyed.value) return;
    if (status.state === "failed" || status.state === "canceled")
      throw new Error(status.error || "兼容媒体生成失败");
    const target = status.sourceUrl || status.playlistUrl;
    if (!target || !art.value) throw new Error("兼容媒体尚不可用");
    if (status.playlistUrl) await attachHls(status.playlistUrl);
    else await art.value.switchUrl(target);
    busyMessage.value = "";
    restorePlayback(snapshot);
  } catch (error) {
    busyMessage.value = "";
    errorMessage.value =
      error instanceof Error ? error.message : "兼容播放启动失败";
  }
}

function waitForPoll() {
  return new Promise<void>((resolve) => {
    compatPollTimer = window.setTimeout(resolve, 800);
  });
}

async function attachHls(url: string) {
  const video = art.value?.video;
  if (!video) return;
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.load();
    return;
  }
  if (!Hls.isSupported()) throw new Error("当前浏览器不支持 HLS 兼容播放");
  const instance = new Hls({
    xhrSetup(xhr) {
      if (auth.jwt) xhr.setRequestHeader("X-Auth", auth.jwt);
    },
  });
  hls.value = instance;
  instance.on(Hls.Events.ERROR, (_event, data) => {
    if (data.fatal) errorMessage.value = data.error?.message || "HLS 播放失败";
  });
  instance.loadSource(url);
  instance.attachMedia(video);
}

function detachHls() {
  hls.value?.destroy();
  hls.value = null;
}

function restorePlayback(snapshot: {
  position: number;
  rate: number;
  playing: boolean;
}) {
  pendingResume = snapshot.position;
  const restore = () => {
    if (!art.value) return;
    art.value.playbackRate = snapshot.rate;
    if (snapshot.position > 0) art.value.currentTime = snapshot.position;
    pendingResume = 0;
    if (snapshot.playing) void art.value.play().catch(() => undefined);
  };
  if ((art.value?.video.readyState ?? 0) >= 1) restore();
  else
    art.value?.video.addEventListener("loadedmetadata", restore, {
      once: true,
    });
}

async function loadResume() {
  try {
    const saved = await media.getPlayback(props.path);
    if (
      !saved.exists ||
      saved.position < resumeMinimum() ||
      saved.position >= saved.duration - 5
    )
      return;
    if (resumeMode() === "resume") pendingResume = saved.position;
    else if (resumeMode() === "ask") {
      resumePrompt.value = { position: saved.position };
      resumePromptTimer = window.setTimeout(() => {
        resumePrompt.value = null;
        resumePromptTimer = undefined;
      }, 6000);
    }
  } catch {
    // Resume history is optional and must not block playback.
  }
}

function applyResume(position: number) {
  clearResumePromptTimer();
  resumePrompt.value = null;
  pendingResume = position;
  if (art.value && art.value.duration > 0) {
    art.value.currentTime = Math.min(
      position,
      Math.max(0, art.value.duration - 0.5)
    );
    pendingResume = 0;
  }
}

function dismissResume() {
  clearResumePromptTimer();
  resumePrompt.value = null;
  pendingResume = 0;
  void media.clearPlayback(props.path).catch(() => undefined);
}

function scheduleRateSave() {
  if (!art.value || Math.abs(art.value.playbackRate - playbackRate()) < 0.001)
    return;
  if (rateSaveTimer !== undefined) window.clearTimeout(rateSaveTimer);
  rateSaveTimer = window.setTimeout(() => {
    rateSaveTimer = undefined;
    const rate = art.value?.playbackRate;
    if (!rate) return;
    void accountPreferences
      .save({
        playerPreferences: {
          ...auth.user?.playerPreferences,
          playbackRate: Math.round(rate * 100) / 100,
        },
      })
      .catch(() => {
        showNotice("倍速偏好保存失败");
      });
  }, 250);
}

function onTimeUpdate() {
  const now = Date.now();
  if (now - lastProgressWrite < 5000) return;
  lastProgressWrite = now;
  saveProgress();
}

function showNotice(message: string) {
  if (!art.value) return;
  const notice = art.value.notice as unknown as {
    show: string | Error | false | "";
  };
  notice.show = message;
}

function saveProgress() {
  const player = art.value;
  if (!player || !Number.isFinite(player.duration) || player.duration <= 0)
    return;
  if (player.currentTime >= player.duration - 5)
    void media.clearPlayback(props.path).catch(() => undefined);
  else
    void media
      .savePlayback(props.path, player.currentTime, player.duration)
      .catch(() => undefined);
}

function onVideoError() {
  if (busyMessage.value) return;
  errorMessage.value = "原视频无法解码，可切换到兼容播放。";
}

function retry() {
  errorMessage.value = "";
  if (actualMode.value === "compat")
    void startCompatibility(selectedQuality.value);
  else if (art.value) void art.value.switchUrl(props.source);
}

function qualityLabel(value: Quality) {
  return value === "source" ? "源画质" : value.toUpperCase();
}

function formatClock(seconds: number) {
  const value = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const rest = value % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`
    : `${minutes}:${String(rest).padStart(2, "0")}`;
}

function clearCompatTimer() {
  if (compatPollTimer !== undefined) window.clearTimeout(compatPollTimer);
  compatPollTimer = undefined;
}

function clearResumePromptTimer() {
  if (resumePromptTimer !== undefined) window.clearTimeout(resumePromptTimer);
  resumePromptTimer = undefined;
}

watch(
  () => props.path,
  () => {
    clearCompatTimer();
    clearResumePromptTimer();
    detachHls();
    resumePrompt.value = null;
    pendingResume = 0;
  }
);

onMounted(async () => {
  await loadResume();
  await nextTick();
  createPlayer();
  const mode = playbackMode();
  if (mode === "ask") askingMode.value = true;
  else if (mode === "compat") await chooseMode("compat");
});

onBeforeUnmount(() => {
  destroyed.value = true;
  saveProgress();
  clearCompatTimer();
  clearResumePromptTimer();
  if (rateSaveTimer !== undefined) window.clearTimeout(rateSaveTimer);
  detachHls();
  art.value?.destroy(false);
  art.value = null;
});
</script>

<style scoped>
.art-player-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 280px;
  background: #05070a;
  color: #fff;
}
.art-player-stage {
  width: 100%;
  height: calc(100% - 48px);
  min-height: 280px;
}
.player-choice,
.player-error,
.player-status,
.resume-prompt {
  position: absolute;
  z-index: 5;
  left: 50%;
  top: 50%;
  display: grid;
  gap: 10px;
  min-width: min(360px, calc(100% - 32px));
  padding: 18px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 12px;
  background: rgb(10 14 20 / 90%);
  transform: translate(-50%, -50%);
  text-align: center;
}
.player-choice p,
.player-error span {
  margin: 0;
  color: #cbd5e1;
  font-size: 13px;
}
.player-choice div,
.player-error div {
  display: flex;
  justify-content: center;
  gap: 8px;
}
.player-choice button,
.player-error button,
.player-error a,
.resume-prompt button,
.player-tools button {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid rgb(255 255 255 / 20%);
  border-radius: 8px;
  color: #fff;
  background: rgb(255 255 255 / 8%);
  text-decoration: none;
}
.player-choice .primary {
  border-color: var(--blue);
  background: var(--blue);
}
.resume-prompt {
  top: auto;
  bottom: 66px;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  transform: translateX(-50%);
  text-align: left;
}
.player-status {
  min-width: 0;
  grid-template-columns: auto 1fr;
  align-items: center;
}
.player-tools {
  display: flex;
  min-height: 48px;
  align-items: center;
  gap: 10px;
  overflow-x: auto;
  padding: 4px 10px;
  background: #0b1017;
  font-size: 12px;
}
.player-tools label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.player-tools select,
.player-tools input {
  min-height: 36px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 7px;
  color: #fff;
  background: #151c27;
}
.player-tools input {
  width: 64px;
  padding: 0 6px;
}
@media (max-width: 600px) {
  .resume-prompt {
    grid-template-columns: 1fr 1fr;
  }
  .resume-prompt span {
    grid-column: 1 / -1;
  }
}
</style>
