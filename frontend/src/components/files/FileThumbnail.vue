<template>
  <span
    ref="container"
    class="file-thumbnail"
    :data-status="status"
    :title="statusTitle"
  >
    <img
      v-if="displaySource"
      ref="thumbnailImage"
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
      <AppIcon name="refresh" :size="18" />
    </button>
    <RiskResourceIcon
      v-else-if="nonLowRiskLevel"
      :is-dir="isDir"
      :level="nonLowRiskLevel"
    />
    <AppIcon
      v-else
      class="file-type-icon app-resource-icon"
      :class="{ 'app-resource-icon--folder': isDir }"
      :name="resourceIconName"
      :size="64"
      :stroke-width="1.85"
      aria-hidden="true"
    />
  </span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { files as api } from "@/api";
import type { ResourceItem } from "@/types/file";
import { useLayoutStore } from "@/stores/layout";
import {
  browserVideoThumbnailScheduler,
  extractVideoFrame,
  type ThumbnailRequest,
} from "@/utils/thumbnailScheduler";
import RiskResourceIcon from "@/components/files/RiskResourceIcon.vue";
import type { RiskLevel } from "@/types/file";
import AppIcon from "@/components/ui/AppIcon.vue";
import { getResourceIconName } from "@/utils/fileIcons";

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
const thumbnailImage = ref<HTMLImageElement | null>(null);
const visible = ref(false);
const status = ref<ThumbnailStatus>("idle");
const displaySource = ref("");
let observer: IntersectionObserver | null = null;
let request: ThumbnailRequest | null = null;
const normalizedRiskLevel = computed(() => props.riskLevel ?? "low");
const resourceIconName = computed(() =>
  getResourceIconName(props.name, props.type, props.isDir)
);
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
const layoutStore = useLayoutStore();
const statusTitle = computed(() => {
  if (status.value === "queued") return "缩略图已排队";
  if (status.value === "generating") return "正在生成缩略图";
  if (status.value === "fallback") return "浏览器不支持，正在生成兼容封面";
  if (status.value === "error") return "无法生成缩略图";
  return "";
});

function start() {
  if (
    layoutStore.loading ||
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

function cancelActiveLoad() {
  request?.cancel();
  request = null;
  // Removing the attribute aborts a native image request without starting a
  // new request for the current document (which assigning src="" can do).
  thumbnailImage.value?.removeAttribute("src");
  displaySource.value = "";
  status.value = "idle";
}

function handleImageError() {
  displaySource.value = "";
  status.value = "error";
}

function retry() {
  cancelActiveLoad();
  start();
}

watch(visible, (next) => {
  if (next) start();
  else if (
    status.value === "queued" ||
    status.value === "generating" ||
    status.value === "fallback"
  ) {
    cancelActiveLoad();
  }
});

// Files.vue sets this shared loading flag before replacing the directory
// resource. Canceling here releases native <img> connections while the new
// resource request is in flight, instead of letting off-screen thumbnails
// delay the preview request.
watch(
  () => layoutStore.loading,
  (loading) => {
    if (loading) cancelActiveLoad();
    else start();
  },
  { flush: "sync" }
);

watch(
  () => [props.path, props.modified, props.size],
  () => {
    cancelActiveLoad();
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
