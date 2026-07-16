<template>
  <div v-show="active" @click="closeHovers" class="overlay"></div>
  <nav
    class="sidebar"
    :class="{
      active,
      'is-resizing': isResizing,
      'is-scrolling': sidebarScrolling,
    }"
    @scroll.passive="onSidebarScroll"
  >
    <div
      class="sidebar-resize-handle"
      @mousedown="startResize"
      @touchstart="startResize"
      @dblclick="resetSidebarWidth"
      title="拖拽调节侧边栏宽度"
    ></div>
    <template v-if="isLoggedIn">
      <div class="sidebar-primary-nav">
        <button
          type="button"
          @click="toAccountSettings"
          class="action sidebar-user-card"
        >
          <i class="material-icons">person</i>
          <span>{{ user?.username }}</span>
        </button>
        <button
          type="button"
          class="action sidebar-command"
          @click="toRoot"
          aria-label="我的文件"
          title="我的文件"
        >
          <i class="material-icons">folder</i>
          <span>我的文件</span>
        </button>

        <button
          type="button"
          class="action sidebar-command"
          @click="openSearch"
          aria-label="搜索"
          title="搜索"
        >
          <i class="material-icons">search</i>
          <span>搜索</span>
        </button>
      </div>

      <!-- Favorites Section -->
      <div class="favorites-section sidebar-module">
        <SidebarSectionHeader
          icon="star"
          label="收藏夹"
          tone="favorite"
          :expanded="!collapsedSections.favorites"
          @toggle="toggleSection('favorites')"
        >
          <template #tools>
            <button
              class="section-action-btn"
              type="button"
              title="新建分组"
              @click.stop.prevent="showCreateGroup = !showCreateGroup"
            >
              <i class="material-icons">create_new_folder</i>
            </button>
            <button
              v-if="favoritesStore.sortedFavorites.length > 0"
              class="section-action-btn"
              type="button"
              title="清空收藏夹"
              @click.stop.prevent="showClearFavoritesConfirm = true"
            >
              <i class="material-icons">delete_sweep</i>
            </button>
          </template>
        </SidebarSectionHeader>
        <div
          v-if="showClearFavoritesConfirm"
          class="sidebar-inline-confirm"
          role="alertdialog"
          aria-label="确认清空收藏夹"
        >
          <span
            >确认清空全部
            {{ favoritesStore.sortedFavorites.length }} 项收藏？</span
          >
          <div class="sidebar-inline-confirm-actions">
            <button type="button" @click="showClearFavoritesConfirm = false">
              取消
            </button>
            <button type="button" class="danger" @click="clearAllFavorites">
              清空
            </button>
          </div>
        </div>
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
              :class="favoriteDropClass(fav.id)"
              draggable="true"
              @click="navigateVolume(fav.path)"
              :title="fav.path"
              @dragstart="onFavDragStart($event, fav.id)"
              @dragover.prevent="onFavDragOverItem($event, fav.id)"
              @dragleave="onFavDragLeaveItem"
              @drop="onFavDropOnItem($event, fav.id)"
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
            <SidebarGroupHeader
              class="favorite-group-header"
              icon="inventory_2"
              :label="group.name"
              :count="(favoritesStore.favoritesByGroup[group.id] || []).length"
              :expanded="!collapsedGroups[group.id]"
              :color="group.color || 'var(--blue)'"
              @primary="toggleGroupCollapse(group.id)"
              @toggle="toggleGroupCollapse(group.id)"
              @dragover.prevent="onFavDragOverGroup($event, group.id)"
              @drop="onFavDropOnGroup($event, group.id)"
              @dragleave="onFavDragLeaveGroup"
              :class="{ 'drag-over-group': dragOverGroupId === group.id }"
            >
              <template #actions>
                <button
                  class="section-action-btn"
                  type="button"
                  title="删除分组"
                  @click.stop.prevent="deleteGroup(group.id)"
                >
                  <i class="material-icons">close</i>
                </button>
              </template>
            </SidebarGroupHeader>
            <template v-if="!collapsedGroups[group.id]">
              <button
                v-for="fav in favoritesStore.favoritesByGroup[group.id] || []"
                :key="fav.id"
                class="action favorite-item category-path-item"
                :class="favoriteDropClass(fav.id)"
                draggable="true"
                @click="navigateVolume(fav.path)"
                :title="fav.path"
                @dragstart="onFavDragStart($event, fav.id)"
                @dragover.prevent="onFavDragOverItem($event, fav.id)"
                @dragleave="onFavDragLeaveItem"
                @drop="onFavDropOnItem($event, fav.id)"
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
      <div class="tags-section sidebar-module">
        <SidebarSectionHeader
          icon="label"
          label="标签"
          :expanded="!collapsedSections.tags"
          @toggle="toggleSection('tags')"
        >
          <template #tools>
            <button
              class="section-action-btn"
              type="button"
              title="管理标签"
              @click.stop.prevent="openTagManager"
            >
              <i class="material-icons">settings</i>
            </button>
          </template>
        </SidebarSectionHeader>
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
        class="volumes-section sidebar-module"
      >
        <SidebarSectionHeader
          icon="storage"
          label="存储卷"
          :expanded="!collapsedSections.volumes"
          @toggle="toggleSection('volumes')"
        />
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
        class="categories-section sidebar-module"
      >
        <SidebarSectionHeader
          icon="category"
          label="目录分类"
          :expanded="!collapsedSections.categories"
          @toggle="toggleSection('categories')"
        />
        <template v-if="!collapsedSections.categories">
          <div
            v-for="group in categoryGroups"
            :key="group.id"
            class="category-group"
          >
            <SidebarGroupHeader
              class="category-group-header"
              :icon="group.icon"
              :label="group.name"
              :count="group.paths.length"
              :expanded="Boolean(expandedCategories[group.id])"
              :color="group.color"
              @primary="navigateCategoryFirst(group)"
              @toggle="toggleCategory(group.id)"
            />
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

      <div v-if="user?.perm?.create" class="sidebar-secondary-actions">
        <button
          @click="showHover('newDir')"
          class="action sidebar-command"
          aria-label="新建文件夹"
          title="新建文件夹"
        >
          <i class="material-icons">create_new_folder</i>
          <span>新建文件夹</span>
        </button>

        <button
          @click="showHover('newFile')"
          class="action sidebar-command"
          aria-label="新建文件"
          title="新建文件"
        >
          <i class="material-icons">note_add</i>
          <span>新建文件</span>
        </button>
      </div>

      <div v-if="user?.perm?.admin" class="sidebar-secondary-actions">
        <button
          class="action sidebar-command"
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
        class="action sidebar-command"
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

    <p class="credits">
      <span>
        <a
          rel="noopener noreferrer"
          target="_blank"
          href="https://github.com/Kkwans/nas-file-browser"
          >NAS File Browser</a
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
import { computed, inject, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useLayoutStore } from "@/stores/layout";
import { useVolumesStore } from "@/stores/volumes";
import { useCategoriesStore } from "@/stores/categories";
import type { CategoryGroup } from "@/api/categories";
import { useFavoritesStore } from "@/stores/favorites";
import { useTagsStore } from "@/stores/tags";
import SidebarSectionHeader from "@/components/sidebar/SidebarSectionHeader.vue";
import SidebarGroupHeader from "@/components/sidebar/SidebarGroupHeader.vue";

import * as auth from "@/utils/auth";
import { getFileIcon, isFileByExtension } from "@/utils/fileIcons";
import {
  getFavoriteDropPosition,
  type FavoriteDropPosition,
} from "@/utils/sidebarFavorites";
import {
  version,
  signup,
  hideLoginButton,
  noAuth,
  logoutPage,
  loginPage,
} from "@/utils/constants";

const $showError = inject<IToastError>("$showError")!;
const route = useRoute();
const router = useRouter();

const authStore = useAuthStore();
const layoutStore = useLayoutStore();
const volumesStore = useVolumesStore();
const categoriesStore = useCategoriesStore();
const favoritesStore = useFavoritesStore();
const tagsStore = useTagsStore();

const { closeHovers, showHover } = layoutStore;
const { user, isLoggedIn } = storeToRefs(authStore);
const { currentPromptName } = storeToRefs(layoutStore);

// State

const expandedCategories = reactive<Record<string, boolean>>({});
const collapsedSections = reactive({
  favorites: false,
  tags: true,
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

const showCreateGroup = ref(false);
const showClearFavoritesConfirm = ref(false);
const newGroupName = ref("");
const collapsedGroups = reactive<Record<string, boolean>>({});
try {
  const savedGroups = localStorage.getItem(
    "nas-file-browser-collapsed-favorite-groups"
  );
  if (savedGroups) Object.assign(collapsedGroups, JSON.parse(savedGroups));
} catch {}
const dragOverGroupId = ref("");
const draggedFavId = ref("");
const dragOverFavoriteId = ref("");
const dragOverFavoritePosition = ref<FavoriteDropPosition>("before");
const sidebarWidth = ref(
  parseInt(localStorage.getItem("nas-file-browser-sidebar-width") || "256")
);
document.documentElement.style.setProperty(
  "--sidebar-width",
  sidebarWidth.value + "px"
);
const isResizing = ref(false);
const sidebarScrolling = ref(false);
let sidebarScrollTimer: ReturnType<typeof setTimeout> | undefined;
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

const onSidebarScroll = () => {
  sidebarScrolling.value = true;
  if (sidebarScrollTimer) clearTimeout(sidebarScrollTimer);
  sidebarScrollTimer = setTimeout(() => {
    sidebarScrolling.value = false;
  }, 700);
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
  showClearFavoritesConfirm.value = false;
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
  try {
    localStorage.setItem(
      "nas-file-browser-collapsed-favorite-groups",
      JSON.stringify(collapsedGroups)
    );
  } catch {}
};

const onFavDragStart = (event: DragEvent, favId: string) => {
  draggedFavId.value = favId;
  event.dataTransfer!.effectAllowed = "move";
  event.dataTransfer!.setData("text/plain", favId);
};

const onFavDragOverItem = (event: DragEvent, favoriteId: string) => {
  event.dataTransfer!.dropEffect = "move";
  const element = event.currentTarget as HTMLElement;
  const rect = element.getBoundingClientRect();
  dragOverFavoriteId.value = favoriteId;
  dragOverFavoritePosition.value = getFavoriteDropPosition(
    event.clientY,
    rect.top,
    rect.height
  );
};

const onFavDragLeaveItem = (event: DragEvent) => {
  const element = event.currentTarget as HTMLElement;
  if (!element.contains(event.relatedTarget as Node)) {
    dragOverFavoriteId.value = "";
  }
};

const onFavDropOnItem = async (event: DragEvent, targetId: string) => {
  event.preventDefault();
  dragOverGroupId.value = "";
  if (draggedFavId.value && draggedFavId.value !== targetId) {
    await favoritesStore.moveAndReorderFavorite(
      draggedFavId.value,
      targetId,
      dragOverFavoritePosition.value
    );
  }
  dragOverFavoriteId.value = "";
  draggedFavId.value = "";
};

const favoriteDropClass = (favoriteId: string) => ({
  "drag-over-top":
    dragOverFavoriteId.value === favoriteId &&
    dragOverFavoritePosition.value === "before",
  "drag-over-bottom":
    dragOverFavoriteId.value === favoriteId &&
    dragOverFavoritePosition.value === "after",
});

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
  dragOverGroupId.value = "";
  dragOverFavoriteId.value = "";
  draggedFavId.value = "";
};

const openTagManager = () => {
  showHover({ prompt: "tag-manager" });
};

const filterByTag = (tagId: string) => {
  if (tagsStore.activeFilter === tagId) {
    clearTagFilter();
    return;
  }
  tagsStore.setFilterMode("current");
  tagsStore.setFilter(tagId);
  const base = route.path.startsWith("/files")
    ? route.path.slice("/files".length) || "/"
    : "/";
  router.push({
    path: "/search",
    query: {
      tag: tagId,
      base: base.endsWith("/") ? base : base + "/",
      scope: "current",
    },
  });
  closeHovers();
};

const clearTagFilter = () => {
  tagsStore.setFilter(null);
  if (typeof route.query.tag === "string") {
    const base = typeof route.query.base === "string" ? route.query.base : "/";
    router.push({ path: "/files" + base });
  }
};

const openSearch = () => {
  const base = route.path.startsWith("/files")
    ? route.path.slice("/files".length) || "/"
    : "/";
  router.push({
    path: "/search",
    query: { base: base.endsWith("/") ? base : `${base}/`, scope: "current" },
  });
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

// Lifecycle
let loadedUserId: number | null = null;

watch(
  () => user.value?.id,
  async (userId) => {
    if (!userId) {
      loadedUserId = null;
      favoritesStore.favorites = [];
      favoritesStore.groups = [];
      tagsStore.tags = [];
      tagsStore.activeFilter = null;
      return;
    }
    if (loadedUserId === userId) return;

    loadedUserId = userId;
    await Promise.all([favoritesStore.loadFavorites(), tagsStore.loadTags()]);
    if (user.value?.id !== userId) return;
    if (user.value?.perm?.admin) {
      volumesStore.fetchVolumes();
      categoriesStore.fetchCategories();
    }
  },
  { immediate: true }
);

watch(
  () => favoritesStore.sortedGroups.map((group) => group.id),
  (groupIds) => {
    for (const groupId of groupIds) {
      if (!(groupId in collapsedGroups)) collapsedGroups[groupId] = true;
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (sidebarScrollTimer) clearTimeout(sidebarScrollTimer);
  stopResize();
});
</script>
