<template>
  <div>
    <header-bar showMenu showLogo>
      <search />
      <title />
      <action
        class="search-button"
        icon="search"
        :label="t('buttons.search')"
        @action="openSearch()"
      />

      <template #actions>
        <template v-if="!isMobile">
          <action
            v-if="headerButtons.share"
            icon="share"
            :label="t('buttons.share')"
            show="share"
          />
          <action
            v-if="headerButtons.rename"
            icon="mode_edit"
            :label="t('buttons.rename')"
            show="rename"
          />
          <action
            v-if="headerButtons.copy"
            id="copy-button"
            icon="content_copy"
            :label="t('buttons.copyFile')"
            show="copy"
          />
          <action
            v-if="headerButtons.move"
            id="move-button"
            icon="forward"
            :label="t('buttons.moveFile')"
            show="move"
          />
          <action
            v-if="headerButtons.delete"
            id="delete-button"
            icon="delete"
            :label="t('buttons.delete')"
            show="delete"
          />
        </template>

        <action
          v-if="headerButtons.shell"
          icon="code"
          :label="t('buttons.shell')"
          @action="layoutStore.toggleShell"
        />
        <!-- View Mode Dropdown -->
        <div class="view-mode-dropdown" ref="viewDropdownRef">
          <action
            :icon="viewIcon"
            :label="t('buttons.switchView')"
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
              <span>{{ t(mode.label) }}</span>
              <i v-if="currentViewMode === mode.value" class="material-icons check">check</i>
            </button>
          </div>
        </div>
        <!-- Sort Dropdown -->
        <div class="sort-dropdown" ref="sortDropdownRef">
          <action
            icon="sort"
            :label="t('buttons.sort')"
            @action="toggleSortDropdown"
          />
          <div v-if="showSortDropdown" class="dropdown-menu">
            <button
              v-for="opt in sortOptions"
              :key="opt.by"
              class="dropdown-item"
              :class="{ active: currentSortBy === opt.by }"
              @click="selectSort(opt.by)"
            >
              <i class="material-icons">{{ opt.icon }}</i>
              <span>{{ t(opt.label) }}</span>
              <i v-if="currentSortBy === opt.by" class="material-icons sort-arrow">
                {{ currentSortAsc ? 'arrow_upward' : 'arrow_downward' }}
              </i>
            </button>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" @click="toggleSortDirection">
              <i class="material-icons">swap_vert</i>
              <span>{{ currentSortAsc ? t('files.descending') : t('files.ascending') }}</span>
            </button>
          </div>
        </div>
        <action
          v-if="headerButtons.download"
          icon="file_download"
          :label="t('buttons.download')"
          @action="download"
          :counter="fileStore.selectedCount"
        />
        <action
          v-if="headerButtons.upload"
          icon="file_upload"
          id="upload-button"
          :label="t('buttons.upload')"
          @action="uploadFunc"
        />
        <action icon="info" :label="t('buttons.info')" show="info" />
        <action
          icon="check_circle"
          :label="t('buttons.selectMultiple')"
          @action="toggleMultipleSelection"
        />
      </template>
    </header-bar>

    <div
      v-if="isMobile"
      id="file-selection"
      :class="{
        'file-selection-margin-bottom': fileStore.multiple,
      }"
    >
      <span v-if="fileStore.selectedCount > 0">
        {{ t("prompts.filesSelected", fileStore.selectedCount) }}
      </span>
      <action
        icon="select_all"
        :label="t('buttons.selectAll')"
        @action="selectAll"
      />
      <action
        v-if="headerButtons.share"
        icon="share"
        :label="t('buttons.share')"
        show="share"
      />
      <action
        v-if="headerButtons.rename"
        icon="mode_edit"
        :label="t('buttons.rename')"
        show="rename"
      />
      <action
        v-if="headerButtons.copy"
        icon="content_copy"
        :label="t('buttons.copyFile')"
        show="copy"
      />
      <action
        v-if="headerButtons.move"
        icon="forward"
        :label="t('buttons.moveFile')"
        show="move"
      />
      <action
        v-if="headerButtons.delete"
        icon="delete"
        :label="t('buttons.delete')"
        show="delete"
      />
    </div>

    <div v-if="layoutStore.loading">
      <h2 class="message delayed">
        <div class="spinner">
          <div class="bounce1"></div>
          <div class="bounce2"></div>
          <div class="bounce3"></div>
        </div>
        <span>{{ t("files.loading") }}</span>
      </h2>
    </div>
    <template v-else>
      <div
        v-if="
          (fileStore.req?.numDirs ?? 0) + (fileStore.req?.numFiles ?? 0) == 0
        "
      >
        <h2 class="message">
          <i class="material-icons">sentiment_dissatisfied</i>
          <span>{{ t("files.lonely") }}</span>
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
        :class="currentViewMode"
        @click="handleEmptyAreaClick"
      >
        <div>
          <div class="item header">
            <div>
              <p
                :class="{ active: nameSorted }"
                class="name"
                role="button"
                tabindex="0"
                @click="sort('name')"
                :title="t('files.sortByName')"
                :aria-label="t('files.sortByName')"
              >
                <span>{{ t("files.name") }}</span>
                <i class="material-icons">{{ nameIcon }}</i>
              </p>

              <p
                :class="{ active: sizeSorted }"
                class="size"
                role="button"
                tabindex="0"
                @click="sort('size')"
                :title="t('files.sortBySize')"
                :aria-label="t('files.sortBySize')"
              >
                <span>{{ t("files.size") }}</span>
                <i class="material-icons">{{ sizeIcon }}</i>
              </p>
              <p
                :class="{ active: modifiedSorted }"
                class="modified"
                role="button"
                tabindex="0"
                @click="sort('modified')"
                :title="t('files.sortByLastModified')"
                :aria-label="t('files.sortByLastModified')"
              >
                <span>{{ t("files.lastModified") }}</span>
                <i class="material-icons">{{ modifiedIcon }}</i>
              </p>
            </div>
          </div>
        </div>

        <!-- Tag filter indicator -->
        <div v-if="tagsStore.activeFilterTag" class="tag-filter-indicator">
          <i class="material-icons" :style="{ color: tagsStore.activeFilterTag.color }">label</i>
          <span>{{ $t("tags.filtered") }}: <strong>{{ tagsStore.activeFilterTag.name }}</strong></span>
          <button class="tag-filter-clear-btn" @click="tagsStore.setFilter(null)">
            <i class="material-icons">close</i>
          </button>
        </div>

        <h2 data-clear-on-click="true" v-if="fileStore.req?.numDirs ?? false">
          {{ t("files.folders") }}
        </h2>
        <div
          v-if="fileStore.req?.numDirs ?? false"
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
            v-bind:size="item.size"
            v-bind:path="item.path"
          >
          </item>
        </div>

        <h2 data-clear-on-click="true" v-if="fileStore.req?.numFiles ?? false">
          {{ t("files.files") }}
        </h2>
        <div
          v-if="fileStore.req?.numFiles ?? false"
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
            v-bind:size="item.size"
            v-bind:path="item.path"
          >
          </item>
        </div>
        <context-menu
          :show="isContextMenuVisible"
          :pos="contextMenuPos"
          @hide="hideContextMenu"
        >
          <action
            v-if="headerButtons.share"
            icon="share"
            :label="t('buttons.share')"
            show="share"
          />
          <action
            v-if="headerButtons.rename"
            icon="mode_edit"
            :label="t('buttons.rename')"
            show="rename"
          />
          <action
            v-if="headerButtons.copy"
            id="copy-button"
            icon="content_copy"
            :label="t('buttons.copyFile')"
            show="copy"
          />
          <action
            v-if="headerButtons.move"
            id="move-button"
            icon="forward"
            :label="t('buttons.moveFile')"
            show="move"
          />
          <action
            v-if="headerButtons.delete"
            id="delete-button"
            icon="delete"
            :label="t('buttons.delete')"
            show="delete"
          />
          <action
            v-if="headerButtons.download"
            icon="file_download"
            :label="t('buttons.download')"
            @action="download"
            :counter="fileStore.selectedCount"
          />
          <action icon="info" :label="t('buttons.info')" show="info" />
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
            <span v-if="fileStore.selectedCount > 0">
              {{ t("prompts.filesSelected", fileStore.selectedCount) }}
            </span>
            <span v-else>{{ t("files.multipleSelectionEnabled") }}</span>
          </div>
          <div class="selection-actions">
            <button
              class="selection-btn"
              @click="selectAll"
              :title="t('buttons.selectAll')"
              :aria-label="t('buttons.selectAll')"
            >
              <i class="material-icons">select_all</i>
              <span>{{ t('buttons.selectAll') }}</span>
            </button>
            <button
              v-if="fileStore.selectedCount > 0"
              class="selection-btn"
              @click="invertSelection"
              :title="t('buttons.invertSelection')"
              :aria-label="t('buttons.invertSelection')"
            >
              <i class="material-icons">flip</i>
              <span>{{ t('buttons.invertSelection') }}</span>
            </button>
            <template v-if="fileStore.selectedCount > 0">
              <button
                v-if="headerButtons.copy"
                class="selection-btn action-btn"
                @click="layoutStore.showHover('copy')"
              >
                <i class="material-icons">content_copy</i>
                <span>{{ t('buttons.copyFile') }}</span>
              </button>
              <button
                v-if="headerButtons.move"
                class="selection-btn action-btn"
                @click="layoutStore.showHover('move')"
              >
                <i class="material-icons">forward</i>
                <span>{{ t('buttons.moveFile') }}</span>
              </button>
              <button
                v-if="headerButtons.download"
                class="selection-btn action-btn"
                @click="download"
              >
                <i class="material-icons">file_download</i>
                <span>{{ t('buttons.download') }}</span>
              </button>
              <button
                v-if="headerButtons.delete"
                class="selection-btn action-btn danger"
                @click="layoutStore.showHover('delete')"
              >
                <i class="material-icons">delete</i>
                <span>{{ t('buttons.delete') }}</span>
              </button>
            </template>
            <button
              class="selection-btn close-btn"
              @click="() => { fileStore.multiple = false; fileStore.selected = []; }"
              :title="t('buttons.close')"
              :aria-label="t('buttons.close')"
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
import css from "@/utils/css";
import { throttle } from "lodash-es";
import { Base64 } from "js-base64";

import HeaderBar from "@/components/header/HeaderBar.vue";
import Action from "@/components/header/Action.vue";
import Search from "@/components/Search.vue";
import Item from "@/components/files/ListingItem.vue";
import ContextMenu from "@/components/ContextMenu.vue";
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
import { useI18n } from "vue-i18n";
import { storeToRefs } from "pinia";
import { removePrefix } from "@/api/utils";

const showLimit = ref<number>(50);
const columnWidth = ref<number>(280);
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
const currentViewMode = ref<ViewModeType>(
  (localStorage.getItem('nas-file-browser-view-mode') as ViewModeType) ||
  authStore.user?.viewMode ||
  'mosaic'
);
const viewModes = [
  { value: 'mosaic' as ViewModeType, icon: 'grid_view', label: 'buttons.gridView' },
  { value: 'list' as ViewModeType, icon: 'view_list', label: 'buttons.listView' },
  { value: 'mosaic gallery' as ViewModeType, icon: 'view_module', label: 'buttons.detailView' },
  { value: 'compact' as ViewModeType, icon: 'density_medium', label: 'buttons.compactView' },
];

// Sort dropdown
const showSortDropdown = ref<boolean>(false);
const sortDropdownRef = ref<HTMLElement | null>(null);
const currentSortBy = ref<string>(fileStore.req?.sorting?.by || 'name');
const currentSortAsc = ref<boolean>(fileStore.req?.sorting?.asc || false);
const sortOptions = [
  { by: 'name', icon: 'sort_by_alpha', label: 'files.sortByName' },
  { by: 'size', icon: 'data_usage', label: 'files.sortBySize' },
  { by: 'modified', icon: 'schedule', label: 'files.sortByLastModified' },
  { by: 'type', icon: 'category', label: 'files.sortByType' },
];

const { req } = storeToRefs(fileStore);

const route = useRoute();
const router = useRouter();
onBeforeRouteUpdate(() => {
  hideContextMenu();
});

const { t } = useI18n();

const listing = ref<HTMLElement | null>(null);

const nameSorted = computed(() =>
  fileStore.req ? fileStore.req.sorting.by === "name" : false
);

const sizeSorted = computed(() =>
  fileStore.req ? fileStore.req.sorting.by === "size" : false
);

const modifiedSorted = computed(() =>
  fileStore.req ? fileStore.req.sorting.by === "modified" : false
);

const ascOrdered = computed(() =>
  fileStore.req ? fileStore.req.sorting.asc : false
);

const dirs = computed(() => items.value.dirs.slice(0, showLimit.value));

const items = computed(() => {
  const dirs: any[] = [];
  const files: any[] = [];

  // Get the parent path for constructing full paths
  const parentPath = fileStore.req?.path ?? "";

  fileStore.req?.items.forEach((item) => {
    // Build the full path for tag matching
    const fullPath = parentPath
      ? parentPath.replace(/\/$/, "") + "/" + item.name
      : "/" + item.name;

    // Apply tag filter (only affects directories)
    if (item.isDir && !tagsStore.matchesFilter(fullPath)) {
      return; // skip this item
    }

    if (item.isDir) {
      dirs.push(item);
    } else {
      files.push(item);
    }
  });

  return { dirs, files };
});

const files = computed((): Resource[] => {
  let _showLimit = showLimit.value - items.value.dirs.length;

  if (_showLimit < 0) _showLimit = 0;

  return items.value.files.slice(0, _showLimit);
});

const nameIcon = computed(() => {
  if (nameSorted.value && !ascOrdered.value) {
    return "arrow_upward";
  }

  return "arrow_downward";
});

const sizeIcon = computed(() => {
  if (sizeSorted.value && ascOrdered.value) {
    return "arrow_downward";
  }

  return "arrow_upward";
});

const modifiedIcon = computed(() => {
  if (modifiedSorted.value && ascOrdered.value) {
    return "arrow_downward";
  }

  return "arrow_upward";
});

const viewIcon = computed(() => {
  const icons: Record<string, string> = {
    list: 'view_list',
    mosaic: 'grid_view',
    'mosaic gallery': 'view_module',
    compact: 'density_medium',
  };
  return icons[currentViewMode.value] || 'grid_view';
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
  return width.value <= 736;
});

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
  // Check the columns size for the first time.
  columnsResize();

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
            extension: item.extension || '',
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
        layoutStore.showHover("search");
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
  const items: any[] = [];

  for (const item of clipboardStore.items) {
    const from = item.from.endsWith("/") ? item.from.slice(0, -1) : item.from;
    const to = route.path + encodeURIComponent(item.name);
    items.push({
      from,
      to,
      name: item.name,
      size: item.size,
      modified: item.modified,
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

const columnsResize = () => {
  // Update the columns size based on the window width.
  const items_ = css(["#listing.mosaic:not(.gallery) .item", ".mosaic:not(.gallery)#listing .item"]);
  if (items_ === null) return;

  const mainWidth = document.querySelector("main")?.offsetWidth ?? 0;

  // Responsive column count based on screen width
  let colWidth = 240;
  if (mainWidth <= 450) {
    colWidth = 100;
  } else if (mainWidth <= 736) {
    colWidth = 120;
  } else if (mainWidth <= 900) {
    colWidth = 200;
  }

  let columns = Math.floor(mainWidth / colWidth);
  if (columns < 2) columns = 2;
  if (columns > 6) columns = 6;

  const gap = mainWidth <= 736 ? 0.6 : 1;
  items_.style.width = `calc(${100 / columns}% - ${gap}em)`;
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
    // Get url from ListingItem instance
    // TODO: Don't know what is happening here
    path = el.__vue__.url;

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

const uploadInput = async (event: Event) => {
  const files = (event.currentTarget as HTMLInputElement)?.files;
  if (files === null) return;

  const folder_upload = !!files[0].webkitRelativePath;

  const uploadFiles: UploadList = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = folder_upload ? file.webkitRelativePath : undefined;
    uploadFiles.push({
      file,
      name: file.name,
      size: file.size,
      isDir: false,
      fullPath,
    });
  }

  const path = route.path.endsWith("/") ? route.path : route.path + "/";
  const conflict = await upload.checkConflict(uploadFiles, path);

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
            uploadFiles[item.index].overwrite = true;
          } else {
            uploadFiles.splice(item.index, 1);
          }
        }
        if (uploadFiles.length > 0) {
          upload.handleFiles(uploadFiles, path, true);
        }
      },
    });

    return;
  }

  upload.handleFiles(uploadFiles, path);
};

const resetOpacity = () => {
  const items = document.getElementsByClassName("item");

  Array.from(items).forEach((file: Element) => {
    (file as HTMLElement).style.opacity = "1";
  });
};

const sort = async (by: string) => {
  let asc = false;

  if (by === "name") {
    if (nameIcon.value === "arrow_upward") {
      asc = true;
    }
  } else if (by === "size") {
    if (sizeIcon.value === "arrow_upward") {
      asc = true;
    }
  } else if (by === "modified") {
    if (modifiedIcon.value === "arrow_upward") {
      asc = true;
    }
  }

  currentSortBy.value = by;
  currentSortAsc.value = asc;

  try {
    if (authStore.user?.id) {
      await users.update({ id: authStore.user?.id, sorting: { by, asc } }, [
        "sorting",
      ]);
    }
  } catch (e: any) {
    $showError(e);
  }

  fileStore.reload = true;
};

const openSearch = () => {
  router.push('/search');
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
  columnsResize();
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
    confirm: (format: any) => {
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

const switchView = async () => {
  layoutStore.closeHovers();

  const modes: Record<string, string> = {
    list: 'mosaic',
    mosaic: 'mosaic gallery',
    'mosaic gallery': 'compact',
    compact: 'list',
  };

  const data = {
    id: authStore.user?.id,
    viewMode: (modes[currentViewMode.value] || 'list') as ViewModeType,
  };

  selectViewMode(data.viewMode);
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
  localStorage.setItem('nas-file-browser-view-mode', mode);
  showViewDropdown.value = false;

  // Also update server-side preference if logged in
  if (authStore.user?.id) {
    users.update({ id: authStore.user.id, viewMode: mode }, ['viewMode']).catch(() => {});
    authStore.updateUser({ viewMode: mode });
  }

  setItemWeight();
  fillWindow();
};

const selectSort = async (by: string) => {
  currentSortBy.value = by;
  showSortDropdown.value = false;

  try {
    if (authStore.user?.id) {
      await users.update({ id: authStore.user.id, sorting: { by, asc: currentSortAsc.value } }, ['sorting']);
    }
  } catch (e: any) {
    $showError(e);
  }

  fileStore.reload = true;
};

const toggleSortDirection = async () => {
  currentSortAsc.value = !currentSortAsc.value;
  showSortDropdown.value = false;

  try {
    if (authStore.user?.id) {
      await users.update({ id: authStore.user.id, sorting: { by: currentSortBy.value, asc: currentSortAsc.value } }, ['sorting']);
    }
  } catch (e: any) {
    $showError(e);
  }

  fileStore.reload = true;
};

// Close dropdowns on outside click
const handleOutsideClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (showViewDropdown.value && viewDropdownRef.value && !viewDropdownRef.value.contains(target)) {
    showViewDropdown.value = false;
  }
  if (showSortDropdown.value && sortDropdownRef.value && !sortDropdownRef.value.contains(target)) {
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
</style>
