<template>
  <div class="card floating info-dialog">
    <!-- Header with icon -->
    <div class="card-title info-header">
      <div class="info-title-row">
        <i class="material-icons info-type-icon">{{
          dir ? "folder" : "insert_drive_file"
        }}</i>
        <div class="info-title-text">
          <h2>
            {{
              selected.length > 1
                ? "已选择 " + selected.length + " 个项目"
                : name
            }}
          </h2>
          <span
            class="info-subtitle"
            v-if="selected.length < 2 && showFullPath"
            >{{ fullPath }}</span
          >
        </div>
      </div>
    </div>

    <div class="card-content info-content">
      <!-- Multi-selection banner -->
      <div v-if="selected.length > 1" class="info-banner info-banner-multi">
        <i class="material-icons">checklist</i>
        <span>已选择 {{ selected.length }} 个文件/文件夹</span>
      </div>

      <!-- Basic info rows -->
      <div class="info-row" v-if="selected.length < 2">
        <span class="info-label">类型</span>
        <span class="info-value">{{ dir ? "文件夹" : "文件" }}</span>
      </div>

      <div class="info-row" v-if="selected.length < 2">
        <span class="info-label">名称</span>
        <span class="info-value">{{ name }}</span>
      </div>

      <div class="info-row" v-if="!dir || selected.length > 1">
        <span class="info-label">大小</span>
        <span class="info-value info-size">
          <span id="content_length"></span> {{ humanSize }}
        </span>
      </div>

      <div class="info-row" v-if="resolution">
        <span class="info-label">分辨率</span>
        <span class="info-value"
          >{{ resolution.width }} × {{ resolution.height }}</span
        >
      </div>

      <div class="info-row" v-if="selected.length < 2">
        <span class="info-label">修改时间</span>
        <span class="info-value">{{ humanTime }}</span>
      </div>

      <!-- Directory info -->
      <template v-if="isDirectoryInfo">
        <div class="info-divider"></div>
        <div class="info-row">
          <span class="info-label">文件数</span>
          <span class="info-value">{{ directoryStats?.files ?? "统计中..." }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">文件夹</span>
          <span class="info-value">{{ directoryStats?.directories ?? "统计中..." }}</span>
        </div>
        <div class="info-row" v-if="directoryStats">
          <span class="info-label">总大小</span>
          <span class="info-value info-size">{{ filesize(directoryStats.size) }}</span>
        </div>
        <p v-if="statsError" class="info-stats-error">{{ statsError }}</p>
      </template>

      <!-- Checksums (collapsible) -->
      <template v-if="!dir">
        <div class="info-collapse">
          <button
            class="info-collapse-btn"
            @click="showChecksums = !showChecksums"
            type="button"
          >
            <i class="material-icons" :class="{ rotated: showChecksums }"
              >expand_more</i
            >
            <span>文件校验</span>
          </button>
          <div v-if="showChecksums" class="info-collapse-content">
            <div class="info-row info-checksum">
              <span class="info-label">MD5</span>
              <span class="info-value"
                ><a @click="checksum($event, 'md5')" tabindex="2"
                  >点击以显示</a
                ></span
              >
            </div>
            <div class="info-row info-checksum">
              <span class="info-label">SHA1</span>
              <span class="info-value"
                ><a @click="checksum($event, 'sha1')" tabindex="3"
                  >点击以显示</a
                ></span
              >
            </div>
            <div class="info-row info-checksum">
              <span class="info-label">SHA256</span>
              <span class="info-value"
                ><a @click="checksum($event, 'sha256')" tabindex="4"
                  >点击以显示</a
                ></span
              >
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="card-action info-actions">
      <button
        id="focus-prompt"
        type="submit"
        @click="closeHovers"
        class="button--primary"
        aria-label="确认"
      >
        <i class="material-icons">check</i>
        <span>确认</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";
import { files as api } from "@/api";
import { summarizeDirectory } from "@/utils/directoryStats";

const $showError = inject<IToastError>("$showError")!;
const showChecksums = ref(false);
const directoryStats = ref<ReturnType<typeof summarizeDirectory> | null>(null);
const statsError = ref("");
const route = useRoute();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const { closeHovers } = layoutStore;

const { req, selected, selectedCount, isListing } = storeToRefs(fileStore);

const humanSize = computed(() => {
  if (selectedCount.value === 0 || !isListing.value) {
    return filesize(req.value!.size);
  }
  let sum = 0;
  for (const idx of selected.value) {
    sum += req.value!.items[idx].size;
  }
  return filesize(sum);
});

onMounted(async () => {
  if (!isDirectoryInfo.value) return;
  try {
    directoryStats.value = summarizeDirectory(await api.fetchAll(directoryPath.value));
  } catch {
    statsError.value = "目录统计失败，请稍后重试";
  }
});

const humanTime = computed(() => {
  if (selectedCount.value === 0) {
    return dayjs(req.value!.modified).fromNow();
  }
  return dayjs(req.value!.items[selected.value[0]].modified).fromNow();
});

const name = computed(() => {
  return selectedCount.value === 0
    ? req.value!.name
    : req.value!.items[selected.value[0]].name;
});

const fullPath = computed(() => {
  if (selectedCount.value === 0) {
    return route.path;
  }
  const item = req.value!.items[selected.value[0]];
  const parentPath = route.path.endsWith("/") ? route.path : route.path + "/";
  return parentPath + item.name;
});

const showFullPath = computed(() => {
  return selected.value.length < 2;
});

const dir = computed(() => {
  return (
    selectedCount.value > 1 ||
    (selectedCount.value === 0
      ? req.value!.isDir
      : req.value!.items[selected.value[0]].isDir)
  );
});

const isDirectoryInfo = computed(() => dir.value && selectedCount.value <= 1);

const directoryPath = computed(() => {
  if (selectedCount.value === 0) return route.path;
  return req.value!.items[selected.value[0]].url;
});

const resolution = computed(() => {
  if (selectedCount.value === 1) {
    const selectedItem = req.value!.items[selected.value[0]] as any;
    if (selectedItem && selectedItem.type === "image") {
      return selectedItem.resolution;
    }
  } else if (req.value && (req.value as any).type === "image") {
    return (req.value as any).resolution;
  }
  return null;
});

const checksum = async (
  event: Event,
  algo: "md5" | "sha1" | "sha256" | "sha512"
) => {
  event.preventDefault();
  const target = event.target as HTMLElement;

  let link: string;
  if (selectedCount.value) {
    link = req.value!.items[selected.value[0]].url;
  } else {
    link = route.path;
  }

  try {
    const hash = await api.checksum(link, algo);
    target.textContent = hash;
  } catch (e: any) {
    $showError(e);
  }
};
</script>

<style scoped>
.info-dialog {
  max-width: 32em;
}

/* Header with icon */
.info-header {
  padding-bottom: 0.5em;
}

.info-title-row {
  display: flex;
  align-items: center;
  gap: 0.75em;
}

.info-type-icon {
  font-size: 2em;
  padding: 0.35em;
  border-radius: 0.5em;
  background: var(--surfaceSecondary, #f0f0f5);
  flex-shrink: 0;
}

.info-title-text {
  min-width: 0;
}

.info-title-text h2 {
  margin: 0 0 0.1em !important;
  font-size: 1.05em !important;
}

.info-subtitle {
  display: block;
  font-size: 0.8em;
  color: var(--textPrimary, #888);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 22em;
}

/* Content layout */
.info-content {
  padding: 0.75em 1.25em 0.5em;
}

/* Row layout: label | value */
.info-row {
  display: flex;
  align-items: flex-start;
  padding: 0.45em 0;
  gap: 0.75em;
  border-bottom: 1px solid var(--divider, rgba(0, 0, 0, 0.04));
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  flex-shrink: 0;
  width: 5.5em;
  font-size: 0.85em;
  font-weight: 600;
  color: var(--textPrimary, #666);
  padding-top: 0.1em;
}

.info-value {
  font-size: 0.9em;
  color: var(--textPrimary, #333);
  word-break: break-all;
  line-height: 1.5;
}

.path-value {
  font-size: 0.82em;
  font-family: "SF Mono", "Fira Code", monospace;
  background: var(--surfaceSecondary, #f5f5f8);
  padding: 0.25em 0.5em;
  border-radius: 0.35em;
  word-break: break-all;
  color: var(--textPrimary, #555);
}

.info-size {
  font-weight: 600;
  color: var(--textPrimary, #222);
}

/* Divider */
.info-divider {
  height: 1px;
  background: var(--divider, rgba(0, 0, 0, 0.06));
  margin: 0.5em 0;
}

/* Banner */
.info-banner {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.6em 0.85em;
  border-radius: 0.5em;
  font-size: 0.88em;
  margin-bottom: 0.75em;
}

.info-banner-multi {
  background: var(--surfaceSecondary, #f0f0f5);
  color: var(--textPrimary, #666);
}

.info-banner i {
  font-size: 1.2em;
  color: var(--blue, #2196f3);
}

/* Collapsible checksums */
.info-collapse {
  margin-top: 0.5em;
}

.info-collapse-btn {
  display: flex;
  align-items: center;
  gap: 0.4em;
  width: 100%;
  padding: 0.6em 0;
  border: none;
  background: none;
  color: var(--blue, #2196f3);
  font-size: 0.85em;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  border-top: 1px solid var(--divider, rgba(0, 0, 0, 0.04));
}

.info-collapse-btn:hover {
  opacity: 0.8;
}

.info-collapse-btn i {
  font-size: 1.1em;
  transition: transform 0.2s;
}

.info-collapse-content {
  padding: 0.25em 0;
}

.info-checksum {
  padding: 0.3em 0;
}

.info-checksum .info-value {
  font-size: 0.82em;
}

.info-checksum a {
  color: var(--blue, #2196f3);
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
  text-decoration-color: rgba(33, 150, 243, 0.3);
  transition: opacity 0.15s;
}

.info-checksum a:hover {
  opacity: 0.8;
}

/* Action buttons */
.info-actions {
  justify-content: flex-end !important;
  padding-top: 0.5em;
}

.info-actions .button--primary {
  display: flex;
  align-items: center;
  gap: 0.35em;
  padding: 0.5em 1em;
  border-radius: 0.5em;
  font-size: 0.85em;
  font-weight: 600;
  color: var(--blue, #2196f3);
  background: rgba(33, 150, 243, 0.06);
  border: none;
  cursor: pointer;
  transition: all 0.15s;
}

.info-actions .button--primary:hover {
  background: rgba(33, 150, 243, 0.12);
  transform: translateY(-1px);
}

.info-actions .button--primary:active {
  transform: scale(0.97);
}

.info-actions .button--primary i {
  font-size: 1.1em;
}

/* Dark mode */
:root.dark .info-type-icon,
html.dark .info-type-icon {
  background: rgba(255, 255, 255, 0.06);
}

:root.dark .info-row {
  border-bottom-color: rgba(255, 255, 255, 0.04);
}

:root.dark .info-label {
  color: rgba(255, 255, 255, 0.5);
}

:root.dark .info-value {
  color: rgba(255, 255, 255, 0.85);
}

:root.dark .path-value {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
}

:root.dark .info-size {
  color: rgba(255, 255, 255, 0.95);
}

:root.dark .info-banner-multi {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.7);
}

:root.dark .info-collapse-btn {
  border-top-color: rgba(255, 255, 255, 0.06);
}
</style>
