<template>
  <span
    ref="container"
    class="file-thumbnail"
    :data-status="status"
    :title="statusTitle"
  >
    <img
      v-if="displaySource"
      :src="displaySource"
      alt=""
      width="256"
      height="256"
      decoding="async"
      @load="status = 'success'"
      @error="handleImageError"
    />
    <span
      v-else-if="isMedia && status !== 'error'"
      class="thumbnail-placeholder"
      aria-hidden="true"
    ></span>
    <button
      v-else-if="isMedia && status === 'error'"
      class="thumbnail-retry"
      type="button"
      aria-label="重试生成缩略图"
      title="重试生成缩略图"
      @click.stop="retry"
    >
      <i class="material-icons" aria-hidden="true">refresh</i>
    </button>
    <RiskResourceIcon
      v-else-if="nonLowRiskLevel"
      :is-dir="isDir"
      :level="nonLowRiskLevel"
    />
    <i v-else class="material-icons file-type-icon" aria-hidden="true"></i>
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { files as api } from "@/api";
import type { ResourceItem } from "@/types/file";
import {
  browserVideoThumbnailScheduler,
  extractVideoFrame,
  type ThumbnailRequest,
} from "@/utils/thumbnailScheduler";
import RiskResourceIcon from "@/components/files/RiskResourceIcon.vue";
import type { RiskLevel } from "@/types/file";

const props = defineProps<{
  name: string;
  path: string;
  type: string;
  modified: string;
  size: number;
  enabled: boolean;
  isDir: boolean;
  riskLevel?: RiskLevel;
  readOnly?: boolean;
}>();

type ThumbnailStatus =
  | "idle"
  | "queued"
  | "generating"
  | "fallback"
  | "success"
  | "error";

const container = ref<HTMLElement | null>(null);
const visible = ref(false);
const status = ref<ThumbnailStatus>("idle");
const displaySource = ref("");
let observer: IntersectionObserver | null = null;
let request: ThumbnailRequest | null = null;
const normalizedRiskLevel = computed(() => props.riskLevel ?? "low");
const nonLowRiskLevel = computed<Exclude<RiskLevel, "low"> | null>(() =>
  normalizedRiskLevel.value === "low" ? null : normalizedRiskLevel.value
);

const isMedia = computed(
  () =>
    props.enabled &&
    !props.readOnly &&
    (props.type === "image" || props.type === "video")
);
const item = computed(
  () =>
    ({
      path: props.path,
      modified: props.modified,
      size: props.size,
    }) as ResourceItem
);
const imagePreviewUrl = computed(() => api.getPreviewURL(item.value, "thumb"));
const rawVideoUrl = computed(() => api.getDownloadURL(item.value, true));
const statusTitle = computed(() => {
  if (status.value === "queued") return "缩略图已排队";
  if (status.value === "generating") return "正在生成缩略图";
  if (status.value === "fallback") return "浏览器不支持，正在生成兼容封面";
  if (status.value === "error") return "无法生成缩略图";
  return "";
});

function start() {
  if (
    !visible.value ||
    !isMedia.value ||
    displaySource.value ||
    status.value === "error"
  )
    return;
  if (props.type === "image") {
    status.value = "generating";
    displaySource.value = imagePreviewUrl.value;
    return;
  }

  status.value = "queued";
  const key = `${props.path}:${props.modified}:${props.size}:browser-video-v1`;
  request = browserVideoThumbnailScheduler.request(
    key,
    (signal) => extractVideoFrame(rawVideoUrl.value, signal),
    () => (status.value = "generating")
  );
  void request.promise
    .then((source) => {
      displaySource.value = source;
      status.value = "success";
    })
    .catch((error) => {
      if (error instanceof Error && error.name === "AbortError") {
        status.value = "idle";
        return;
      }
      status.value = "fallback";
      displaySource.value = imagePreviewUrl.value;
    });
}

function handleImageError() {
  displaySource.value = "";
  status.value = "error";
}

function retry() {
  request?.cancel();
  request = null;
  displaySource.value = "";
  status.value = "idle";
  start();
}

watch(visible, (next) => {
  if (next) start();
  else if (
    status.value === "queued" ||
    status.value === "generating" ||
    status.value === "fallback"
  ) {
    request?.cancel();
    request = null;
    displaySource.value = "";
    status.value = "idle";
  }
});

watch(
  () => [props.path, props.modified, props.size],
  () => {
    request?.cancel();
    request = null;
    displaySource.value = "";
    status.value = "idle";
    start();
  }
);

onMounted(() => {
  if (typeof IntersectionObserver === "undefined") {
    visible.value = true;
    return;
  }
  observer = new IntersectionObserver(
    ([entry]) => {
      visible.value = entry.isIntersecting;
    },
    { rootMargin: "128px" }
  );
  if (container.value) observer.observe(container.value);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  request?.cancel();
});
</script>
