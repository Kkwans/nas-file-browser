<template>
  <tr
    class="item details-table-row"
    role="button"
    tabindex="0"
    :data-dir="isDir"
    :data-type="type"
    :data-url="url"
    :data-index="index"
    :aria-label="name"
    :aria-selected="isSelected"
    @click="itemClick"
    @dblclick.stop.prevent="open"
    @keydown.enter.prevent="itemClick"
    @keydown.space.prevent="itemClick"
    @contextmenu="contextMenu"
  >
    <td class="details-name-cell">
      <div class="details-identity">
        <img
          v-if="
            !readOnly &&
            (type === 'image' || type === 'video') &&
            isThumbsEnabled
          "
          v-lazy="thumbnailUrl"
          :alt="name"
        />
        <i v-else class="material-icons file-type-icon" aria-hidden="true"></i>
        <div class="details-name-content">
          <div class="name">
            <div class="item-title-row">
              <span class="item-name">{{ name }}</span>
              <i
                v-if="isDir && riskLevel !== 'low'"
                class="material-icons risk-icon"
                :class="'risk-' + riskLevel"
                :title="riskTitle"
                aria-hidden="true"
                >{{ riskLevel === "high" ? "warning" : "info" }}</i
              >
              <div class="item-quick-actions" @click.stop>
                <button
                  class="item-icon-button favorite-star"
                  :class="{ 'is-fav': isFavorited }"
                  type="button"
                  :aria-label="isFavorited ? '取消收藏' : '添加收藏'"
                  :title="isFavorited ? '取消收藏' : '添加收藏'"
                  @click.prevent="toggleFav"
                >
                  <i class="material-icons" aria-hidden="true">{{
                    isFavorited ? "star" : "star_border"
                  }}</i>
                </button>
                <button
                  class="item-icon-button tag-btn"
                  :class="{ 'has-tags': pathTags.length > 0 }"
                  type="button"
                  title="分配标签"
                  aria-label="分配标签"
                  @click.prevent="toggleTagPicker"
                >
                  <i class="material-icons" aria-hidden="true">label</i>
                </button>
              </div>
            </div>
            <div v-if="pathTags.length" class="item-tag-list">
              <span
                v-for="tag in pathTags"
                :key="tag.id"
                class="tag-chip"
                :style="{ '--tag-color': tag.color }"
                :title="tag.name"
              >
                <span class="tag-chip-dot"></span>{{ tag.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </td>
    <td class="details-type-cell">
      <span v-if="!isDir">{{ fileTypeLabel }}</span>
    </td>
    <td class="details-size-cell">{{ isDir ? "—" : humanSize }}</td>
    <td class="details-modified-cell">
      <time :datetime="modified">{{ humanTime }}</time>
    </td>
    <td class="details-actions-cell" @click.stop>
      <button
        class="detail-action-button"
        type="button"
        title="详细信息"
        aria-label="详细信息"
        @click="showItemAction('info')"
      >
        <i class="material-icons">info</i>
      </button>
      <button
        v-if="authStore.user?.perm.rename"
        class="detail-action-button"
        type="button"
        title="重命名"
        aria-label="重命名"
        @click="showItemAction('rename')"
      >
        <i class="material-icons">drive_file_rename_outline</i>
      </button>
      <button
        v-if="authStore.user?.perm.rename"
        class="detail-action-button"
        type="button"
        title="移动"
        aria-label="移动"
        @click="showItemAction('move')"
      >
        <i class="material-icons">drive_file_move</i>
      </button>
      <button
        v-if="authStore.user?.perm.download"
        class="detail-action-button"
        type="button"
        title="下载"
        aria-label="下载"
        @click="downloadItem"
      >
        <i class="material-icons">file_download</i>
      </button>
      <button
        v-if="authStore.user?.perm.delete"
        class="detail-action-button danger"
        type="button"
        title="删除"
        aria-label="删除"
        @click="showItemAction('delete')"
      >
        <i class="material-icons">delete</i>
      </button>
    </td>
  </tr>
  <Teleport to="body">
    <div
      v-if="showTagPicker"
      class="tag-dialog-backdrop"
      @click.self="closeTagPicker"
    >
      <div class="tag-dialog" @click.stop>
        <TagPicker
          :path="path || ''"
          @manage="openTagManager"
          @close="closeTagPicker"
        />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useRouter } from "vue-router";
import TagPicker from "@/components/TagPicker.vue";
import { useAuthStore } from "@/stores/auth";
import { useCategoriesStore } from "@/stores/categories";
import { useFavoritesStore } from "@/stores/favorites";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useTagsStore } from "@/stores/tags";
import { files as api } from "@/api";
import { enableThumbs } from "@/utils/constants";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";

const $showError = inject<IToastError>("$showError")!;
const router = useRouter();
const authStore = useAuthStore();
const categoriesStore = useCategoriesStore();
const favoritesStore = useFavoritesStore();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const tagsStore = useTagsStore();

const props = defineProps<{
  name: string;
  isDir: boolean;
  url: string;
  type: string;
  extension?: string;
  size: number;
  modified: string;
  index: number;
  readOnly?: boolean;
  path?: string;
}>();

const isSelected = computed(() => fileStore.selected.includes(props.index));
const isThumbsEnabled = enableThumbs;
const thumbnailUrl = computed(() =>
  api.getPreviewURL(
    { path: props.path, modified: props.modified } as Parameters<
      typeof api.getPreviewURL
    >[0],
    "thumb"
  )
);
const riskLevel = computed(() => {
  if (!props.isDir || !props.path) return "low";
  return categoriesStore.getRiskLevel(props.path);
});
const riskTitle = computed(() =>
  riskLevel.value === "high"
    ? "高风险操作"
    : riskLevel.value === "medium"
      ? "中风险操作"
      : ""
);
const isFavorited = computed(() =>
  props.path ? favoritesStore.isFavorite(props.path) : false
);
const pathTags = computed(() =>
  props.path ? tagsStore.getTagsForPath(props.path) : []
);
const humanSize = computed(() =>
  props.type === "invalid_link"
    ? "无效链接"
    : props.isDir
      ? ""
      : filesize(props.size)
);
const humanTime = computed(() =>
  dayjs(props.modified).format("YYYY/M/D HH:mm")
);
const fileTypeLabel = computed(() => {
  if (props.isDir) return "";
  const extension = props.extension?.replace(/^\./, "").toLowerCase();
  const labels: Record<string, string> = {
    md: "Markdown 文件",
    db: "数据库文件",
    json: "JSON 文件",
    js: "JavaScript 文件",
    ts: "TypeScript 文件",
    vue: "Vue 组件文件",
    sh: "Shell 脚本",
    mp4: "视频文件",
    mp3: "音频文件",
    jpg: "JPEG 图片",
    jpeg: "JPEG 图片",
    png: "PNG 图片",
  };
  return (
    (extension && labels[extension]) ||
    (extension ? `${extension.toUpperCase()} 文件` : "文件")
  );
});

const toggleFav = () => {
  if (props.path) favoritesStore.toggleFavorite(props.path, props.name);
};
const open = (event?: MouseEvent) => {
  if ((event?.target as HTMLElement | null)?.closest("button")) return;
  router.push({ path: props.url });
};
const toggleTagPicker = () => {
  showTagPicker.value = !showTagPicker.value;
};
const showTagPicker = ref(false);
const closeTagPicker = () => {
  showTagPicker.value = false;
};
const openTagManager = () => {
  closeTagPicker();
  layoutStore.showHover({ prompt: "tag-manager" });
};
const selectForAction = () => {
  fileStore.multiple = false;
  fileStore.selected = [props.index];
};
const showItemAction = (prompt: string) => {
  selectForAction();
  layoutStore.showHover(prompt);
};
const downloadItem = () => {
  selectForAction();
  if (props.isDir) layoutStore.showHover("download");
  else {
    try {
      api.download(null, props.url);
    } catch (error) {
      $showError(error instanceof Error ? error : new Error(String(error)));
    }
  }
};
const itemClick = (event: Event | KeyboardEvent) => {
  if ((event.target as HTMLElement).closest("button")) return;
  if (authStore.user?.singleClick && !fileStore.multiple) {
    router.push({ path: props.url });
    return;
  }
  if (fileStore.selected.includes(props.index)) {
    if (
      (event as KeyboardEvent).ctrlKey ||
      (event as KeyboardEvent).metaKey ||
      fileStore.multiple
    ) {
      fileStore.removeSelected(props.index);
    } else {
      fileStore.selected = [props.index];
    }
    return;
  }
  if (
    !(event as KeyboardEvent).shiftKey &&
    !(event as KeyboardEvent).ctrlKey &&
    !(event as KeyboardEvent).metaKey &&
    !fileStore.multiple
  ) {
    fileStore.selected = [];
  }
  fileStore.selected.push(props.index);
};
const contextMenu = (event: MouseEvent) => {
  event.preventDefault();
  if (!fileStore.selected.includes(props.index) || event.ctrlKey) {
    fileStore.selected = [props.index];
  }
};
</script>
