<template>
  <div
    class="item"
    role="button"
    tabindex="0"
    :draggable="isDraggable"
    @dragstart="dragStart"
    @dragover="dragOver"
    @drop="drop"
    @click="itemClick"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    @touchmove="handleTouchMove"
    :data-dir="isDir"
    :data-type="type"
    :data-url="url"
    :data-index="index"
    :aria-label="name"
    :aria-selected="isSelected"
    :data-ext="getExtension(name).toLowerCase()"
    @contextmenu="contextMenu"
  >
    <div>
      <img
        v-if="!readOnly && type === 'image' && isThumbsEnabled"
        v-lazy="thumbnailUrl"
        :alt="name"
      />
      <i v-else class="material-icons file-type-icon" aria-hidden="true"></i>
    </div>

    <div>
      <div class="name">
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
        <button
          v-if="viewMode === 'details'"
          class="mobile-item-more"
          type="button"
          aria-label="更多操作"
          title="更多操作"
          @click.stop="openMobileActionSheet"
        >
          <i class="material-icons" aria-hidden="true">more_vert</i>
        </button>
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

      <div class="detail-meta">
        <span class="detail-type">{{ fileTypeLabel }}</span>
        <span class="detail-path" :title="path">{{ path }}</span>
      </div>

      <p class="size" :data-order="humanSize">
        {{ isDir ? "—" : humanSize }}
      </p>

      <p class="modified">
        <time :datetime="modified">{{ humanTime }}</time>
      </p>

      <div v-if="viewMode === 'details'" class="detail-actions" @click.stop>
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
      </div>
    </div>
  </div>
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
  <Teleport to="body">
    <div
      v-if="showMobileActionSheet"
      class="mobile-item-action-backdrop"
      @click.self="closeMobileActionSheet"
    >
      <div class="mobile-item-action-sheet" role="menu" @click.stop>
        <div class="mobile-item-action-title">{{ name }}</div>
        <button type="button" role="menuitem" @click="runMobileAction('info')">
          <i class="material-icons" aria-hidden="true">info</i>
          <span>详细信息</span>
        </button>
        <button
          v-if="authStore.user?.perm.rename"
          type="button"
          role="menuitem"
          @click="runMobileAction('rename')"
        >
          <i class="material-icons" aria-hidden="true">drive_file_rename_outline</i>
          <span>重命名</span>
        </button>
        <button
          v-if="authStore.user?.perm.rename"
          type="button"
          role="menuitem"
          @click="runMobileAction('move')"
        >
          <i class="material-icons" aria-hidden="true">drive_file_move</i>
          <span>移动</span>
        </button>
        <button
          v-if="authStore.user?.perm.download"
          type="button"
          role="menuitem"
          @click="runMobileAction('download')"
        >
          <i class="material-icons" aria-hidden="true">file_download</i>
          <span>下载</span>
        </button>
        <button
          v-if="authStore.user?.perm.delete"
          class="danger"
          type="button"
          role="menuitem"
          @click="runMobileAction('delete')"
        >
          <i class="material-icons" aria-hidden="true">delete</i>
          <span>删除</span>
        </button>
        <button
          class="cancel"
          type="button"
          role="menuitem"
          @click="closeMobileActionSheet"
        >
          <span>取消</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useCategoriesStore } from "@/stores/categories";
import { useFavoritesStore } from "@/stores/favorites";
import { useTagsStore } from "@/stores/tags";

import { enableThumbs } from "@/utils/constants";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";
import { files as api } from "@/api";
import * as upload from "@/utils/upload";
import { computed, inject, ref } from "vue";
import { useRouter } from "vue-router";
import TagPicker from "@/components/TagPicker.vue";
import type { Resource, ConflictingResource, MoveCopyItem } from "@/types/file";

const touches = ref<number>(0);

const longPressTimer = ref<number | null>(null);
const longPressTriggered = ref<boolean>(false);
const longPressDelay = ref<number>(500);
const startPosition = ref<{ x: number; y: number } | null>(null);
const moveThreshold = ref<number>(10);

const $showError = inject<IToastError>("$showError")!;
const router = useRouter();

const props = defineProps<{
  name: string;
  isDir: boolean;
  url: string;
  type: string;
  extension?: string;
  viewMode?: string;
  size: number;
  modified: string;
  index: number;
  readOnly?: boolean;
  path?: string;
}>();

const authStore = useAuthStore();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const categoriesStore = useCategoriesStore();
const favoritesStore = useFavoritesStore();
const tagsStore = useTagsStore();

const singleClick = computed(
  () => !props.readOnly && authStore.user?.singleClick
);
const isSelected = computed(
  () => fileStore.selected.indexOf(props.index) !== -1
);
const isDraggable = computed(
  () => !props.readOnly && authStore.user?.perm.rename
);

const canDrop = computed(() => {
  if (!props.isDir || props.readOnly) return false;

  for (const i of fileStore.selected) {
    if (fileStore.req?.items[i].url === props.url) {
      return false;
    }
  }

  return true;
});

const thumbnailUrl = computed(() => {
  const file = {
    path: props.path,
    modified: props.modified,
  };

  return api.getPreviewURL(file as Resource, "thumb");
});

const isThumbsEnabled = computed(() => {
  return enableThumbs;
});

const riskLevel = computed(() => {
  if (!props.isDir || !props.path) return "low";
  return categoriesStore.getRiskLevel(props.path);
});

const riskTitle = computed(() => {
  if (riskLevel.value === "high") return "高危操作";
  if (riskLevel.value === "medium") return "中危操作";
  return "";
});

const isFavorited = computed(() => {
  if (!props.path) return false;
  return favoritesStore.isFavorite(props.path);
});

const toggleFav = () => {
  if (!props.path) return;
  favoritesStore.toggleFavorite(props.path, props.name);
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
  if (!props.isDir) {
    api.download(null, props.url);
    return;
  }
  layoutStore.showHover("download");
};

const showTagPicker = ref(false);
const showMobileActionSheet = ref(false);

const pathTags = computed(() => {
  if (!props.path) return [];
  return tagsStore.getTagsForPath(props.path);
});

const toggleTagPicker = (e: Event) => {
  e.stopPropagation();
  e.preventDefault();
  showTagPicker.value = !showTagPicker.value;
};

const closeTagPicker = () => {
  showTagPicker.value = false;
};

const openTagManager = () => {
  showTagPicker.value = false;
  layoutStore.showHover({ prompt: "tag-manager" });
};

const openMobileActionSheet = () => {
  showMobileActionSheet.value = true;
};

const closeMobileActionSheet = () => {
  showMobileActionSheet.value = false;
};

const runMobileAction = (action: string) => {
  closeMobileActionSheet();
  if (action === "download") {
    downloadItem();
    return;
  }
  showItemAction(action);
};

const humanSize = computed(() => {
  if (props.type == "invalid_link") return "无效链接";
  if (props.isDir) return "";
  if (props.size > 0) return filesize(props.size);
  return filesize(props.size);
});

const humanTime = computed(() => {
  if (props.viewMode === "details" || props.viewMode === "compact-list") {
    return dayjs(props.modified).format("YYYY/M/D HH:mm");
  }
  if (!props.readOnly && authStore.user?.dateFormat) {
    return dayjs(props.modified).format("L LT");
  }
  return dayjs(props.modified).fromNow();
});

const fileTypeLabel = computed(() => {
  if (props.isDir) return "文件夹";
  const extension = props.extension?.replace(/^\./, "").toUpperCase();
  if (!extension) return "文件";
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
  return labels[extension.toLowerCase()] || `${extension} 文件`;
});

const dragStart = () => {
  if (fileStore.selectedCount === 0) {
    fileStore.selected.push(props.index);
    return;
  }

  if (!isSelected.value) {
    fileStore.selected = [];
    fileStore.selected.push(props.index);
  }
};

const dragOver = (event: Event) => {
  if (!canDrop.value) return;

  event.preventDefault();
  let el = event.target as HTMLElement | null;
  if (el !== null) {
    for (let i = 0; i < 5; i++) {
      if (!el?.classList.contains("item")) {
        el = el?.parentElement ?? null;
      }
    }

    if (el !== null) el.style.opacity = "1";
  }
};

const drop = async (event: Event) => {
  if (!canDrop.value) return;
  event.preventDefault();

  if (fileStore.selectedCount === 0) return;

  let el = event.target as HTMLElement | null;
  for (let i = 0; i < 5; i++) {
    if (el !== null && !el.classList.contains("item")) {
      el = el.parentElement;
    }
  }

  const items: MoveCopyItem[] = [];

  for (const i of fileStore.selected) {
    if (fileStore.req) {
      items.push({
        from: fileStore.req?.items[i].url,
        to: props.url + encodeURIComponent(fileStore.req?.items[i].name),
        name: fileStore.req?.items[i].name,
        size: fileStore.req?.items[i].size,
        modified: fileStore.req?.items[i].modified,
        isDir: fileStore.req?.items[i].isDir,
        overwrite: false,
        rename: false,
      });
    }
  }

  // Get url from data attribute
  if (el === null) {
    return;
  }
  const path = el.dataset.url || props.url;

  const action = (overwrite?: boolean, rename?: boolean) => {
    const action =
      (event as KeyboardEvent).ctrlKey || (event as KeyboardEvent).metaKey
        ? api.copy
        : api.move;
    action(items, overwrite, rename)
      .then(() => {
        fileStore.reload = true;
      })
      .catch($showError);
  };

  const conflict = await upload.checkConflict(items, path);

  if (conflict.length > 0) {
    layoutStore.showHover({
      prompt: "resolve-conflict",
      props: {
        conflict: conflict,
      },
      confirm: (event: Event, result: Array<ConflictingResource>) => {
        event.preventDefault();
        layoutStore.closeHovers();
        for (let i = result.length - 1; i >= 0; i--) {
          const item = result[i];
          if (item.checked.length == 2) {
            items[item.index].rename = true;
          } else if (item.checked.length == 1 && item.checked[0] == "origin") {
            items[item.index].overwrite = true;
          } else {
            items.splice(item.index, 1);
          }
        }
        if (items.length > 0) {
          action();
        }
      },
    });

    return;
  }

  action(false, false);
};

const itemClick = (event: Event | KeyboardEvent) => {
  // Close pickers on any item click
  showTagPicker.value = false;

  // If long press was triggered, prevent normal click behavior
  if (longPressTriggered.value) {
    longPressTriggered.value = false;
    return;
  }

  if (
    singleClick.value &&
    !(event as KeyboardEvent).ctrlKey &&
    !(event as KeyboardEvent).metaKey &&
    !(event as KeyboardEvent).shiftKey &&
    !fileStore.multiple
  )
    open();
  else click(event);
};

const contextMenu = (event: MouseEvent) => {
  event.preventDefault();
  if (
    fileStore.selected.length === 0 ||
    event.ctrlKey ||
    fileStore.selected.indexOf(props.index) === -1
  ) {
    click(event);
  }
};

const click = (event: Event | KeyboardEvent) => {
  if (!singleClick.value && fileStore.selectedCount !== 0)
    event.preventDefault();

  setTimeout(() => {
    touches.value = 0;
  }, 300);

  touches.value++;
  if (touches.value > 1) {
    open();
  }

  if (fileStore.selected.indexOf(props.index) !== -1) {
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

  if ((event as KeyboardEvent).shiftKey && fileStore.selected.length > 0) {
    let fi = 0;
    let la = 0;

    if (props.index > fileStore.selected[0]) {
      fi = fileStore.selected[0] + 1;
      la = props.index;
    } else {
      fi = props.index;
      la = fileStore.selected[0] - 1;
    }

    for (; fi <= la; fi++) {
      if (fileStore.selected.indexOf(fi) == -1) {
        fileStore.selected.push(fi);
      }
    }

    return;
  }

  if (
    !(event as KeyboardEvent).ctrlKey &&
    !(event as KeyboardEvent).metaKey &&
    !fileStore.multiple
  ) {
    fileStore.selected = [];
  }
  fileStore.selected.push(props.index);
};

const open = () => {
  router.push({ path: props.url });
};

const getExtension = (fileName: string): string => {
  const lastDotIndex = fileName.lastIndexOf(".");
  if (lastDotIndex === -1) {
    return fileName;
  }
  return fileName.substring(lastDotIndex);
};

// Long-press helper functions
const startLongPress = (clientX: number, clientY: number) => {
  startPosition.value = { x: clientX, y: clientY };
  longPressTimer.value = window.setTimeout(() => {
    handleLongPress();
  }, longPressDelay.value);
};

const cancelLongPress = () => {
  if (longPressTimer.value !== null) {
    window.clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  startPosition.value = null;
};

const handleLongPress = () => {
  if (singleClick.value) {
    longPressTriggered.value = true;
    click(new Event("longpress"));
  }
  cancelLongPress();
};

const checkMovement = (clientX: number, clientY: number): boolean => {
  if (!startPosition.value) return false;

  const deltaX = Math.abs(clientX - startPosition.value.x);
  const deltaY = Math.abs(clientY - startPosition.value.y);

  return deltaX > moveThreshold.value || deltaY > moveThreshold.value;
};

// Event handlers
const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 0) {
    startLongPress(event.clientX, event.clientY);
  }
};

const handleMouseUp = () => {
  cancelLongPress();
};

const handleMouseLeave = () => {
  cancelLongPress();
};

const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    startLongPress(touch.clientX, touch.clientY);
  }
};

const handleTouchEnd = () => {
  cancelLongPress();
};

const handleTouchCancel = () => {
  cancelLongPress();
};

const handleTouchMove = (event: TouchEvent) => {
  if (event.touches.length === 1 && startPosition.value) {
    const touch = event.touches[0];
    if (checkMovement(touch.clientX, touch.clientY)) {
      cancelLongPress();
    }
  }
};
</script>
