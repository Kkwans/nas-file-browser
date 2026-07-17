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
      <div class="sidebar-personalized-stack">
        <div
          class="sidebar-primary-nav sidebar-sortable-module"
          :class="sidebarDropClass('module', 'moduleOrder', 'user')"
          :style="moduleStyle('user')"
          @dragover.prevent="
            onSidebarDragOver($event, 'module', 'moduleOrder', 'user')
          "
          @drop="onModuleDrop('user')"
        >
          <button
            type="button"
            @click="toAccountSettings"
            class="action sidebar-user-card"
            draggable="true"
            @dragstart="onModuleDragStart($event, 'user')"
            @dragend="clearSidebarDrag"
          >
            <i class="material-icons">person</i>
            <span>{{ user?.username }}</span>
          </button>
        </div>

        <div
          class="system-options-section sidebar-module sidebar-sortable-module"
          :class="sidebarDropClass('module', 'moduleOrder', 'system-options')"
          :style="moduleStyle('system-options')"
          @dragover.prevent="
            onSidebarDragOver($event, 'module', 'moduleOrder', 'system-options')
          "
          @drop="onModuleDrop('system-options')"
        >
          <SidebarSectionHeader
            icon="tune"
            label="系统选项"
            :expanded="!collapsedSections.systemOptions"
            draggable="true"
            @dragstart="onModuleDragStart($event, 'system-options')"
            @dragend="clearSidebarDrag"
            @toggle="toggleSection('systemOptions')"
          />
          <template v-if="!collapsedSections.systemOptions">
            <button
              v-for="option in orderedSystemOptions"
              :key="option.id"
              type="button"
              class="action sidebar-command sidebar-sortable-item"
              :class="
                sidebarDropClass('preference', 'systemOptionOrder', option.id)
              "
              draggable="true"
              @click="runSystemOption(option.id)"
              @dragstart.stop="
                onPreferenceDragStart($event, 'systemOptionOrder', option.id)
              "
              @dragover.prevent="
                onSidebarDragOver(
                  $event,
                  'preference',
                  'systemOptionOrder',
                  option.id
                )
              "
              @drop.stop="onPreferenceDrop('systemOptionOrder', option.id)"
              @dragend="clearSidebarDrag"
            >
              <i class="material-icons">{{ option.icon }}</i>
              <span>{{ option.label }}</span>
            </button>
          </template>
        </div>

        <!-- Favorites Section -->
        <div
          class="favorites-section sidebar-module sidebar-sortable-module"
          :class="sidebarDropClass('module', 'moduleOrder', 'favorites')"
          :style="moduleStyle('favorites')"
          @dragover.prevent="
            onSidebarDragOver($event, 'module', 'moduleOrder', 'favorites')
          "
          @drop="onModuleDrop('favorites')"
        >
          <SidebarSectionHeader
            icon="star"
            label="收藏夹"
            tone="favorite"
            :expanded="!collapsedSections.favorites"
            draggable="true"
            @dragstart="onModuleDragStart($event, 'favorites')"
            @dragend="clearSidebarDrag"
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
            <div
              class="favorites-ungrouped-drop-zone"
              :class="{ active: ungroupedDropActive }"
              @dragover.prevent="onUngroupedDragOver"
              @dragleave="ungroupedDropActive = false"
              @drop.stop="onUngroupedDrop"
            >
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
              <span
                v-if="ungroupedDropActive"
                class="favorites-ungrouped-drop-hint"
                >移出分组</span
              >
            </div>
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
                :count="
                  (favoritesStore.favoritesByGroup[group.id] || []).length
                "
                :expanded="!collapsedGroups[group.id]"
                :color="group.color || 'var(--blue)'"
                draggable="true"
                @dragstart.stop="onFavoriteGroupDragStart($event, group.id)"
                @dragend="clearSidebarDrag"
                @toggle="toggleGroupCollapse(group.id)"
                @dragover.prevent="onFavDragOverGroup($event, group.id)"
                @drop="onFavDropOnGroup($event, group.id)"
                @dragleave="onFavDragLeaveGroup"
                :class="{
                  'drag-over-group':
                    dragOverGroupId === group.id && !draggedFavoriteGroupId,
                  'sidebar-drop-before':
                    draggedFavoriteGroupId &&
                    favoriteGroupDropId === group.id &&
                    favoriteGroupDropPosition === 'before',
                  'sidebar-drop-after':
                    draggedFavoriteGroupId &&
                    favoriteGroupDropId === group.id &&
                    favoriteGroupDropPosition === 'after',
                }"
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
                    (favoritesStore.favoritesByGroup[group.id] || []).length ===
                    0
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
        <div
          class="tags-section sidebar-module sidebar-sortable-module"
          :class="sidebarDropClass('module', 'moduleOrder', 'tags')"
          :style="moduleStyle('tags')"
          @dragover.prevent="
            onSidebarDragOver($event, 'module', 'moduleOrder', 'tags')
          "
          @drop="onModuleDrop('tags')"
        >
          <SidebarSectionHeader
            icon="label"
            label="标签"
            :expanded="!collapsedSections.tags"
            draggable="true"
            @dragstart="onModuleDragStart($event, 'tags')"
            @dragend="clearSidebarDrag"
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
              v-for="tag in orderedTags"
              :key="tag.id"
              class="action tag-filter-item sidebar-sortable-item"
              :class="[
                { active: tagsStore.activeFilter === tag.id },
                sidebarDropClass('preference', 'tagOrder', tag.id),
              ]"
              draggable="true"
              @click="filterByTag(tag.id)"
              @dragstart.stop="
                onPreferenceDragStart($event, 'tagOrder', tag.id)
              "
              @dragover.prevent="
                onSidebarDragOver($event, 'preference', 'tagOrder', tag.id)
              "
              @drop.stop="onPreferenceDrop('tagOrder', tag.id)"
              @dragend="clearSidebarDrag"
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
          class="volumes-section sidebar-module sidebar-sortable-module"
          :class="sidebarDropClass('module', 'moduleOrder', 'volumes')"
          :style="moduleStyle('volumes')"
          @dragover.prevent="
            onSidebarDragOver($event, 'module', 'moduleOrder', 'volumes')
          "
          @drop="onModuleDrop('volumes')"
        >
          <SidebarSectionHeader
            icon="storage"
            label="存储卷"
            :expanded="!collapsedSections.volumes"
            draggable="true"
            @dragstart="onModuleDragStart($event, 'volumes')"
            @dragend="clearSidebarDrag"
            @toggle="toggleSection('volumes')"
          />
          <template v-if="!collapsedSections.volumes">
            <button
              v-for="vol in orderedVolumes"
              :key="vol.path"
              class="action volume-item sidebar-sortable-item"
              :class="sidebarDropClass('preference', 'volumeOrder', vol.path)"
              draggable="true"
              @click="navigateVolume(vol.path)"
              @dragstart.stop="
                onPreferenceDragStart($event, 'volumeOrder', vol.path)
              "
              @dragover.prevent="
                onSidebarDragOver($event, 'preference', 'volumeOrder', vol.path)
              "
              @drop.stop="onPreferenceDrop('volumeOrder', vol.path)"
              @dragend="clearSidebarDrag"
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
          class="categories-section sidebar-module sidebar-sortable-module"
          :class="sidebarDropClass('module', 'moduleOrder', 'categories')"
          :style="moduleStyle('categories')"
          @dragover.prevent="
            onSidebarDragOver($event, 'module', 'moduleOrder', 'categories')
          "
          @drop="onModuleDrop('categories')"
        >
          <SidebarSectionHeader
            icon="category"
            label="目录分类"
            :expanded="!collapsedSections.categories"
            draggable="true"
            @dragstart="onModuleDragStart($event, 'categories')"
            @dragend="clearSidebarDrag"
            @toggle="toggleSection('categories')"
          />
          <template v-if="!collapsedSections.categories">
            <div
              v-for="group in orderedCategoryGroups"
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
                draggable="true"
                :class="
                  sidebarDropClass('preference', 'categoryOrder', group.id)
                "
                @dragstart.stop="
                  onPreferenceDragStart($event, 'categoryOrder', group.id)
                "
                @dragover.prevent="
                  onSidebarDragOver(
                    $event,
                    'preference',
                    'categoryOrder',
                    group.id
                  )
                "
                @drop.stop="onPreferenceDrop('categoryOrder', group.id)"
                @dragend="clearSidebarDrag"
                @toggle="toggleCategory(group.id)"
              />
              <div v-if="expandedCategories[group.id]" class="category-paths">
                <button
                  v-for="p in orderedCategoryPaths(group)"
                  :key="p.path"
                  class="action category-path-item sidebar-sortable-item"
                  :class="sidebarDropClass('category-path', group.id, p.path)"
                  draggable="true"
                  @click="navigateVolume(p.path)"
                  :title="p.path"
                  @dragstart.stop="
                    onCategoryPathDragStart($event, group.id, p.path)
                  "
                  @dragover.prevent="
                    onSidebarDragOver($event, 'category-path', group.id, p.path)
                  "
                  @drop.stop="onCategoryPathDrop(group, p.path)"
                  @dragend="clearSidebarDrag"
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

        <button
          v-if="canLogout"
          @click="logout"
          class="action sidebar-command sidebar-sortable-module"
          :class="sidebarDropClass('module', 'moduleOrder', 'logout')"
          id="logout"
          :style="moduleStyle('logout')"
          draggable="true"
          @dragstart="onModuleDragStart($event, 'logout')"
          @dragover.prevent="
            onSidebarDragOver($event, 'module', 'moduleOrder', 'logout')
          "
          @drop="onModuleDrop('logout')"
          @dragend="clearSidebarDrag"
          aria-label="退出"
          title="登出"
        >
          <i class="material-icons">exit_to_app</i>
          <span>登出</span>
        </button>
      </div>
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
import { useSidebarPreferencesStore } from "@/stores/sidebarPreferences";
import SidebarSectionHeader from "@/components/sidebar/SidebarSectionHeader.vue";
import SidebarGroupHeader from "@/components/sidebar/SidebarGroupHeader.vue";

import * as auth from "@/utils/auth";
import { getFileIcon, isFileByExtension } from "@/utils/fileIcons";
import {
  getFavoriteDropPosition,
  type FavoriteDropPosition,
} from "@/utils/sidebarFavorites";
import type {
  SidebarModuleId,
  SidebarPreferences,
  SystemOptionId,
} from "@/utils/sidebarPreferences";
import {
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
const sidebarPreferencesStore = useSidebarPreferencesStore();

const { closeHovers, showHover } = layoutStore;
const { user, isLoggedIn } = storeToRefs(authStore);
const { currentPromptName } = storeToRefs(layoutStore);

// State

const expandedCategories = reactive<Record<string, boolean>>({});
const collapsedSections = reactive({
  systemOptions: true,
  favorites: false,
  tags: true,
  volumes: false,
  categories: true,
});
// Load collapsed state from localStorage
try {
  const saved = localStorage.getItem("nas-file-browser-collapsed-sections-v2");
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
const draggedFavoriteGroupId = ref("");
const favoriteGroupDropId = ref("");
const favoriteGroupDropPosition = ref<FavoriteDropPosition>("before");
const ungroupedDropActive = ref(false);
const sidebarDropTarget = ref<{
  kind: "module" | "preference" | "category-path";
  key: string;
  id: string;
  position: FavoriteDropPosition;
} | null>(null);
const draggedModuleId = ref<SidebarModuleId | "">("");
const draggedPreference = ref<{
  key: Exclude<keyof SidebarPreferences, "categoryPathOrder">;
  id: string;
} | null>(null);
const draggedCategoryPath = ref<{ groupId: string; path: string } | null>(null);
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

const systemOptions = computed<
  Array<{ id: SystemOptionId; icon: string; label: string }>
>(() => [
  { id: "files", icon: "folder", label: "我的文件" },
  { id: "search", icon: "search", label: "搜索" },
  ...(user.value?.perm?.create
    ? ([
        { id: "new-directory", icon: "create_new_folder", label: "新建文件夹" },
        { id: "new-file", icon: "note_add", label: "新建文件" },
      ] satisfies Array<{
        id: SystemOptionId;
        icon: string;
        label: string;
      }>)
    : []),
]);

const orderedSystemOptions = computed(() =>
  sidebarPreferencesStore.ordered(
    systemOptions.value,
    "systemOptionOrder",
    (option) => option.id
  )
);

const orderedTags = computed(() =>
  sidebarPreferencesStore.ordered(
    tagsStore.sortedTags,
    "tagOrder",
    (tag) => tag.id
  )
);

const orderedVolumes = computed(() =>
  sidebarPreferencesStore.ordered(
    volumesStore.displayVolumes,
    "volumeOrder",
    (volume) => volume.path
  )
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

const orderedCategoryGroups = computed(() =>
  sidebarPreferencesStore.ordered(
    categoryGroups.value,
    "categoryOrder",
    (group) => group.id
  )
);

const visibleModuleIds = computed<SidebarModuleId[]>(() => {
  const ids: SidebarModuleId[] = [
    "user",
    "system-options",
    "favorites",
    "tags",
  ];
  if (user.value?.perm?.admin && categoryGroups.value.length > 0) {
    ids.push("categories");
  }
  if (user.value?.perm?.admin && volumesStore.displayVolumes.length > 0) {
    ids.push("volumes");
  }
  if (canLogout.value) ids.push("logout");
  return ids;
});

// Methods
const moduleStyle = (id: SidebarModuleId) => ({
  order: sidebarPreferencesStore.moduleOrder.indexOf(id),
});

const orderedCategoryPaths = (group: CategoryGroup) =>
  sidebarPreferencesStore.orderedCategoryPaths(
    group.id,
    group.paths,
    (path) => path.path
  );

const onModuleDragStart = (event: DragEvent, id: SidebarModuleId) => {
  clearSidebarDrag();
  draggedModuleId.value = id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `sidebar-module:${id}`);
  }
};

const onModuleDrop = async (targetId: SidebarModuleId) => {
  if (!draggedModuleId.value || draggedModuleId.value === targetId) return;
  await sidebarPreferencesStore.reorder(
    "moduleOrder",
    visibleModuleIds.value,
    draggedModuleId.value,
    targetId,
    sidebarDropTarget.value?.position ?? "before"
  );
  clearSidebarDrag();
};

const onSidebarDragOver = (
  event: DragEvent,
  kind: "module" | "preference" | "category-path",
  key: string,
  id: string
) => {
  const valid =
    (kind === "module" && Boolean(draggedModuleId.value)) ||
    (kind === "preference" && draggedPreference.value?.key === key) ||
    (kind === "category-path" && draggedCategoryPath.value?.groupId === key);
  if (!valid) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
    return;
  }
  event.stopPropagation();
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  sidebarDropTarget.value = {
    kind,
    key,
    id,
    position: getFavoriteDropPosition(event.clientY, rect.top, rect.height),
  };
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
};

const sidebarDropClass = (
  kind: "module" | "preference" | "category-path",
  key: string,
  id: string
) => ({
  "sidebar-drop-before":
    sidebarDropTarget.value?.kind === kind &&
    sidebarDropTarget.value.key === key &&
    sidebarDropTarget.value.id === id &&
    sidebarDropTarget.value.position === "before",
  "sidebar-drop-after":
    sidebarDropTarget.value?.kind === kind &&
    sidebarDropTarget.value.key === key &&
    sidebarDropTarget.value.id === id &&
    sidebarDropTarget.value.position === "after",
});

const onPreferenceDragStart = (
  event: DragEvent,
  key: Exclude<keyof SidebarPreferences, "categoryPathOrder">,
  id: string
) => {
  clearSidebarDrag();
  draggedPreference.value = { key, id };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `sidebar-item:${key}:${id}`);
  }
};

const preferenceIds = (
  key: Exclude<keyof SidebarPreferences, "categoryPathOrder">
) => {
  if (key === "systemOptionOrder") {
    return orderedSystemOptions.value.map((option) => option.id);
  }
  if (key === "tagOrder") return orderedTags.value.map((tag) => tag.id);
  if (key === "categoryOrder") {
    return orderedCategoryGroups.value.map((group) => group.id);
  }
  if (key === "volumeOrder") {
    return orderedVolumes.value.map((volume) => volume.path);
  }
  return visibleModuleIds.value;
};

const onPreferenceDrop = async (
  key: Exclude<keyof SidebarPreferences, "categoryPathOrder">,
  targetId: string
) => {
  const dragged = draggedPreference.value;
  if (!dragged || dragged.key !== key || dragged.id === targetId) return;
  await sidebarPreferencesStore.reorder(
    key,
    preferenceIds(key),
    dragged.id,
    targetId,
    sidebarDropTarget.value?.position ?? "before"
  );
  clearSidebarDrag();
};

const onCategoryPathDragStart = (
  event: DragEvent,
  groupId: string,
  path: string
) => {
  clearSidebarDrag();
  draggedCategoryPath.value = { groupId, path };
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(
      "text/plain",
      `sidebar-category-path:${groupId}:${path}`
    );
  }
};

const onCategoryPathDrop = async (group: CategoryGroup, targetPath: string) => {
  const dragged = draggedCategoryPath.value;
  if (!dragged || dragged.groupId !== group.id || dragged.path === targetPath) {
    return;
  }
  await sidebarPreferencesStore.reorderCategoryPath(
    group.id,
    orderedCategoryPaths(group).map((path) => path.path),
    dragged.path,
    targetPath,
    sidebarDropTarget.value?.position ?? "before"
  );
  clearSidebarDrag();
};

const clearSidebarDrag = () => {
  draggedModuleId.value = "";
  draggedPreference.value = null;
  draggedCategoryPath.value = null;
  draggedFavoriteGroupId.value = "";
  favoriteGroupDropId.value = "";
  ungroupedDropActive.value = false;
  sidebarDropTarget.value = null;
  onFavDragEnd();
};

const runSystemOption = (id: SystemOptionId) => {
  if (id === "files") toRoot();
  else if (id === "search") openSearch();
  else if (id === "new-directory") showHover("newDir");
  else showHover("newFile");
};

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
      "nas-file-browser-collapsed-sections-v2",
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
  clearSidebarDrag();
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
  if (draggedFavoriteGroupId.value) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    favoriteGroupDropId.value = groupId;
    favoriteGroupDropPosition.value = getFavoriteDropPosition(
      event.clientY,
      rect.top,
      rect.height
    );
    return;
  }
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
  if (draggedFavoriteGroupId.value) {
    const fromIndex = favoritesStore.sortedGroups.findIndex(
      (group) => group.id === draggedFavoriteGroupId.value
    );
    const toIndex = favoritesStore.sortedGroups.findIndex(
      (group) => group.id === groupId
    );
    if (fromIndex >= 0 && toIndex >= 0 && fromIndex !== toIndex) {
      let destination = toIndex;
      if (favoriteGroupDropPosition.value === "after" && fromIndex > toIndex) {
        destination++;
      } else if (
        favoriteGroupDropPosition.value === "before" &&
        fromIndex < toIndex
      ) {
        destination--;
      }
      await favoritesStore.reorderGroups(fromIndex, destination);
    }
    clearSidebarDrag();
    return;
  }
  if (draggedFavId.value) {
    await favoritesStore.moveFavoriteToGroup(draggedFavId.value, groupId);
    draggedFavId.value = "";
  }
};

const onUngroupedDragOver = (event: DragEvent) => {
  if (!draggedFavId.value) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = "none";
    return;
  }
  const favorite = favoritesStore.favorites.find(
    (item) => item.id === draggedFavId.value
  );
  if (!favorite?.groupId) return;
  ungroupedDropActive.value = true;
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
};

const onUngroupedDrop = async (event: DragEvent) => {
  event.preventDefault();
  ungroupedDropActive.value = false;
  if (draggedFavId.value) {
    await favoritesStore.moveFavoriteToGroup(draggedFavId.value, "");
  }
  clearSidebarDrag();
};

const onFavoriteGroupDragStart = (event: DragEvent, groupId: string) => {
  clearSidebarDrag();
  draggedFavoriteGroupId.value = groupId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `favorite-group:${groupId}`);
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
    await Promise.all([
      favoritesStore.loadFavorites(),
      tagsStore.loadTags(),
      sidebarPreferencesStore.load(),
    ]);
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
