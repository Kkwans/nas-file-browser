<template>
  <div class="card floating quick-preview-card">
    <div class="quick-preview-header">
      <div class="quick-preview-info">
        <i class="material-icons file-type-icon" :class="fileTypeClass">{{
          fileIcon
        }}</i>
        <span class="quick-preview-name">{{ item.name }}</span>
        <span class="quick-preview-meta"
          >{{ humanSize }} · {{ humanTime }}</span
        >
      </div>
      <div class="quick-preview-actions">
        <button
          class="quick-preview-btn"
          @click="navigateFile(-1)"
          title="上一个"
        >
          <i class="material-icons">chevron_left</i>
        </button>
        <button
          class="quick-preview-btn"
          @click="navigateFile(1)"
          title="下一个"
        >
          <i class="material-icons">chevron_right</i>
        </button>
        <button class="quick-preview-btn" @click="downloadFile" title="下载">
          <i class="material-icons">file_download</i>
        </button>
        <button class="quick-preview-btn" @click="openFull" title="打开文件">
          <i class="material-icons">open_in_new</i>
        </button>
        <button
          class="quick-preview-btn close-btn"
          @click="close"
          title="关闭"
        >
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div class="quick-preview-body">
      <!-- Image -->
      <img
        v-if="item.type === 'image'"
        :src="previewUrl"
        :alt="item.name"
        class="quick-preview-image"
      />
      <!-- Video -->
      <video
        v-else-if="item.type === 'video'"
        :src="directUrl"
        controls
        autoplay
        class="quick-preview-video"
      />
      <!-- Audio -->
      <div v-else-if="item.type === 'audio'" class="quick-preview-audio-wrap">
        <i class="material-icons audio-icon">audiotrack</i>
        <audio :src="directUrl" controls autoplay class="quick-preview-audio" />
      </div>
      <!-- PDF -->
      <iframe v-else-if="isPdf" :src="directUrl" class="quick-preview-pdf" />
      <!-- Markdown (rendered) -->
      <div
        v-else-if="isMarkdown"
        class="quick-preview-markdown md_preview"
        ref="markdownBody"
      ></div>
      <!-- Text / Code -->
      <pre
        v-else-if="isText"
        class="quick-preview-text"
      ><code>{{ textContent }}</code></pre>
      <!-- Blob (no preview) -->
      <div v-else class="quick-preview-no-preview">
        <i class="material-icons">feedback</i>
        <span>此文件无法预览。</span>
      </div>
    </div>
    <div v-if="loading" class="quick-preview-loading">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">

import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useLayoutStore } from "@/stores/layout";
import { useFileStore } from "@/stores/file";
import { files as api } from "@/api";
import type { ResourceItem } from "@/types/file";
import { filesize } from "@/utils";
import { getFileIcon, isTextFile, isPreviewable } from "@/utils/fileIcons";
import {

  loadMarkdownResources,
  highlightAndAnnotateCodeBlocks,
} from "@/utils/externalResources";
import dayjs from "dayjs";
import { T } from "@/utils/translations";
const t = (key: string): string => (T as any)[key] ?? key;
const router = useRouter();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const { closeHovers } = layoutStore;
const { currentPrompt } = storeToRefs(layoutStore);

const loading = ref(true);
const textContent = ref("");
const markdownBody = ref<HTMLElement | null>(null);

const item = computed(() => currentPrompt.value?.props?.item || {});

const humanSize = computed(() => filesize(item.value.size || 0));
const humanTime = computed(() => dayjs(item.value.modified).fromNow());

const isPdf = computed(() => item.value.extension?.toLowerCase() === ".pdf");
const isMarkdown = computed(() => {
  const ext = item.value.extension?.toLowerCase() || "";
  return ext === ".md" || ext === ".markdown";
});
const isText = computed(() =>
  isTextFile(item.value.type || "", item.value.extension)
);

const fileIcon = computed(() => {
  const typeIcons: Record<string, string> = {
    image: "image",
    video: "movie",
    audio: "volume_up",
    pdf: "description",
    text: "description",
    textImmutable: "description",
    blob: "insert_drive_file",
    invalid_link: "link_off",
  };
  return typeIcons[item.value.type] || getFileIcon(item.value.name || "");
});

const fileTypeClass = computed(() => {
  const classes: Record<string, string> = {
    image: "type-image",
    video: "type-video",
    audio: "type-audio",
    pdf: "type-pdf",
    text: "type-text",
    textImmutable: "type-text",
  };
  return classes[item.value.type] || "type-blob";
});

const previewUrl = computed(() => {
  if (item.value.type === "image") {
    return api.getPreviewURL(item.value, "big");
  }
  return api.getDownloadURL(item.value, true);
});

const directUrl = computed(() => api.getDownloadURL(item.value, true));

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
  if (isMarkdown.value) {
    loadMarkdownContent();
  } else if (isText.value) {
    loadTextContent();
  } else if (item.value.type === "blob" || item.value.type === "invalid_link") {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    event.preventDefault();
    closeHovers();
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    navigateFile(event.key === "ArrowRight" ? 1 : -1);
  }
};

const navigateFile = (direction: number) => {
  const listing = fileStore.oldReq?.items;
  if (!listing || listing.length === 0) return;

  const currentName = item.value.name;
  const currentIndex = listing.findIndex(
    (it: ResourceItem) => it.name === currentName
  );
  if (currentIndex === -1) return;

  let idx = currentIndex;
  do {
    idx += direction;
    if (idx < 0) idx = listing.length - 1;
    if (idx >= listing.length) idx = 0;
    if (idx === currentIndex) return;
  } while (!isPreviewable(listing[idx].type, listing[idx].extension));

  const target = listing[idx];
  closeHovers();
  router.push({ path: target.url });
};

const close = () => closeHovers();

const downloadFile = () => {
  const a = document.createElement("a");
  a.href = directUrl.value;
  a.download = item.value.name || "";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

const openFull = () => window.open(directUrl.value, "_blank");

const loadTextContent = async () => {
  try {
    const resp = await fetch(directUrl.value, { credentials: "include" });
    const text = await resp.text();
    textContent.value =
      text.length > 51200
        ? text.substring(0, 51200) + "\n\n... " + t("files.fileTooLarge")
        : text;
  } catch {
    textContent.value = t("files.cannotLoadContent");
  } finally {
    loading.value = false;
  }
};

const loadMarkdownContent = async () => {
  try {
    const resp = await fetch(directUrl.value, { credentials: "include" });
    const text = await resp.text();
    const truncated =
      text.length > 51200
        ? text.substring(0, 51200) + "\n\n... " + t("files.fileTooLarge")
        : text;
    await renderMarkdown(truncated);
  } catch {
    textContent.value = t("files.cannotLoadContent");
    nextTick(() => {
      if (markdownBody.value) {
        markdownBody.value.textContent = textContent.value;
      }
    });
  } finally {
    loading.value = false;
  }
};

const renderMarkdown = async (content: string) => {
  await loadMarkdownResources();

  const VditorClass = (window as any).Vditor;
  const isDark = document.documentElement.className === "dark";
  const htmlResult = VditorClass.md2html(content, {
    theme: isDark ? "dark" : "light",
  });
  const html = await Promise.resolve(htmlResult);

  if (typeof html === "string" && markdownBody.value) {
    markdownBody.value.innerHTML = html;
    highlightAndAnnotateCodeBlocks(markdownBody.value);
  }
};

</script>
