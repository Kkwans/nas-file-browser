<template>
  <div
    id="previewer"
    :class="{ 'media-preview-shell': isUnifiedMedia }"
    @touchmove="onPreviewTouchMove"
    @wheel="onPreviewWheel"
    @mousemove="toggleNavigation"
    @touchstart="toggleNavigation"
  >
    <header-bar v-if="isPdf || isEpub || isCsv || showNav || mediaInfoOpen">
      <action icon="close" label="关闭" @action="close()" />
      <title>{{ name }}</title>
      <action
        :disabled="layoutStore.loading"
        v-if="isResizeEnabled && fileStore.req?.type === 'image'"
        :icon="fullSize ? 'photo_size_select_large' : 'hd'"
        @action="toggleSize"
      />

      <template #actions>
        <action
          v-if="isUnifiedMedia"
          :disabled="favoritePending"
          :icon="isCurrentFavorite ? 'favorite' : 'favorite_border'"
          :label="isCurrentFavorite ? '取消收藏' : '收藏'"
          @action="toggleCurrentFavorite"
        />
        <action
          v-if="isUnifiedMedia"
          :icon="isFullscreen ? 'fullscreen_exit' : 'fullscreen'"
          :label="isFullscreen ? '退出全屏' : '全屏'"
          @action="toggleFullscreen"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="authStore.user?.perm.rename"
          icon="mode_edit"
          label="重命名"
          show="rename"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="isCsv && authStore.user?.perm.modify"
          icon="edit_note"
          label="编辑文本"
          @action="editAsText"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="authStore.user?.perm.delete"
          icon="delete"
          label="删除"
          @action="deleteFile"
          id="delete-button"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="authStore.user?.perm.download"
          icon="file_download"
          label="下载"
          @action="download"
        />
        <action
          :disabled="layoutStore.loading"
          v-if="
            ['image', 'audio', 'video'].includes(fileStore.req?.type || '') &&
            authStore.user?.perm.download
          "
          icon="open_in_new"
          label="直接打开"
          @action="openDirect"
        />
        <action
          :disabled="layoutStore.loading"
          icon="info"
          label="文件信息"
          :show="isUnifiedMedia ? undefined : 'info'"
          @action="isUnifiedMedia && (mediaInfoOpen = !mediaInfoOpen)"
        />
      </template>
    </header-bar>

    <div class="loading delayed" v-if="layoutStore.loading">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
    <template v-else>
      <div class="preview">
        <div v-if="isEpub" class="epub-reader">
          <vue-reader
            :location="location"
            :url="previewUrl"
            :get-rendition="getRendition"
            :epubInitOptions="{
              requestCredentials: true,
            }"
            :epubOptions="{
              allowPopups: true,
            }"
            @update:location="locationChange"
          />
          <div class="size">
            <button
              @click="changeSize(Math.max(100, size - 10))"
              class="reader-button"
            >
              <i class="material-icons">remove</i>
            </button>
            <button
              @click="changeSize(Math.min(150, size + 10))"
              class="reader-button"
            >
              <i class="material-icons">add</i>
            </button>
            <span>{{ size }}%</span>
          </div>
        </div>
        <CsvViewer v-else-if="isCsv" :content="csvContent" :error="csvError" />
        <ExtendedImage
          v-else-if="fileStore.req?.type == 'image'"
          :src="previewUrl"
          :fileName="name"
          :fileSizeBytes="fileStore.req?.size || 0"
        />
        <AudioPreview v-else-if="fileStore.req?.type == 'audio'" :name="name" />
        <VideoPlayer
          v-else-if="fileStore.req?.type == 'video'"
          ref="player"
          :path="fileStore.req.path"
          :source="previewUrl"
          :download-source="downloadUrl"
          :direct-source="directUrl"
          :subtitles="subtitles"
          :options="videoOptions"
        >
        </VideoPlayer>
        <PdfViewer v-else-if="isPdf" :src="previewUrl" :name="name" />
        <div v-else-if="fileStore.req?.type == 'blob'" class="info">
          <div class="title">
            <i class="material-icons">feedback</i>
            此文件无法预览
          </div>
          <div>
            <a target="_blank" :href="downloadUrl" class="button button--flat">
              <div><i class="material-icons">file_download</i>下载</div>
            </a>
            <a
              target="_blank"
              :href="previewUrl"
              class="button button--flat"
              v-if="!fileStore.req?.isDir"
            >
              <div><i class="material-icons">open_in_new</i>打开文件</div>
            </a>
          </div>
        </div>
      </div>
    </template>

    <button
      @click="prev"
      @mouseover="hoverNav = true"
      @mouseleave="hoverNav = false"
      :class="{ hidden: !hasPrevious || !showNav }"
      aria-label="上一个"
      title="上一个"
    >
      <i class="material-icons">chevron_left</i>
    </button>
    <button
      @click="next"
      @mouseover="hoverNav = true"
      @mouseleave="hoverNav = false"
      :class="{ hidden: !hasNext || !showNav }"
      aria-label="下一个"
      title="下一个"
    >
      <i class="material-icons">chevron_right</i>
    </button>
    <link rel="prefetch" :href="previousRaw" />
    <link rel="prefetch" :href="nextRaw" />
    <MediaInfoPanel
      v-if="isUnifiedMedia && fileStore.req"
      :open="mediaInfoOpen"
      :resource="fileStore.req"
      @close="mediaInfoOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useStorage } from "@vueuse/core";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useMediaStore } from "@/stores/media";
import { useFavoritesStore } from "@/stores/favorites";

import { files as api } from "@/api";
import { createURL } from "@/api/utils";
import { resizePreview } from "@/utils/constants";
import url from "@/utils/url";
import { throttle } from "lodash-es";
import HeaderBar from "@/components/header/HeaderBar.vue";
import Action from "@/components/header/Action.vue";
import {
  computed,
  defineAsyncComponent,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import type { Rendition } from "epubjs";
import type { ResourceItem, ResourceType } from "@/types/file";
import { getTheme } from "@/utils/theme";
import {
  directoryAudioQueue,
  favoriteGroupAudioQueue,
} from "@/utils/audioQueue";

const ExtendedImage = defineAsyncComponent(
  () => import("@/components/files/ExtendedImage.vue")
);
const VideoPlayer = defineAsyncComponent(
  () => import("@/components/files/VideoPlayer.vue")
);
const AudioPreview = defineAsyncComponent(
  () => import("@/components/files/AudioPreview.vue")
);
const CsvViewer = defineAsyncComponent(
  () => import("@/components/files/CsvViewer.vue")
);
const PdfViewer = defineAsyncComponent(
  () => import("@/components/files/PdfViewer.vue")
);
const MediaInfoPanel = defineAsyncComponent(
  () => import("@/components/files/MediaInfoPanel.vue")
);
const VueReader = defineAsyncComponent(() =>
  import("vue-reader").then((module) => module.VueReader)
);
// CSV file size limit for preview (5MB)
// Prevents browser memory issues with large files
const CSV_MAX_SIZE = 5 * 1024 * 1024;

const location = useStorage("book-progress", 0, undefined, {
  serializer: {
    read: (v) => JSON.parse(v),
    write: (v) => JSON.stringify(v),
  },
});
const size = useStorage("book-size", 120, undefined, {
  serializer: {
    read: (v) => JSON.parse(v),
    write: (v) => JSON.stringify(v),
  },
});

const locationChange = (epubcifi: number) => {
  location.value = epubcifi;
};
let rendition: Rendition | null = null;
const changeSize = (val: number) => {
  size.value = val;
  rendition?.themes.fontSize(`${val}%`);
};

const getRendition = (_rendition: Rendition) => {
  rendition = _rendition;
  switch (getTheme()) {
    case "dark": {
      rendition.themes.override("color", "rgba(255, 255, 255, 0.6)");
      break;
    }
    case "light": {
      rendition.themes.override("color", "rgb(111, 111, 111)");
      break;
    }
  }
  rendition.themes.registerRules("h2Transparent", {
    "h1,h2,h3,h4": {
      "background-color": "transparent !important",
    },
  });
  rendition?.themes.fontSize(`${size.value}%`);
  rendition.themes.select("h2Transparent");
  rendition.themes.override("background-color", "transparent", true);
};

const mediaTypes: ResourceType[] = ["image", "video", "audio", "blob"];

const previousLink = ref<string>("");
const nextLink = ref<string>("");
const listing = ref<ResourceItem[] | null>(null);
const name = ref<string>("");
const fullSize = ref<boolean>(false);
const showNav = ref<boolean>(true);
const navTimeout = ref<null | number>(null);
const hoverNav = ref<boolean>(false);
const autoPlay = ref<boolean>(false);
const previousRaw = ref<string>("");
const nextRaw = ref<string>("");
const csvContent = ref<ArrayBuffer | string>("");
const csvError = ref<string>("");
const mediaInfoOpen = ref(false);
const isFullscreen = ref(false);
const favoritePending = ref(false);

const player = ref<HTMLVideoElement | HTMLAudioElement | null>(null);

const $showError = inject<IToastError>("$showError")!;

const authStore = useAuthStore();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const mediaStore = useMediaStore();
const favoritesStore = useFavoritesStore();

const route = useRoute();
const router = useRouter();

const hasPrevious = computed(() => previousLink.value !== "");

const hasNext = computed(() => nextLink.value !== "");

const downloadUrl = computed(() =>
  fileStore.req ? api.getDownloadURL(fileStore.req, false) : ""
);

const directUrl = computed(() =>
  fileStore.req ? api.getDownloadURL(fileStore.req, true) : ""
);

const previewUrl = computed(() => {
  if (!fileStore.req) {
    return "";
  }

  if (fileStore.req.type === "image" && !fullSize.value) {
    return api.getPreviewURL(fileStore.req, "big");
  }

  if (isEpub.value) {
    return createURL("api/raw" + fileStore.req.path, {});
  }

  return api.getDownloadURL(fileStore.req, true);
});

const isPdf = computed(() => fileStore.req?.extension.toLowerCase() == ".pdf");
const isEpub = computed(
  () => fileStore.req?.extension.toLowerCase() == ".epub"
);
const isCsv = computed(
  () =>
    fileStore.req?.extension.toLowerCase() == ".csv" &&
    fileStore.req.size <= CSV_MAX_SIZE
);

const isResizeEnabled = computed(() => resizePreview);
const isUnifiedMedia = computed(() =>
  ["image", "video", "audio"].includes(fileStore.req?.type ?? "")
);
const isCurrentFavorite = computed(() =>
  fileStore.req ? favoritesStore.isFavorite(fileStore.req.path) : false
);

const subtitles = computed(() => {
  if (fileStore.req?.subtitles) {
    return api.getSubtitlesURL(fileStore.req);
  }
  return [];
});

const videoOptions = computed(() => {
  return { autoplay: autoPlay.value };
});

watch(route, () => {
  mediaInfoOpen.value = false;
  updatePreview();
  toggleNavigation();
});

// Specify hooks
onMounted(async () => {
  window.addEventListener("keydown", key);
  document.addEventListener("fullscreenchange", onFullscreenChange);
  listing.value = fileStore.oldReq?.items ?? null;
  updatePreview();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", key);
  document.removeEventListener("fullscreenchange", onFullscreenChange);
});

// Specify methods
const deleteFile = () => {
  layoutStore.showHover({
    prompt: "delete",
    confirm: () => {
      if (listing.value === null) {
        return;
      }

      const index = listing.value.findIndex((item) => item.name == name.value);
      listing.value.splice(index, 1);

      if (hasNext.value) {
        next();
      } else if (!hasPrevious.value && !hasNext.value) {
        const nearbyItem = listing.value[Math.max(0, index - 1)];
        fileStore.preselect = nearbyItem?.path;

        close();
      } else {
        prev();
      }
    },
  });
};

const prev = () => {
  hoverNav.value = false;
  router.replace({ path: previousLink.value });
};

const next = () => {
  hoverNav.value = false;
  router.replace({ path: nextLink.value });
};

const key = (event: KeyboardEvent) => {
  if (layoutStore.currentPrompt !== null) {
    return;
  }
  // When previewing a video, let arrow keys fall through to video.js for
  // seeking instead of switching to the prev/next file. Enter still advances.
  const isVideo = fileStore.req?.type === "video";
  if (event.which === 13) {
    // enter
    if (hasNext.value) next();
  } else if (event.which === 39) {
    // right arrow
    if (isVideo) return;
    if (hasNext.value) next();
  } else if (event.which === 37) {
    // left arrow
    if (isVideo) return;
    if (hasPrevious.value) prev();
  } else if (event.which === 27) {
    // esc
    close();
  }
};
const updatePreview = async () => {
  if (player.value && player.value.paused && !player.value.ended) {
    autoPlay.value = false;
  }

  const dirs = route.fullPath.split("/");
  name.value = decodeURIComponent(dirs[dirs.length - 1]);

  // Load CSV content if it's a CSV file
  if (isCsv.value && fileStore.req) {
    csvContent.value = "";
    csvError.value = "";

    if (fileStore.req.size > CSV_MAX_SIZE) {
      csvError.value = "CSV 文件过大";
    } else {
      if (fileStore.req.rawContent != null) {
        csvContent.value = fileStore.req.rawContent;
      } else {
        csvContent.value = fileStore.req.content ?? "";
      }
    }
  }

  if (!listing.value) {
    try {
      const path = url.removeLastDir(route.path);
      const res = await api.fetch(path);
      listing.value = res.items;
    } catch (e: any) {
      $showError(e);
    }
  }

  syncAudioQueue();

  previousLink.value = "";
  nextLink.value = "";
  if (listing.value) {
    for (let i = 0; i < listing.value.length; i++) {
      if (listing.value[i].name !== name.value) {
        continue;
      }

      for (let j = i - 1; j >= 0; j--) {
        if (mediaTypes.includes(listing.value[j].type)) {
          previousLink.value = listing.value[j].url;
          previousRaw.value = prefetchUrl(listing.value[j]);
          break;
        }
      }
      for (let j = i + 1; j < listing.value.length; j++) {
        if (mediaTypes.includes(listing.value[j].type)) {
          nextLink.value = listing.value[j].url;
          nextRaw.value = prefetchUrl(listing.value[j]);
          break;
        }
      }

      return;
    }
  }
};

const syncAudioQueue = () => {
  const current = fileStore.req;
  if (current?.type !== "audio") return;
  const favoriteGroupId =
    typeof route.query.mediaQueue === "string" ? route.query.mediaQueue : "";
  const favoriteQueue = favoriteGroupId
    ? favoriteGroupAudioQueue(favoritesStore.favorites, favoriteGroupId)
    : [];
  const queue =
    favoriteQueue.length > 0
      ? favoriteQueue
      : directoryAudioQueue(listing.value ?? []);
  if (queue.some((item) => item.path === current.path)) {
    mediaStore.openAudioQueue(queue, current.path, autoPlay.value);
  }
};

const prefetchUrl = (item: ResourceItem) => {
  if (item.type !== "image") {
    return "";
  }

  return fullSize.value
    ? api.getDownloadURL(item, true)
    : api.getPreviewURL(item, "big");
};

const toggleSize = () => (fullSize.value = !fullSize.value);

const toggleCurrentFavorite = async () => {
  const current = fileStore.req;
  if (!current || favoritePending.value) return;
  favoritePending.value = true;
  try {
    await favoritesStore.toggleFavorite(current.path, current.name);
  } finally {
    favoritePending.value = false;
  }
};

const toggleFullscreen = async () => {
  const previewer = document.getElementById("previewer");
  if (!previewer) return;
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await previewer.requestFullscreen();
  } catch (error) {
    $showError(error instanceof Error ? error : new Error("无法切换全屏"));
  }
};

const onFullscreenChange = () => {
  isFullscreen.value = document.fullscreenElement?.id === "previewer";
};

const isMediaPanelEvent = (event: Event) =>
  event.target instanceof Element &&
  Boolean(event.target.closest(".media-info-panel"));

const onPreviewTouchMove = (event: TouchEvent) => {
  if (isMediaPanelEvent(event)) return;
  event.preventDefault();
  event.stopPropagation();
};

const onPreviewWheel = (event: WheelEvent) => {
  if (isMediaPanelEvent(event)) return;
  event.preventDefault();
  event.stopPropagation();
};

const toggleNavigation = throttle(function () {
  showNav.value = true;

  if (navTimeout.value) {
    clearTimeout(navTimeout.value);
  }

  navTimeout.value = window.setTimeout(() => {
    showNav.value = false || hoverNav.value;
    navTimeout.value = null;
  }, 1500);
}, 500);

const close = () => {
  const uri = url.removeLastDir(route.path) + "/";
  router.push({ path: uri });
};

const download = () => {
  const a = document.createElement("a");
  a.href = downloadUrl.value;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
const openDirect = () => window.open(directUrl.value);

const editAsText = () => {
  router.push({ path: route.path, query: { edit: "true" } });
};
</script>
