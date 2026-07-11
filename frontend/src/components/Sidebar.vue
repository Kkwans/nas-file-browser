<template>
  <div v-show="active" @click="closeHovers" class="overlay"></div>
  <nav
    class="sidebar"
    :class="{ active }"
    :style="{ width: sidebarWidth + 'px' }"
  >
    <div
      class="sidebar-resize-handle"
      @mousedown="startResize"
      @touchstart="startResize"
      @dblclick="resetSidebarWidth"
      title="拖拽调节侧边栏宽度"
    ></div>
    <template v-if="isLoggedIn">
      <button @click="toAccountSettings" class="action">
        <i class="material-icons">person</i>
        <span>{{ user?.username }}</span>
      </button>
      <button
        class="action"
        @click="toRoot"
        aria-label="我的文件"
        title="我的文件"
      >
        <i class="material-icons">folder</i>
        <span>我的文件</span>
      </button>

      <button class="action" @click="openSearch" aria-label="搜索" title="搜索">
        <i class="material-icons">search</i>
        <span>搜索</span>
      </button>

      <!-- Favorites Section -->
      <div class="favorites-section">
        <button class="favorites-header" @click="toggleSection('favorites')">
          <i class="material-icons">star</i>
          <span>收藏夹</span>
          <button
            class="section-action-btn"
            title="新建分组"
            @click.stop.prevent="showCreateGroup = !showCreateGroup"
          >
            <i class="material-icons">create_new_folder</i>
          </button>
          <button
            v-if="favoritesStore.sortedFavorites.length > 0"
            class="section-action-btn"
            title="清空收藏夹"
            @click.stop.prevent="clearAllFavorites"
          >
            <i class="material-icons">delete_sweep</i>
          </button>
          <i
            class="material-icons section-arrow"
            :class="{ expanded: !collapsedSections.favorites }"
            >expand_more</i
          >
        </button>
        <template v-if="!collapsedSections.favorites">
          <!-- Create group input -->
          <div v-if="showCreateGroup" class="create-group-input">
            <input
              v-model="newGroupName"
              placeholder="分组名称"
              @keyup.enter="createGroup"
              @keyup.escape="showCreateGroup = false"
              ref="groupInputRef"
            />
            <button @click="createGroup" :disabled="!newGroupName.trim()">
              <i class="material-icons">check</i>
            </button>
            <button @click="showCreateGroup = false">
              <i class="material-icons">close</i>
            </button>
          </div>
          <!-- Empty state -->
          <div
            v-if="
              favoritesStore.sortedFavorites.length === 0 &&
              favoritesStore.sortedGroups.length === 0
            "
            class="section-empty"
          >
            <i class="material-icons">star_border</i>
            <span>暂无收藏目录</span>
          </div>
          <!-- Ungrouped favorites -->
          <template
            v-if="
              favoritesStore.favoritesByGroup[''] &&
              favoritesStore.favoritesByGroup[''].length > 0
            "
          >
            <button
              v-for="fav in favoritesStore.favoritesByGroup['']"
              :key="fav.id"
              class="action favorite-item"
              draggable="true"
              @click="navigateVolume(fav.path)"
              :title="fav.path"
              @dragstart="onFavDragStart($event, fav.id)"
              @dragover.prevent="onFavDragOverItem($event)"
              @dragleave="onFavDragLeaveItem"
              @drop="onFavDropOnItem($event)"
              @dragend="onFavDragEnd"
            >
              <i class="material-icons favorite-icon favorite-drag-handle"
                >drag_indicator</i
              >
              <i class="material-icons favorite-icon">{{
                favoriteIcon(fav.name)
              }}</i>
              <div class="favorite-info">
                <span class="favorite-name">{{ fav.name }}</span>
                <span class="favorite-path" v-if="fav.path !== fav.name">{{
                  fav.path
                }}</span>
              </div>
              <i
                class="material-icons favorite-remove"
                title="取消收藏"
                @click.stop.prevent="removeFavorite(fav.id)"
                >close</i
              >
            </button>
          </template>
          <!-- Groups -->
          <div
            v-for="group in favoritesStore.sortedGroups"
            :key="group.id"
            class="favorite-group"
          >
            <button
              class="favorite-group-header"
              @click="toggleGroupCollapse(group.id)"
              @dragover.prevent="onFavDragOverGroup($event, group.id)"
              @drop="onFavDropOnGroup($event, group.id)"
              @dragleave="onFavDragLeaveGroup"
              :class="{ 'drag-over-group': dragOverGroupId === group.id }"
            >
              <i
                class="material-icons"
                :style="{ color: group.color || 'var(--blue)' }"
                >folder</i
              >
              <span class="group-name">{{ group.name }}</span>
              <span class="category-count">{{
                (favoritesStore.favoritesByGroup[group.id] || []).length
              }}</span>
              <button
                class="section-action-btn"
                title="删除分组"
                @click.stop.prevent="deleteGroup(group.id)"
              >
                <i class="material-icons">close</i>
              </button>
              <i
                class="material-icons category-arrow"
                :class="{ expanded: !collapsedGroups[group.id] }"
                >expand_more</i
              >
            </button>
            <template v-if="!collapsedGroups[group.id]">
              <button
                v-for="fav in favoritesStore.favoritesByGroup[group.id] || []"
                :key="fav.id"
                class="action favorite-item category-path-item"
                draggable="true"
                @click="navigateVolume(fav.path)"
                :title="fav.path"
                @dragstart="onFavDragStart($event, fav.id)"
                @dragover.prevent="onFavDragOverItem($event)"
                @dragleave="onFavDragLeaveItem"
                @drop="onFavDropOnItem($event)"
                @dragend="onFavDragEnd"
              >
                <i class="material-icons favorite-icon favorite-drag-handle"
                  >drag_indicator</i
                >
                <i class="material-icons favorite-icon">{{
                  favoriteIcon(fav.name)
                }}</i>
                <div class="favorite-info">
                  <span class="favorite-name">{{ fav.name }}</span>
                  <span class="favorite-path" v-if="fav.path !== fav.name">{{
                    fav.path
                  }}</span>
                </div>
                <i
                  class="material-icons favorite-remove"
                  title="取消收藏"
                  @click.stop.prevent="removeFavorite(fav.id)"
                  >close</i
                >
              </button>
              <div
                v-if="
                  (favoritesStore.favoritesByGroup[group.id] || []).length === 0
                "
                class="section-empty"
              >
                <span>该分组暂无收藏</span>
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- Tags Filter Section -->
      <div class="tags-section">
        <button class="tags-header" @click="toggleSection('tags')">
          <i class="material-icons">label</i>
          <span>标签</span>
          <button
            class="section-action-btn"
            title="管理标签"
            @click.stop.prevent="openTagManager"
          >
            <i class="material-icons">settings</i>
          </button>
          <i
            class="material-icons section-arrow"
            :class="{ expanded: !collapsedSections.tags }"
            >expand_more</i
          >
        </button>
        <template v-if="!collapsedSections.tags">
          <div v-if="tagsStore.sortedTags.length === 0" class="section-empty">
            <i class="material-icons">turned_in_not</i>
            <span>暂无标签，创建一个吧</span>
          </div>
          <button
            v-for="tag in tagsStore.sortedTags"
            :key="tag.id"
            class="action tag-filter-item"
            :class="{ active: tagsStore.activeFilter === tag.id }"
            @click="filterByTag(tag.id)"
          >
            <i
              class="material-icons tag-filter-dot"
              :style="{ color: tag.color }"
              >label</i
            >
            <span class="tag-filter-name">{{ tag.name }}</span>
            <span class="tag-filter-count">{{ tag.paths.length }}</span>
          </button>
          <button
            v-if="tagsStore.activeFilter"
            class="action tag-filter-clear"
            @click="clearTagFilter"
          >
            <i class="material-icons">filter_list_off</i>
            <span>清除筛选</span>
          </button>
        </template>
      </div>

      <!-- Storage Volumes Section (admin only) -->
      <div
        v-if="user?.perm?.admin && volumesStore.displayVolumes.length > 0"
        class="volumes-section"
      >
        <button class="volumes-header" @click="toggleSection('volumes')">
          <i class="material-icons">storage</i>
          <span>存储卷</span>
          <i
            class="material-icons section-arrow"
            :class="{ expanded: !collapsedSections.volumes }"
            >expand_more</i
          >
        </button>
        <template v-if="!collapsedSections.volumes">
          <button
            v-for="vol in volumesStore.systemVolumes"
            :key="vol.path"
            class="action volume-item"
            @click="navigateVolume(vol.path)"
          >
            <i class="material-icons" :style="{ color: vol.color }">{{
              vol.icon
            }}</i>
            <div class="volume-info">
              <span class="volume-name">{{ vol.displayName }}</span>
              <div class="volume-bar-wrap">
                <div class="volume-bar">
                  <div
                    class="volume-bar-fill"
                    :style="{
                      width: vol.usedPercentage + '%',
                      background: volumeBarColor(vol.usedPercentage),
                    }"
                  ></div>
                </div>
                <span class="volume-usage"
                  >{{ vol.usedFormatted }} / {{ vol.totalFormatted }}</span
                >
              </div>
            </div>
          </button>
          <button
            v-for="vol in volumesStore.otherVolumes"
            :key="vol.path"
            class="action volume-item"
            @click="navigateVolume(vol.path)"
          >
            <i class="material-icons" :style="{ color: vol.color }">{{
              vol.icon
            }}</i>
            <div class="volume-info">
              <span class="volume-name">{{ vol.displayName }}</span>
              <div class="volume-bar-wrap">
                <div class="volume-bar">
                  <div
                    class="volume-bar-fill"
                    :style="{
                      width: vol.usedPercentage + '%',
                      background: volumeBarColor(vol.usedPercentage),
                    }"
                  ></div>
                </div>
                <span class="volume-usage"
                  >{{ vol.usedFormatted }} / {{ vol.totalFormatted }}</span
                >
              </div>
            </div>
          </button>
        </template>
      </div>

      <!-- Category Quick Navigation (admin only) -->
      <div
        v-if="user?.perm?.admin && categoryGroups.length > 0"
        class="categories-section"
      >
        <button class="categories-header" @click="toggleSection('categories')">
          <i class="material-icons">category</i>
          <span>目录分类</span>
          <i
            class="material-icons section-arrow"
            :class="{ expanded: !collapsedSections.categories }"
            >expand_more</i
          >
        </button>
        <template v-if="!collapsedSections.categories">
          <div
            v-for="group in categoryGroups"
            :key="group.id"
            class="category-group"
          >
            <div class="category-group-header-row">
              <button
                class="action category-group-header category-group-nav"
                @click="navigateCategoryFirst(group)"
                title="查看内容"
              >
                <i class="material-icons" :style="{ color: group.color }">{{
                  group.icon
                }}</i>
                <span>{{ group.name }}</span>
                <span class="category-count">{{ group.paths.length }}</span>
              </button>
              <button
                class="category-expand-btn"
                @click="toggleCategory(group.id)"
                :title="expandedCategories[group.id] ? '收起分类' : '展开分类'"
              >
                <i
                  class="material-icons category-arrow"
                  :class="{ expanded: expandedCategories[group.id] }"
                  >expand_more</i
                >
              </button>
            </div>
            <div v-if="expandedCategories[group.id]" class="category-paths">
              <button
                v-for="p in group.paths"
                :key="p.path"
                class="action category-path-item"
                @click="navigateVolume(p.path)"
                :title="p.path"
              >
                <i class="material-icons" :class="'risk-' + p.risk">{{
                  riskIcon(p.risk)
                }}</i>
                <div class="category-path-info">
                  <span class="category-path-name">{{ p.name }}</span>
                  <span
                    v-if="isDuplicateName(p.name, group.id)"
                    class="category-path-volume"
                    >{{ getVolumeLabel(p.path) }}</span
                  >
                  <span
                    v-else-if="p.volumeType && p.volumeType !== 'system'"
                    class="category-path-type"
                    >{{ p.volumeType }}</span
                  >
                </div>
              </button>
            </div>
          </div>
        </template>
      </div>

      <div v-if="user?.perm?.create">
        <button
          @click="showHover('newDir')"
          class="action"
          aria-label="新建文件夹"
          title="新建文件夹"
        >
          <i class="material-icons">create_new_folder</i>
          <span>新建文件夹</span>
        </button>

        <button
          @click="showHover('newFile')"
          class="action"
          aria-label="新建文件"
          title="新建文件"
        >
          <i class="material-icons">note_add</i>
          <span>新建文件</span>
        </button>
      </div>

      <div v-if="user?.perm?.admin">
        <button
          class="action"
          @click="toGlobalSettings"
          aria-label="设置"
          title="设置"
        >
          <i class="material-icons">settings_applications</i>
          <span>设置</span>
        </button>
      </div>
      <button
        v-if="canLogout"
        @click="logout"
        class="action"
        id="logout"
        aria-label="退出"
        title="登出"
      >
        <i class="material-icons">exit_to_app</i>
        <span>登出</span>
      </button>
    </template>
    <template v-else>
      <router-link
        v-if="!hideLoginButton"
        class="action"
        to="/login"
        aria-label="登录"
        title="登录"
      >
        <i class="material-icons">exit_to_app</i>
        <span>登录</span>
      </router-link>

      <router-link
        v-if="signup"
        class="action"
        to="/login"
        aria-label="注册"
        title="注册"
      >
        <i class="material-icons">person_add</i>
        <span>注册</span>
      </router-link>
    </template>

    <div
      class="credits"
      v-if="isFiles && !disableUsedPercentage"
      style="width: 90%; margin: 2em 2.5em 3em 2.5em"
    >
      <progress-bar :val="usage.usedPercentage" size="small"></progress-bar>
      <br />
      磁盘使用：{{ usage.used }} / {{ usage.total }}
    </div>

    <p class="credits">
      <span>
        <span v-if="disableExternal">File Browser</span>
        <a
          v-else
          rel="noopener noreferrer"
          target="_blank"
          href="https://github.com/filebrowser/filebrowser"
          >File Browser</a
        >
        <span> {{ " " }} {{ version }}</span>
      </span>
      <span>
        <a @click="help">帮助</a>
      </span>
    </p>
  </nav>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useVolumesStore } from "@/stores/volumes";
import { useCategoriesStore } from "@/stores/categories";
import type { CategoryGroup } from "@/api/categories";
import { useFavoritesStore } from "@/stores/favorites";
import { useTagsStore } from "@/stores/tags";

import * as auth from "@/utils/auth";
import { getFileIcon, isFileByExtension } from "@/utils/fileIcons";
import {
  version,
  signup,
  hideLoginButton,
  disableExternal,
  disableUsedPercentage,
  noAuth,
  logoutPage,
  loginPage,
} from "@/utils/constants";
import { files as api } from "@/api";
import ProgressBar from "@/components/ProgressBar.vue";
import prettyBytes from "pretty-bytes";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const USAGE_DEFAULT = { used: "0 B", total: "0 B", usedPercentage: 0 };

const $showError = inject<IToastError>("$showError")!;
const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const volumesStore = useVolumesStore();
const categoriesStore = useCategoriesStore();
const favoritesStore = useFavoritesStore();
const tagsStore = useTagsStore();

const { closeHovers, showHover } = layoutStore;
const { user, isLoggedIn } = storeToRefs(authStore);
const { isFiles } = storeToRefs(fileStore);
const { currentPromptName } = storeToRefs(layoutStore);

// State
const usage = reactive({ ...USAGE_DEFAULT });
let usageAbortController = new AbortController();
let usageDebounceTimer: ReturnType<typeof setTimeout> | null = null;

const expandedCategories = reactive<Record<string, boolean>>({});
const collapsedSections = reactive({
  favorites: false,
  tags: false,
  volumes: false,
  categories: false,
});
// Load collapsed state from localStorage
try {
  const saved = localStorage.getItem("nas-file-browser-collapsed-sections");
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.assign(collapsedSections, parsed);
  }
} catch {}

const dragFromIndex = ref(-1);
const dragOverIndex = ref(-1);
const dragOverPosition = ref("");
const showCreateGroup = ref(false);
const newGroupName = ref("");
const collapsedGroups = reactive<Record<string, boolean>>({});
const dragOverGroupId = ref("");
const draggedFavId = ref("");
const sidebarWidth = ref(
  parseInt(localStorage.getItem("nas-file-browser-sidebar-width") || "256")
);
document.documentElement.style.setProperty(
  "--sidebar-width",
  sidebarWidth.value + "px"
);
const isResizing = ref(false);
const startX = ref(0);
const startWidth = ref(0);
const groupInputRef = ref<HTMLInputElement | null>(null);

// Computed
const active = computed(() => currentPromptName.value === "sidebar");
const canLogout = computed(
  () => !noAuth && (loginPage || logoutPage !== "/login")
);

const categoryGroups = computed(() => {
  const subDirs = volumesStore.allSubDirs;
  if (!subDirs.length) return [];

  const groups: Record<string, CategoryGroup> = {};
  const catOrder = ["personal", "shared", "system", "other"];

  for (const cat of categoriesStore.categories) {
    if (!groups[cat.id]) {
      groups[cat.id] = {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        paths: [],
      };
    }
  }

  for (const dir of subDirs) {
    const cat = categoriesStore.classifyPath(dir.path);
    const risk = categoriesStore.getRiskLevel(dir.path);
    if (groups[cat.id]) {
      groups[cat.id].paths.push({
        path: dir.path,
        name: dir.name,
        risk,
        volumeType: "",
      });
    }
  }

  return catOrder
    .filter((id) => groups[id] && groups[id].paths.length > 0)
    .map((id) => groups[id]);
});

// Methods
const startResize = (event: MouseEvent | TouchEvent) => {
  const clientX = "touches" in event ? event.touches[0].clientX : event.clientX;
  isResizing.value = true;
  startX.value = clientX;
  startWidth.value = sidebarWidth.value;
  document.addEventListener("mousemove", onResize);
  document.addEventListener("mouseup", stopResize);
  document.addEventListener("touchmove", onResize, { passive: false });
  document.addEventListener("touchend", stopResize);
  document.body.style.cursor = "col-resize";
  document.body.style.userSelect = "none";
};

const onResize = (event: Event) => {
  if (!isResizing.value) return;
  if (event.cancelable) event.preventDefault();
  const e = event as MouseEvent | TouchEvent;
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const diff = clientX - startX.value;
  const newWidth = Math.min(500, Math.max(180, startWidth.value + diff));
  sidebarWidth.value = newWidth;
  document.documentElement.style.setProperty(
    "--sidebar-width",
    newWidth + "px"
  );
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", onResize);
  document.removeEventListener("mouseup", stopResize);
  document.removeEventListener("touchmove", onResize);
  document.removeEventListener("touchend", stopResize);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
  try {
    localStorage.setItem(
      "nas-file-browser-sidebar-width",
      sidebarWidth.value.toString()
    );
  } catch {}
};

const resetSidebarWidth = () => {
  const defaultWidth = 256;
  sidebarWidth.value = defaultWidth;
  document.documentElement.style.setProperty(
    "--sidebar-width",
    defaultWidth + "px"
  );
  try {
    localStorage.setItem(
      "nas-file-browser-sidebar-width",
      defaultWidth.toString()
    );
  } catch {}
};

const abortOngoingFetchUsage = () => {
  usageAbortController.abort();
};

const debouncedFetchUsage = () => {
  if (usageDebounceTimer) clearTimeout(usageDebounceTimer);
  usageDebounceTimer = setTimeout(() => fetchUsage(), 300);
};

const fetchUsage = async () => {
  const path = route.path.endsWith("/") ? route.path : route.path + "/";
  let usageStats = { ...USAGE_DEFAULT };
  if (disableUsedPercentage) {
    return Object.assign(usage, usageStats);
  }
  try {
    abortOngoingFetchUsage();
    usageAbortController = new AbortController();
    const result = await api.usage(path, usageAbortController.signal);
    usageStats = {
      used: prettyBytes(result.used, { binary: true }),
      total: prettyBytes(result.total, { binary: true }),
      usedPercentage: Math.round((result.used / result.total) * 100),
    };
  } finally {
    return Object.assign(usage, usageStats);
  }
};

const volumeBarColor = (percent: number) => {
  if (percent >= 90) return "var(--icon-red, #DA4453)";
  if (percent >= 70) return "var(--icon-orange, #F5A623)";
  return "var(--blue, #2196F3)";
};

const toggleCategory = (id: string) => {
  expandedCategories[id] = !expandedCategories[id];
};

const toggleSection = (id: keyof typeof collapsedSections) => {
  collapsedSections[id] = !collapsedSections[id];
  try {
    localStorage.setItem(
      "nas-file-browser-collapsed-sections",
      JSON.stringify(collapsedSections)
    );
  } catch {}
};

const riskIcon = (risk: string) => {
  if (risk === "high") return "warning";
  if (risk === "medium") return "info";
  return "check_circle";
};

const navigateVolume = (path: string) => {
  const isFile = isFileByExtension(path);
  const url = isFile ? "/files" + path : "/files" + path + "/";
  router.push({ path: url });
  closeHovers();
};

const removeFavorite = (id: string) => {
  favoritesStore.removeFavorite(id);
};

const favoriteIcon = (name: string) => {
  return isFileByExtension(name) ? getFileIcon(name) : "folder";
};

const clearAllFavorites = async () => {
  if (favoritesStore.sortedFavorites.length === 0) return;
  const favs = [...favoritesStore.favorites];
  for (const fav of favs) {
    await favoritesStore.removeFavorite(fav.id);
  }
};

const createGroup = async () => {
  const name = newGroupName.value.trim();
  if (!name) return;
  await favoritesStore.addGroup(name);
  newGroupName.value = "";
  showCreateGroup.value = false;
};

const deleteGroup = async (id: string) => {
  const result = await favoritesStore.deleteGroup(id);
  if (result.conflict) {
    $showError(new Error("Cannot delete group with favorites"));
  }
};

const toggleGroupCollapse = (id: string) => {
  collapsedGroups[id] = !collapsedGroups[id];
};

const onFavDragStart = (event: DragEvent, favId: string) => {
  draggedFavId.value = favId;
  event.dataTransfer!.effectAllowed = "move";
  event.dataTransfer!.setData("text/plain", favId);
};

const onFavDragOverItem = (event: DragEvent) => {
  event.dataTransfer!.dropEffect = "move";
};

const onFavDragLeaveItem = () => {};

const onFavDropOnItem = async (event: DragEvent) => {
  event.preventDefault();
  dragOverGroupId.value = "";
};

const onFavDragOverGroup = (event: DragEvent, groupId: string) => {
  event.dataTransfer!.dropEffect = "move";
  dragOverGroupId.value = groupId;
};

const onFavDragLeaveGroup = (event: DragEvent) => {
  if (
    !(event.currentTarget as HTMLElement)?.contains(event.relatedTarget as Node)
  ) {
    dragOverGroupId.value = "";
  }
};

const onFavDropOnGroup = async (event: DragEvent, groupId: string) => {
  event.preventDefault();
  dragOverGroupId.value = "";
  if (draggedFavId.value) {
    await favoritesStore.moveFavoriteToGroup(draggedFavId.value, groupId);
    draggedFavId.value = "";
  }
};

const onFavDragEnd = () => {
  dragFromIndex.value = -1;
  dragOverIndex.value = -1;
  dragOverPosition.value = "";
  dragOverGroupId.value = "";
  draggedFavId.value = "";
};

const openTagManager = () => {
  showHover({ prompt: "tag-manager" });
};

const filterByTag = (tagId: string) => {
  tagsStore.setFilter(tagId);
  closeHovers();
};

const clearTagFilter = () => {
  tagsStore.setFilter(null);
};

const openSearch = () => {
  router.push("/search");
  closeHovers();
};

const navigateCategoryFirst = (group: CategoryGroup) => {
  if (group.paths.length > 0) {
    navigateVolume(group.paths[0].path);
  }
  expandedCategories[group.id] = true;
};

const isDuplicateName = (name: string, groupId: string) => {
  const group = categoryGroups.value.find((g) => g.id === groupId);
  if (!group) return false;
  return group.paths.filter((p) => p.name === name).length > 1;
};

const getVolumeLabel = (path: string) => {
  const match = path.match(/^\/(volume\d+)/);
  if (match) return match[1];
  const parts = path.split("/").filter(Boolean);
  if (parts.length > 0) return parts[0];
  return "";
};

const toRoot = () => {
  router.push({ path: "/files" });
  closeHovers();
};

const toAccountSettings = () => {
  router.push({ path: "/settings/profile" });
  closeHovers();
};

const toGlobalSettings = () => {
  router.push({ path: "/settings/global" });
  closeHovers();
};

const help = () => {
  showHover("help");
};

const logout = () => auth.logout();

// Watchers
watch(
  () => route.path,
  (path) => {
    if (path.includes("/files")) {
      debouncedFetchUsage();
    }
  },
  { immediate: true }
);

// Lifecycle
onMounted(() => {
  Promise.all([favoritesStore.loadFavorites(), tagsStore.loadTags()]);
  if (user.value?.perm?.admin) {
    volumesStore.fetchVolumes();
    categoriesStore.fetchCategories();
  }
});

onUnmounted(() => {
  if (usageDebounceTimer) clearTimeout(usageDebounceTimer);
  abortOngoingFetchUsage();
});
</script>
