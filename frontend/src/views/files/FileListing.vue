<template>
  <div>
    <header-bar showMenu showLogo>
      <div v-if="!isMobile" class="listing-search">
        <i class="material-icons" aria-hidden="true">search</i>
        <input
          v-model.trim="inlineSearch"
          type="search"
          aria-label="在当前目录搜索"
          placeholder="在当前目录搜索文件"
          @keyup.enter="submitInlineSearch"
          @keyup.escape="clearInlineSearch"
        />
        <button
          v-if="inlineSearch"
          type="button"
          class="listing-search-submit"
          aria-label="开始搜索"
          title="开始搜索"
          @click="submitInlineSearch"
        >
          <i class="material-icons" aria-hidden="true">arrow_forward</i>
        </button>
      </div>
      <div v-else class="listing-mobile-title" :title="mobileDirectoryTitle">
        {{ mobileDirectoryTitle }}
      </div>

      <template #mobile-actions>
        <action
          class="search-button"
          icon="search"
          label="搜索"
          @action="openSearch()"
        />
      </template>

      <template #actions>
        <template v-if="!isMobile">
          <action
            v-if="headerButtons.share"
            icon="share"
            label="分享"
            show="share"
          />
          <action
            v-if="headerButtons.rename"
            icon="mode_edit"
            label="重命名"
            show="rename"
          />
          <action
            v-if="headerButtons.copy"
            id="copy-button"
            icon="content_copy"
            label="复制文件"
            show="copy"
          />
          <action
            v-if="headerButtons.move"
            id="move-button"
            icon="forward"
            label="移动文件"
            show="move"
          />
          <action
            v-if="headerButtons.delete"
            id="delete-button"
            icon="delete"
            label="删除"
            show="delete"
          />
        </template>

        <action
          v-if="headerButtons.shell"
          icon="code"
          label="终端"
          @action="layoutStore.toggleShell"
        />
        <!-- View Mode Dropdown -->
        <div class="view-mode-dropdown" ref="viewDropdownRef">
          <action
            :icon="viewIcon"
            label="切换视图"
            @action="toggleViewDropdown"
          />
          <div v-if="showViewDropdown" class="dropdown-menu">
            <button
              v-for="mode in viewModes"
              :key="mode.value"
              class="dropdown-item"
              :class="{ active: currentViewMode === mode.value }"
              @click="selectViewMode(mode.value)"
            >
              <i class="material-icons">{{ mode.icon }}</i>
              <span>{{ mode.label }}</span>
              <i
                v-if="currentViewMode === mode.value"
                class="material-icons check"
                >check</i
              >
            </button>
            <template v-if="currentViewMode === 'compact-grid'">
              <div class="dropdown-divider"></div>
              <div class="dropdown-section-title">图标大小</div>
              <button
                v-for="size in compactGridSizes"
                :key="size.value"
                class="dropdown-item compact-grid-size-option"
                :class="{ active: compactGridSize === size.value }"
                type="button"
                @click="selectCompactGridSize(size.value)"
              >
                <i class="material-icons">{{ size.icon }}</i>
                <span>{{ size.label }}</span>
                <i
                  v-if="compactGridSize === size.value"
                  class="material-icons check"
                  aria-hidden="true"
                  >check</i
                >
              </button>
            </template>
          </div>
        </div>
        <!-- Sort Dropdown -->
        <div class="sort-dropdown" ref="sortDropdownRef">
          <action icon="sort" label="排序" @action="toggleSortDropdown" />
          <div v-if="showSortDropdown" class="dropdown-menu">
            <button
              v-for="opt in sortOptions"
              :key="opt.by"
              class="dropdown-item"
              :class="{ active: currentSortBy === opt.by }"
              @click="selectSort(opt.by)"
            >
              <i class="material-icons">{{ opt.icon }}</i>
              <span>{{ opt.label }}</span>
              <i
                v-if="currentSortBy === opt.by"
                class="material-icons sort-arrow"
              >
                {{ currentSortAsc ? "arrow_upward" : "arrow_downward" }}
              </i>
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="toggleSortDirection">
              <i class="material-icons">swap_vert</i>
              <span>{{ currentSortAsc ? "降序排列" : "升序排列" }}</span>
            </button>
          </div>
        </div>
        <action
          v-if="headerButtons.download"
          icon="file_download"
          label="下载"
          @action="download"
          :counter="fileStore.selectedCount"
        />
        <action
          v-if="headerButtons.upload"
          icon="file_upload"
          id="upload-button"
          label="上传"
          @action="uploadFunc"
        />
        <action icon="info" label="详细信息" show="info" />
        <action
          icon="check_circle"
          label="多选"
          @action="toggleMultipleSelection"
        />
      </template>
    </header-bar>

    <div
      v-if="shouldRenderMobileSelectionBar"
      id="file-selection"
      :class="{
        'file-selection-margin-bottom': fileStore.multiple,
      }"
    >
      <span v-if="fileStore.selectedCount > 0"> 已选择 </span>
      <action icon="select_all" label="全选" @action="selectAll" />
      <action
        v-if="headerButtons.share"
        icon="share"
        label="分享"
        show="share"
      />
      <action
        v-if="headerButtons.rename"
        icon="mode_edit"
        label="重命名"
        show="rename"
      />
      <action
        v-if="headerButtons.copy"
        icon="content_copy"
        label="复制"
        show="copy"
      />
      <action
        v-if="headerButtons.move"
        icon="forward"
        label="移动"
        show="move"
      />
      <action
        v-if="headerButtons.delete"
        icon="delete"
        label="删除"
        show="delete"
      />
    </div>

    <div v-if="layoutStore.loading" class="loading-skeleton-wrapper">
      <LoadingSkeleton :count="12" :viewMode="skeletonViewMode" />
    </div>
    <template v-else>
      <div
        v-if="
          items.dirs.length + items.files.length === 0 &&
          !tagsStore.activeFilterTag
        "
      >
        <h2 class="message">
          <i class="material-icons">sentiment_dissatisfied</i>
          <span>这里没有任何文件...</span>
        </h2>
        <input
          style="display: none"
          type="file"
          id="upload-input"
          @change="uploadInput($event)"
          multiple
        />
        <input
          style="display: none"
          type="file"
          id="upload-folder-input"
          @change="uploadInput($event)"
          webkitdirectory
          multiple
        />
      </div>
      <div
        v-else
        id="listing"
        ref="listing"
        class="file-icons"
        data-clear-on-click="true"
        :class="listingClass"
        @click="handleEmptyAreaClick"
      >
        <template v-if="!isDesktopDetails">
          <div>
            <div class="listing-table-header">
              <div>
                <p
                  class="name"
                  role="button"
                  tabindex="0"
                  :aria-sort="headerSortState('name')"
                  @click="sortByHeader('name')"
                  @keyup.enter="sortByHeader('name')"
                >
                  <span>名称</span>
                </p>
                <p
                  class="type"
                  role="button"
                  tabindex="0"
                  :aria-sort="headerSortState('type')"
                  @click="sortByHeader('type')"
                  @keyup.enter="sortByHeader('type')"
                >
                  <span>类型</span>
                </p>
                <p
                  class="size"
                  role="button"
                  tabindex="0"
                  :aria-sort="headerSortState('size')"
                  @click="sortByHeader('size')"
                  @keyup.enter="sortByHeader('size')"
                >
                  <span>大小</span>
                </p>
                <p
                  class="modified"
                  role="button"
                  tabindex="0"
                  :aria-sort="headerSortState('modified')"
                  @click="sortByHeader('modified')"
                  @keyup.enter="sortByHeader('modified')"
                >
                  <span>修改时间</span>
                </p>
                <p class="actions"><span>操作</span></p>
              </div>
            </div>
          </div>

          <div v-if="tagsStore.activeFilterTag" class="tag-filter-indicator">
            <i
              class="material-icons"
              :style="{ color: tagsStore.activeFilterTag.color }"
              >label</i
            >
            <span
              >正在按标签筛选：<strong>{{
                tagsStore.activeFilterTag.name
              }}</strong></span
            >
            <div
              class="tag-filter-scope"
              role="group"
              aria-label="标签筛选范围"
            >
              <button
                type="button"
                :class="{ active: tagsStore.filterMode === 'current' }"
                @click="tagsStore.setFilterMode('current')"
              >
                当前目录
              </button>
              <button
                type="button"
                :class="{ active: tagsStore.filterMode === 'global' }"
                @click="tagsStore.setFilterMode('global')"
              >
                全局
              </button>
            </div>
            <button
              class="tag-filter-clear-btn"
              type="button"
              @click="tagsStore.setFilter(null)"
            >
              <i class="material-icons">close</i>
            </button>
          </div>

          <div
            v-if="items.dirs.length + items.files.length === 0"
            class="message filtered-empty"
          >
            <i class="material-icons">filter_alt_off</i>
            <span>当前目录没有匹配项，可切换为全局筛选或清除筛选</span>
          </div>

          <h2 data-clear-on-click="true" v-if="items.dirs.length > 0">
            文件夹
            <button
              v-if="hasSystemDirs"
              class="system-dirs-toggle"
              @click="toggleSystemDirs"
              :title="showSystemDirs ? '隐藏系统文件夹' : '显示系统文件夹'"
            >
              <i class="material-icons">{{
                showSystemDirs ? "expand_less" : "expand_more"
              }}</i>
              <span>{{ systemDirs.length }} 项</span>
            </button>
          </h2>
          <div
            v-if="items.dirs.length > 0"
            data-clear-on-click="true"
            @contextmenu="showContextMenu"
          >
            <item
              v-for="item in dirs"
              :key="base64(item.name)"
              v-bind:index="item.index"
              v-bind:name="item.name"
              v-bind:isDir="item.isDir"
              v-bind:url="item.url"
              v-bind:modified="item.modified"
              v-bind:type="item.type"
              v-bind:extension="item.extension"
              v-bind:view-mode="currentViewMode"
              v-bind:size="item.size"
              v-bind:path="item.path"
            >
            </item>
          </div>

          <h2 data-clear-on-click="true" v-if="files.length > 0">文件</h2>
          <div
            v-if="files.length > 0"
            data-clear-on-click="true"
            @contextmenu="showContextMenu"
          >
            <item
              v-for="item in files"
              :key="base64(item.name)"
              v-bind:index="item.index"
              v-bind:name="item.name"
              v-bind:isDir="item.isDir"
              v-bind:url="item.url"
              v-bind:modified="item.modified"
              v-bind:type="item.type"
              v-bind:extension="item.extension"
              v-bind:view-mode="currentViewMode"
              v-bind:size="item.size"
              v-bind:path="item.path"
            >
            </item>
          </div>
        </template>

        <template v-else>
          <div v-if="tagsStore.activeFilterTag" class="tag-filter-indicator">
            <i
              class="material-icons"
              :style="{ color: tagsStore.activeFilterTag.color }"
              >label</i
            >
            <span
              >正在按标签筛选：<strong>{{
                tagsStore.activeFilterTag.name
              }}</strong></span
            >
            <div
              class="tag-filter-scope"
              role="group"
              aria-label="标签筛选范围"
            >
              <button
                type="button"
                :class="{ active: tagsStore.filterMode === 'current' }"
                @click="tagsStore.setFilterMode('current')"
              >
                当前目录
              </button>
              <button
                type="button"
                :class="{ active: tagsStore.filterMode === 'global' }"
                @click="tagsStore.setFilterMode('global')"
              >
                全局
              </button>
            </div>
            <button
              class="tag-filter-clear-btn"
              type="button"
              aria-label="清除筛选"
              @click="tagsStore.setFilter(null)"
            >
              <i class="material-icons">close</i>
            </button>
          </div>
          <div class="details-table-shell">
            <table class="details-table" aria-label="文件列表">
              <colgroup>
                <col class="details-col-name" />
                <col class="details-col-type" />
                <col class="details-col-size" />
                <col class="details-col-modified" />
                <col class="details-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">
                    <button
                      type="button"
                      class="details-sort-button"
                      :aria-sort="headerSortState('name')"
                      @click="sortByHeader('name')"
                    >
                      名称
                      <i
                        v-if="currentSortBy === 'name'"
                        class="material-icons"
                        aria-hidden="true"
                        >{{
                          currentSortAsc ? "arrow_upward" : "arrow_downward"
                        }}</i
                      >
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      class="details-sort-button"
                      :aria-sort="headerSortState('type')"
                      @click="sortByHeader('type')"
                    >
                      类型
                      <i
                        v-if="currentSortBy === 'type'"
                        class="material-icons"
                        aria-hidden="true"
                        >{{
                          currentSortAsc ? "arrow_upward" : "arrow_downward"
                        }}</i
                      >
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      class="details-sort-button"
                      :aria-sort="headerSortState('size')"
                      @click="sortByHeader('size')"
                    >
                      大小
                      <i
                        v-if="currentSortBy === 'size'"
                        class="material-icons"
                        aria-hidden="true"
                        >{{
                          currentSortAsc ? "arrow_upward" : "arrow_downward"
                        }}</i
                      >
                    </button>
                  </th>
                  <th scope="col">
                    <button
                      type="button"
                      class="details-sort-button"
                      :aria-sort="headerSortState('modified')"
                      @click="sortByHeader('modified')"
                    >
                      修改时间
                      <i
                        v-if="currentSortBy === 'modified'"
                        class="material-icons"
                        aria-hidden="true"
                        >{{
                          currentSortAsc ? "arrow_upward" : "arrow_downward"
                        }}</i
                      >
                    </button>
                  </th>
                  <th scope="col" class="details-actions-heading">操作</th>
                </tr>
              </thead>
              <tbody @contextmenu="showContextMenu">
                <tr v-if="dirs.length > 0" class="details-group-row">
                  <th colspan="5" scope="rowgroup">文件夹</th>
                </tr>
                <DetailedTableRow
                  v-for="item in dirs"
                  :key="base64(item.name)"
                  v-bind="item"
                />
                <tr v-if="files.length > 0" class="details-group-row">
                  <th colspan="5" scope="rowgroup">文件</th>
                </tr>
                <DetailedTableRow
                  v-for="item in files"
                  :key="base64(item.name)"
                  v-bind="item"
                />
              </tbody>
            </table>
          </div>
        </template>

        <context-menu
          :show="isContextMenuVisible"
          :pos="contextMenuPos"
          @hide="hideContextMenu"
        >
          <action
            v-if="headerButtons.share"
            icon="share"
            label="分享"
            show="share"
          />
          <action
            v-if="headerButtons.rename"
            icon="mode_edit"
            label="重命名"
            show="rename"
          />
          <action
            v-if="headerButtons.copy"
            id="copy-button"
            icon="content_copy"
            label="复制文件"
            show="copy"
          />
          <action
            v-if="headerButtons.move"
            id="move-button"
            icon="forward"
            label="移动文件"
            show="move"
          />
          <action
            v-if="headerButtons.delete"
            id="delete-button"
            icon="delete"
            label="删除"
            show="delete"
          />
          <action
            v-if="headerButtons.download"
            icon="file_download"
            label="下载"
            @action="download"
          />
          <action icon="info" label="详细信息" show="info" />
        </context-menu>

        <input
          style="display: none"
          type="file"
          id="upload-input"
          @change="uploadInput($event)"
          multiple
        />
        <input
          style="display: none"
          type="file"
          id="upload-folder-input"
          @change="uploadInput($event)"
          webkitdirectory
          multiple
        />

        <div :class="{ active: fileStore.multiple }" id="multiple-selection">
          <div class="selection-info">
            <i class="material-icons">check_circle</i>
            <span v-if="fileStore.selectedCount > 0"> 已选择 </span>
            <span v-else>多选模式已开启</span>
          </div>
          <div class="selection-actions">
            <button
              class="selection-btn"
              @click="selectAll"
              title="全选"
              aria-label="全选"
            >
              <i class="material-icons">select_all</i>
              <span>全选</span>
            </button>
            <button
              v-if="fileStore.selectedCount > 0"
              class="selection-btn"
              @click="invertSelection"
              title="反选"
              aria-label="反选"
            >
              <i class="material-icons">flip</i>
              <span>反选</span>
            </button>
            <template v-if="fileStore.selectedCount > 0">
              <button
                v-if="headerButtons.copy"
                class="selection-btn action-btn"
                @click="layoutStore.showHover('copy')"
              >
                <i class="material-icons">content_copy</i>
                <span>复制文件</span>
              </button>
              <button
                v-if="headerButtons.move"
                class="selection-btn action-btn"
                @click="layoutStore.showHover('move')"
              >
                <i class="material-icons">forward</i>
                <span>移动文件</span>
              </button>
              <button
                v-if="headerButtons.download"
                class="selection-btn action-btn"
                @click="download"
              >
                <i class="material-icons">file_download</i>
                <span>下载</span>
              </button>
              <button
                v-if="headerButtons.delete"
                class="selection-btn action-btn danger"
                @click="layoutStore.showHover('delete')"
              >
                <i class="material-icons">delete</i>
                <span>删除</span>
              </button>
            </template>
            <button
              class="selection-btn close-btn"
              @click="
                () => {
                  fileStore.multiple = false;
                  fileStore.selected = [];
                }
              "
              title="关闭"
              aria-label="关闭"
            >
              <i class="material-icons">close</i>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useClipboardStore } from "@/stores/clipboard";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useTagsStore } from "@/stores/tags";

import { users, files as api } from "@/api";
import { enableExec } from "@/utils/constants";
import * as upload from "@/utils/upload";
import {
  normalizeViewMode,
  selectForContextMenu,
  sortItemsByType,
} from "@/utils/fileListing";
import { shouldRenderMobileSelection } from "@/utils/layoutContract";
import { throttle } from "lodash-es";
import { Base64 } from "js-base64";

import HeaderBar from "@/components/header/HeaderBar.vue";
import Action from "@/components/header/Action.vue";
import Item from "@/components/files/ListingItem.vue";
import DetailedTableRow from "@/components/files/DetailedTableRow.vue";
import ContextMenu from "@/components/ContextMenu.vue";
import LoadingSkeleton from "@/components/LoadingSkeleton.vue";
import type {
  ResourceItem,
  PasteItem,
  ConflictingResource,
  DownloadFormat,
} from "@/types/file";
import type { ViewModeType } from "@/types/user";
import {
  computed,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter, onBeforeRouteUpdate } from "vue-router";
import { storeToRefs } from "pinia";
import { removePrefix } from "@/api/utils";
import { normalizeSearchBase } from "@/utils/searchPath";

const showLimit = ref<number>(50);
const tagsStore = useTagsStore();
const dragCounter = ref<number>(0);
const width = ref<number>(window.innerWidth);
const itemWeight = ref<number>(0);
const isContextMenuVisible = ref<boolean>(false);
const contextMenuPos = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const $showError = inject<IToastError>("$showError")!;

const clipboardStore = useClipboardStore();
const authStore = useAuthStore();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();

// View mode dropdown
const showViewDropdown = ref<boolean>(false);
const viewDropdownRef = ref<HTMLElement | null>(null);
const storedViewMode = localStorage.getItem("nas-file-browser-view-mode");
const currentViewMode = ref<ViewModeType>(
  normalizeViewMode(storedViewMode ?? authStore.user?.viewMode)
);
const viewModes = [
  {
    value: "mosaic" as ViewModeType,
    icon: "grid_view",
    label: "详细网格",
  },
  {
    value: "compact-grid" as ViewModeType,
    icon: "grid_on",
    label: "紧凑网格",
  },
  {
    value: "details" as ViewModeType,
    icon: "table_rows",
    label: "详细列表",
  },
  {
    value: "compact-list" as ViewModeType,
    icon: "view_headline",
    label: "紧凑列表",
  },
];
type CompactGridSize = "small" | "medium" | "large" | "xlarge";
const compactGridSizes: Array<{
  value: CompactGridSize;
  icon: string;
  label: string;
}> = [
  { value: "small", icon: "view_comfy", label: "小图标" },
  { value: "medium", icon: "grid_on", label: "中图标" },
  { value: "large", icon: "grid_view", label: "大图标" },
  { value: "xlarge", icon: "photo_size_select_large", label: "超大图标" },
];
const storedCompactGridSize = localStorage.getItem(
  "nas-file-browser-compact-grid-size"
);
const compactGridSize = ref<CompactGridSize>(
  compactGridSizes.some((item) => item.value === storedCompactGridSize)
    ? (storedCompactGridSize as CompactGridSize)
    : "medium"
);

// Sort dropdown
const showSortDropdown = ref<boolean>(false);
const sortDropdownRef = ref<HTMLElement | null>(null);
const currentSortBy = ref<string>(fileStore.req?.sorting?.by || "name");
const currentSortAsc = ref<boolean>(fileStore.req?.sorting?.asc || false);
const inlineSearch = ref("");
const sortOptions = [
  { by: "name", icon: "sort_by_alpha", label: "按名称排序" },
  { by: "size", icon: "data_usage", label: "按大小排序" },
  { by: "modified", icon: "schedule", label: "按修改时间排序" },
  { by: "type", icon: "category", label: "按类型排序" },
];

// @-prefix folder collapse
const showSystemDirs = ref<boolean>(
  localStorage.getItem("nas-file-browser-show-system-dirs") === "true"
);

const { req } = storeToRefs(fileStore);

const route = useRoute();
const router = useRouter();
onBeforeRouteUpdate(() => {
  hideContextMenu();
});

const listing = ref<HTMLElement | null>(null);

const normalDirs = computed(() =>
  items.value.dirs
    .filter((d) => !d.name.startsWith("@"))
    .slice(0, showLimit.value)
);
const systemDirs = computed(() =>
  items.value.dirs
    .filter((d) => d.name.startsWith("@"))
    .slice(0, showLimit.value)
);
const dirs = computed(() => {
  if (showSystemDirs.value) {
    return items.value.dirs.slice(0, showLimit.value);
  }
  return normalDirs.value;
});
const hasSystemDirs = computed(() => systemDirs.value.length > 0);
const toggleSystemDirs = () => {
  showSystemDirs.value = !showSystemDirs.value;
  localStorage.setItem(
    "nas-file-browser-show-system-dirs",
    String(showSystemDirs.value)
  );
};

const items = computed(() => {
  const dirs: ResourceItem[] = [];
  const files: ResourceItem[] = [];

  // Get the parent path for constructing full paths
  const parentPath = fileStore.req?.path ?? "";

  fileStore.req?.items.forEach((item) => {
    // Build the full path for tag matching
    const fullPath =
      item.path ||
      (parentPath
        ? parentPath.replace(/\/$/, "") + "/" + item.name
        : "/" + item.name);

    // Apply tag filter (files and directories)
    if (!tagsStore.matchesFilter(fullPath)) {
      return; // skip this item
    }

    if (item.isDir) {
      dirs.push(item);
    } else {
      files.push(item);
    }
  });

  if (currentSortBy.value === "type") {
    return {
      dirs: sortItemsByType(dirs, currentSortAsc.value),
      files: sortItemsByType(files, currentSortAsc.value),
    };
  }

  return { dirs, files };
});

const files = computed((): ResourceItem[] => {
  let _showLimit = showLimit.value - items.value.dirs.length;

  if (_showLimit < 0) _showLimit = 0;

  return items.value.files.slice(0, _showLimit);
});

const skeletonViewMode = computed(() => {
  const mode = currentViewMode.value;
  if (mode === "details" || mode === "compact-list") return "list";
  if (mode === "compact-grid") return "mosaic";
  return mode;
});

const listingClass = computed(() => ({
  [currentViewMode.value]: true,
  ...(currentViewMode.value === "compact-grid"
    ? { [`compact-grid-size-${compactGridSize.value}`]: true }
    : {}),
}));

const viewIcon = computed(() => {
  const icons: Record<string, string> = {
    mosaic: "grid_view",
    "compact-grid": "grid_on",
    details: "table_rows",
    "compact-list": "view_headline",
  };
  return icons[currentViewMode.value] || "grid_view";
});

const headerButtons = computed(() => {
  return {
    upload: authStore.user?.perm.create,
    download: authStore.user?.perm.download,
    shell: authStore.user?.perm.execute && enableExec,
    delete: fileStore.selectedCount > 0 && authStore.user?.perm.delete,
    rename: fileStore.selectedCount === 1 && authStore.user?.perm.rename,
    share:
      fileStore.selectedCount === 1 &&
      authStore.user?.perm.share &&
      authStore.user?.perm.download,
    move: fileStore.selectedCount > 0 && authStore.user?.perm.rename,
    copy: fileStore.selectedCount > 0 && authStore.user?.perm.create,
  };
});

const isMobile = computed(() => {
  return width.value <= 899;
});

const isDesktopDetails = computed(
  () => currentViewMode.value === "details" && !isMobile.value
);

const mobileDirectoryTitle = computed(() => {
  const name = fileStore.req?.name?.trim();
  if (name) return name;
  const segments = route.path.split("/").filter(Boolean);
  return segments.at(-1) || "我的文件";
});

const shouldRenderMobileSelectionBar = computed(() =>
  shouldRenderMobileSelection(
    isMobile.value,
    fileStore.multiple,
    fileStore.selectedCount
  )
);

watch(req, () => {
  // Reset the show value
  showLimit.value = 50;

  // Sync sort state from server
  if (fileStore.req?.sorting) {
    currentSortBy.value = fileStore.req.sorting.by;
    currentSortAsc.value = fileStore.req.sorting.asc;
  }

  nextTick(() => {
    // Ensures that the listing is displayed
    // How much every listing item affects the window height
    setItemWeight();

    // Scroll to the item opened previously
    if (!revealPreviousItem()) {
      // Fill and fit the window with listing items
      fillWindow(true);
    }
  });
});

onMounted(() => {
  // How much every listing item affects the window height
  setItemWeight();

  // Scroll to the item opened previously
  if (!revealPreviousItem()) {
    // Fill and fit the window with listing items
    fillWindow(true);
  }

  // Add the needed event listeners to the window and document.
  window.addEventListener("keydown", keyEvent);
  window.addEventListener("scroll", scrollEvent);
  window.addEventListener("resize", windowsResize);
  document.addEventListener("click", handleOutsideClick);

  if (!authStore.user?.perm.create) return;
  document.addEventListener("dragover", preventDefault);
  document.addEventListener("dragenter", dragEnter);
  document.addEventListener("dragleave", dragLeave);
  document.addEventListener("drop", drop);
});

onBeforeUnmount(() => {
  // Remove event listeners before destroying this page.
  window.removeEventListener("keydown", keyEvent);
  window.removeEventListener("scroll", scrollEvent);
  window.removeEventListener("resize", windowsResize);
  document.removeEventListener("click", handleOutsideClick);

  if (authStore.user && !authStore.user?.perm.create) return;
  document.removeEventListener("dragover", preventDefault);
  document.removeEventListener("dragenter", dragEnter);
  document.removeEventListener("dragleave", dragLeave);
  document.removeEventListener("drop", drop);
});

const base64 = (name: string) => Base64.encodeURI(name);

const keyEvent = (event: KeyboardEvent) => {
  // No prompts are shown
  if (layoutStore.currentPrompt !== null) {
    return;
  }

  if (event.key === "Escape") {
    // Reset files selection.
    fileStore.selected = [];
  }

  // Arrow key navigation
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const allItems = [...items.value.dirs, ...items.value.files];
    if (allItems.length === 0) return;

    const currentIndex =
      fileStore.selected.length > 0
        ? fileStore.selected[fileStore.selected.length - 1]
        : -1;

    let newIndex: number;
    if (event.key === "ArrowDown") {
      newIndex =
        currentIndex < 0
          ? allItems[0].index
          : Math.min(currentIndex + 1, allItems[allItems.length - 1].index);
    } else {
      newIndex =
        currentIndex < 0
          ? allItems[allItems.length - 1].index
          : Math.max(currentIndex - 1, allItems[0].index);
    }

    // Shift+Arrow for range selection
    if (event.shiftKey) {
      if (fileStore.selected.indexOf(newIndex) === -1) {
        fileStore.selected.push(newIndex);
      }
    } else {
      fileStore.selected = [newIndex];
    }

    // Scroll selected item into view
    nextTick(() => {
      const items = document.querySelectorAll("#listing .item");
      const targetItem = items[newIndex];
      if (targetItem) {
        targetItem.scrollIntoView({ block: "nearest" });
      }
    });
    return;
  }

  // Enter key - open selected item
  if (event.key === "Enter") {
    if (fileStore.selectedCount === 1) {
      const item = fileStore.req?.items[fileStore.selected[0]];
      if (item) {
        router.push({ path: item.url });
      }
    }
    return;
  }

  // Home - jump to first item
  if (event.key === "Home" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    const allItems = [...items.value.dirs, ...items.value.files];
    if (allItems.length > 0) {
      fileStore.selected = [allItems[0].index];
    }
    return;
  }

  // End - jump to last item
  if (event.key === "End" && !event.ctrlKey && !event.metaKey) {
    event.preventDefault();
    const allItems = [...items.value.dirs, ...items.value.files];
    if (allItems.length > 0) {
      fileStore.selected = [allItems[allItems.length - 1].index];
    }
    return;
  }

  // Page Up / Page Down - jump by visible page size
  if (event.key === "PageDown" || event.key === "PageUp") {
    event.preventDefault();
    const allItems = [...items.value.dirs, ...items.value.files];
    if (allItems.length === 0) return;

    // Estimate visible items from viewport height
    const pageSize = Math.max(5, Math.floor((window.innerHeight - 200) / 60));
    const currentIndex =
      fileStore.selected.length > 0
        ? fileStore.selected[fileStore.selected.length - 1]
        : -1;

    // Find position in allItems array
    const pos = allItems.findIndex((it) => it.index === currentIndex);
    let newPos: number;
    if (event.key === "PageDown") {
      newPos =
        pos < 0 ? pageSize - 1 : Math.min(pos + pageSize, allItems.length - 1);
    } else {
      newPos = pos < 0 ? 0 : Math.max(pos - pageSize, 0);
    }

    const target = allItems[newPos];
    if (target) {
      fileStore.selected = [target.index];
      nextTick(() => {
        const el = document.querySelectorAll("#listing .item")[target.index];
        if (el) el.scrollIntoView({ block: "nearest" });
      });
    }
    return;
  }

  if (event.key === "Delete") {
    if (!authStore.user?.perm.delete || fileStore.selectedCount == 0) return;

    // Show delete prompt.
    layoutStore.showHover("delete");
  }

  if (event.key === "F2") {
    if (!authStore.user?.perm.rename || fileStore.selectedCount !== 1) return;

    // Show rename prompt.
    layoutStore.showHover("rename");
  }

  // Space key - Quick Preview
  if (event.key === " " || event.code === "Space") {
    if (fileStore.selectedCount !== 1) return;
    event.preventDefault();
    const item = fileStore.req?.items[fileStore.selected[0]];
    if (item && !item.isDir) {
      layoutStore.showHover({
        prompt: "quick-preview",
        props: {
          item: {
            name: item.name,
            url: item.url,
            type: item.type,
            size: item.size,
            modified: item.modified,
            path: item.path,
            extension: item.extension || "",
          },
        },
      });
    }
  }

  // Ctrl is pressed
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  switch (event.key) {
    case "f":
    case "F":
      if (event.shiftKey) {
        event.preventDefault();
        router.push("/search");
      }
      break;
    case "c":
    case "x":
      copyCut(event);
      break;
    case "v":
      paste(event);
      break;
    case "a":
      event.preventDefault();
      for (const file of items.value.files) {
        if (fileStore.selected.indexOf(file.index) === -1) {
          fileStore.selected.push(file.index);
        }
      }
      for (const dir of items.value.dirs) {
        if (fileStore.selected.indexOf(dir.index) === -1) {
          fileStore.selected.push(dir.index);
        }
      }
      break;
    case "s":
      event.preventDefault();
      document.getElementById("download-button")?.click();
      break;
  }
};

const preventDefault = (event: Event) => {
  // Wrapper around prevent default.
  event.preventDefault();
};

const copyCut = (event: Event | KeyboardEvent): void => {
  if ((event.target as HTMLElement).tagName?.toLowerCase() === "input") return;

  if (fileStore.req === null) return;

  const items = [];

  for (const i of fileStore.selected) {
    items.push({
      from: fileStore.req.items[i].url,
      name: fileStore.req.items[i].name,
      size: fileStore.req.items[i].size,
      modified: fileStore.req.items[i].modified,
    });
  }

  if (items.length === 0) {
    return;
  }

  clipboardStore.$patch({
    key: (event as KeyboardEvent).key,
    items,
    path: route.path,
  });
};

const paste = async (event: Event) => {
  if ((event.target as HTMLElement).tagName?.toLowerCase() === "input") return;

  // TODO router location should it be
  const items: PasteItem[] = [];

  for (const item of clipboardStore.items) {
    const from = item.from.endsWith("/") ? item.from.slice(0, -1) : item.from;
    const to = route.path + encodeURIComponent(item.name);
    items.push({
      from,
      to,
      name: item.name,
      size: item.size ?? 0, // ClipboardItem.size is optional, default to 0
      modified: item.modified,
      isDir: false, // clipboard items don't have isDir
      overwrite: false,
      rename: clipboardStore.path == route.path,
    });
  }

  if (items.length === 0) {
    return;
  }

  const preselect = removePrefix(route.path) + items[0].name;

  let action = (overwrite?: boolean, rename?: boolean) => {
    api
      .copy(items, overwrite, rename)
      .then(() => {
        fileStore.preselect = preselect;
        fileStore.reload = true;
      })
      .catch($showError);
  };

  if (clipboardStore.key === "x") {
    action = (overwrite, rename) => {
      api
        .move(items, overwrite, rename)
        .then(() => {
          clipboardStore.resetClipboard();
          fileStore.preselect = preselect;
          fileStore.reload = true;
        })
        .catch($showError);
    };
  }

  const path = route.path.endsWith("/") ? route.path : route.path + "/";
  const conflict = await upload.checkConflict(items as PasteItem[], path);

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

const scrollEvent = throttle(() => {
  const totalItems =
    (fileStore.req?.numDirs ?? 0) + (fileStore.req?.numFiles ?? 0);

  // All items are displayed
  if (showLimit.value >= totalItems) return;

  const currentPos = window.innerHeight + window.scrollY;

  // Trigger at the 75% of the window height
  const triggerPos = document.body.offsetHeight - window.innerHeight * 0.25;

  if (currentPos > triggerPos) {
    // Quantity of items needed to fill 2x of the window height
    const showQuantity = Math.ceil((window.innerHeight * 2) / itemWeight.value);

    // Increase the number of displayed items
    showLimit.value += showQuantity;
  }
}, 100);

const dragEnter = () => {
  dragCounter.value++;

  // When the user starts dragging an item, put every
  // file on the listing with 50% opacity.
  const items = document.getElementsByClassName("item");

  Array.from(items).forEach((file: Element) => {
    (file as HTMLElement).style.opacity = "0.5";
  });
};

const dragLeave = () => {
  dragCounter.value--;

  if (dragCounter.value == 0) {
    resetOpacity();
  }
};

const drop = async (event: DragEvent) => {
  event.preventDefault();
  dragCounter.value = 0;
  resetOpacity();

  const dt = event.dataTransfer;
  let el: HTMLElement | null = event.target as HTMLElement;

  if (fileStore.req === null || dt === null || dt.files.length <= 0) return;

  for (let i = 0; i < 5; i++) {
    if (el !== null && !el.classList.contains("item")) {
      el = el.parentElement;
    }
  }

  const files: UploadList = (await upload.scanFiles(dt)) as UploadList;
  let path = route.path.endsWith("/") ? route.path : route.path + "/";

  if (
    el !== null &&
    el.classList.contains("item") &&
    el.dataset.dir === "true"
  ) {
    // Get url from data attribute
    path = el.dataset.url || path;

    try {
      (await api.fetch(path)).items;
    } catch (error: any) {
      $showError(error);
      return;
    }
  }

  const conflict = await upload.checkConflict(files, path);

  const preselect = removePrefix(path) + (files[0].fullPath || files[0].name);

  if (conflict.length > 0) {
    layoutStore.showHover({
      prompt: "resolve-conflict",
      props: {
        conflict: conflict,
        isUploadAction: true,
      },
      confirm: (event: Event, result: Array<ConflictingResource>) => {
        event.preventDefault();
        layoutStore.closeHovers();
        for (let i = result.length - 1; i >= 0; i--) {
          const item = result[i];
          if (item.checked.length == 2) {
            continue;
          } else if (item.checked.length == 1 && item.checked[0] == "origin") {
            files[item.index].overwrite = true;
          } else {
            files.splice(item.index, 1);
          }
        }
        if (files.length > 0) {
          upload.handleFiles(files, path, true);
          fileStore.preselect = preselect;
        }
      },
    });

    return;
  }

  upload.handleFiles(files, path);
  fileStore.preselect = preselect;
};

const uploadInput = (event: Event) => {
  upload.processFileInput(event, route.path, layoutStore);
};

const resetOpacity = () => {
  const items = document.getElementsByClassName("item");

  Array.from(items).forEach((file: Element) => {
    (file as HTMLElement).style.opacity = "1";
  });
};

const searchBasePath = computed(() => {
  return normalizeSearchBase(fileStore.req?.path || route.path || "/");
});

const submitInlineSearch = () => {
  const query = inlineSearch.value.trim();
  if (!query) return;
  router.push({
    path: "/search",
    query: {
      q: query,
      base: searchBasePath.value,
      scope: "current",
    },
  });
};

const clearInlineSearch = () => {
  inlineSearch.value = "";
};

const openSearch = () => {
  router.push({
    path: "/search",
    query: { base: searchBasePath.value, scope: "current" },
  });
};

const toggleMultipleSelection = () => {
  fileStore.toggleMultiple();
  layoutStore.closeHovers();
};

const selectAll = () => {
  fileStore.selected = [];
  for (const dir of items.value.dirs) {
    fileStore.selected.push(dir.index);
  }
  for (const file of items.value.files) {
    fileStore.selected.push(file.index);
  }
};

const invertSelection = () => {
  const allIndices = new Set<number>();
  for (const dir of items.value.dirs) allIndices.add(dir.index);
  for (const file of items.value.files) allIndices.add(file.index);
  const selectedSet = new Set(fileStore.selected);
  fileStore.selected = [...allIndices].filter((i) => !selectedSet.has(i));
};

const windowsResize = throttle(() => {
  width.value = window.innerWidth;

  // Listing element is not displayed
  if (listing.value == null) return;

  // How much every listing item affects the window height
  setItemWeight();

  // Fill but not fit the window
  fillWindow();
}, 100);

const download = () => {
  if (fileStore.req === null) return;

  if (
    fileStore.selectedCount === 1 &&
    !fileStore.req.items[fileStore.selected[0]].isDir
  ) {
    api.download(null, fileStore.req.items[fileStore.selected[0]].url);
    return;
  }

  layoutStore.showHover({
    prompt: "download",
    confirm: (format: DownloadFormat) => {
      layoutStore.closeHovers();

      const files = [];

      if (fileStore.selectedCount > 0 && fileStore.req !== null) {
        for (const i of fileStore.selected) {
          files.push(fileStore.req.items[i].url);
        }
      } else {
        files.push(route.path);
      }

      api.download(format, ...files);
    },
  });
};

const toggleViewDropdown = () => {
  showSortDropdown.value = false;
  showViewDropdown.value = !showViewDropdown.value;
};

const toggleSortDropdown = () => {
  showViewDropdown.value = false;
  showSortDropdown.value = !showSortDropdown.value;
};

const selectViewMode = (mode: ViewModeType) => {
  currentViewMode.value = mode;
  localStorage.setItem("nas-file-browser-view-mode", mode);
  showViewDropdown.value = false;

  // Also update server-side preference if logged in
  if (authStore.user?.id) {
    users
      .update({ id: authStore.user.id, viewMode: mode }, ["viewMode"])
      .catch(() => {});
    authStore.updateUser({ viewMode: mode });
  }

  setItemWeight();
  fillWindow();
};

const selectCompactGridSize = (size: CompactGridSize) => {
  compactGridSize.value = size;
  localStorage.setItem("nas-file-browser-compact-grid-size", size);
};

const selectSort = async (by: string) => {
  currentSortBy.value = by;
  showSortDropdown.value = false;

  try {
    if (authStore.user?.id) {
      await users.update(
        { id: authStore.user.id, sorting: { by, asc: currentSortAsc.value } },
        ["sorting"]
      );
    }
  } catch (e: any) {
    $showError(e);
  }

  fileStore.reload = true;
};

const sortByHeader = async (by: string) => {
  if (currentSortBy.value === by) {
    await toggleSortDirection();
    return;
  }
  await selectSort(by);
};

const headerSortState = (by: string) => {
  if (currentSortBy.value !== by) return "none";
  return currentSortAsc.value ? "ascending" : "descending";
};

const toggleSortDirection = async () => {
  currentSortAsc.value = !currentSortAsc.value;
  showSortDropdown.value = false;

  try {
    if (authStore.user?.id) {
      await users.update(
        {
          id: authStore.user.id,
          sorting: { by: currentSortBy.value, asc: currentSortAsc.value },
        },
        ["sorting"]
      );
    }
  } catch (e: any) {
    $showError(e);
  }

  fileStore.reload = true;
};

// Close dropdowns on outside click
const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (
    showViewDropdown.value &&
    viewDropdownRef.value &&
    !viewDropdownRef.value.contains(target)
  ) {
    showViewDropdown.value = false;
  }
  if (
    showSortDropdown.value &&
    sortDropdownRef.value &&
    !sortDropdownRef.value.contains(target)
  ) {
    showSortDropdown.value = false;
  }
};

const uploadFunc = () => {
  if (
    typeof window.DataTransferItem !== "undefined" &&
    typeof DataTransferItem.prototype.webkitGetAsEntry !== "undefined"
  ) {
    layoutStore.showHover("upload");
  } else {
    document.getElementById("upload-input")?.click();
  }
};

const setItemWeight = () => {
  // Listing element is not displayed
  if (listing.value === null || fileStore.req === null) return;

  let itemQuantity = fileStore.req.numDirs + fileStore.req.numFiles;
  if (itemQuantity > showLimit.value) itemQuantity = showLimit.value;

  // How much every listing item affects the window height
  itemWeight.value = listing.value.offsetHeight / itemQuantity;
};

const fillWindow = (fit = false) => {
  if (fileStore.req === null) return;

  const totalItems = fileStore.req.numDirs + fileStore.req.numFiles;

  // More items are displayed than the total
  if (showLimit.value >= totalItems && !fit) return;

  const windowHeight = window.innerHeight;

  // Quantity of items needed to fill 2x of the window height
  const showQuantity = Math.ceil(
    (windowHeight + windowHeight * 2) / itemWeight.value
  );

  // Less items to display than current
  if (showLimit.value > showQuantity && !fit) return;

  // Set the number of displayed items
  showLimit.value = showQuantity > totalItems ? totalItems : showQuantity;
};

const revealPreviousItem = () => {
  if (!fileStore.req || !fileStore.oldReq) return;

  const index = fileStore.selected[0];
  if (index === undefined) return;

  showLimit.value =
    index + Math.ceil((window.innerHeight * 2) / itemWeight.value);

  nextTick(() => {
    const items = document.querySelectorAll("#listing .item");
    items[index].scrollIntoView({ block: "center" });
  });

  return true;
};

const showContextMenu = (event: MouseEvent) => {
  event.preventDefault();

  const target = event.target;
  if (target instanceof HTMLElement) {
    const item = target.closest<HTMLElement>(".item");
    const targetIndex = Number(item?.dataset.index);
    if (Number.isInteger(targetIndex)) {
      fileStore.selected = selectForContextMenu(
        fileStore.selected,
        targetIndex
      );
    }
  }

  isContextMenuVisible.value = true;
  contextMenuPos.value = {
    x: event.clientX + 8,
    y: event.clientY + Math.floor(window.scrollY),
  };
};

const hideContextMenu = () => {
  isContextMenuVisible.value = false;
};

const handleEmptyAreaClick = (e: MouseEvent) => {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.dataset.clearOnClick === "true") {
    fileStore.selected = [];
  }
};
</script>
<style scoped>
#listing {
  min-height: calc(100vh - 8rem);
}

.file-selection-margin-bottom {
  margin-bottom: 3.5rem;
}

.loading-skeleton-wrapper {
  min-height: calc(100vh - 8rem);
  padding-top: 0.5em;
}
</style>
