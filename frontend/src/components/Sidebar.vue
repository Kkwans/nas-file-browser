<template>
  <div v-show="active" @click="closeHovers" class="overlay"></div>
  <nav class="sidebar" :class="{ active }" :style="{ width: sidebarWidth + 'px' }">
    <div
      class="sidebar-resize-handle"
      @mousedown="startResize"
      @touchstart="startResize"
      @dblclick="resetSidebarWidth"
      :title="$t('sidebar.resizeSidebar')"
    ></div>
    <template v-if="isLoggedIn">
      <button @click="toAccountSettings" class="action">
        <i class="material-icons">person</i>
        <span>{{ user.username }}</span>
      </button>
      <button
        class="action"
        @click="toRoot"
        :aria-label="$t('sidebar.myFiles')"
        :title="$t('sidebar.myFiles')"
      >
        <i class="material-icons">folder</i>
        <span>{{ $t("sidebar.myFiles") }}</span>
      </button>

      <button
        class="action"
        @click="openSearch"
        :aria-label="$t('buttons.search')"
        :title="$t('buttons.search')"
      >
        <i class="material-icons">search</i>
        <span>{{ $t("buttons.search") }}</span>
      </button>

      <!-- Favorites Section -->
      <div class="favorites-section">
        <button
          class="favorites-header"
          @click="toggleSection('favorites')"
        >
          <i class="material-icons">star</i>
          <span>{{ $t("sidebar.favorites") }}</span>
          <button
            class="section-action-btn"
            :title="$t('sidebar.createGroup') || 'New Group'"
            @click.stop.prevent="showCreateGroup = !showCreateGroup"
          >
            <i class="material-icons">create_new_folder</i>
          </button>
          <button
            v-if="favoritesStore.sortedFavorites.length > 0"
            class="section-action-btn"
            :title="$t('sidebar.clearAllFavorites')"
            @click.stop.prevent="clearAllFavorites"
          >
            <i class="material-icons">delete_sweep</i>
          </button>
          <i class="material-icons section-arrow" :class="{ expanded: !collapsedSections.favorites }">expand_more</i>
        </button>
        <template v-if="!collapsedSections.favorites">
        <!-- Create group input -->
        <div v-if="showCreateGroup" class="create-group-input">
          <input
            v-model="newGroupName"
            :placeholder="$t('sidebar.groupNamePlaceholder') || 'Group name...'"
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
        <div v-if="favoritesStore.sortedFavorites.length === 0 && favoritesStore.sortedGroups.length === 0" class="section-empty">
          <i class="material-icons">star_border</i>
          <span>{{ $t("sidebar.noFavorites") }}</span>
        </div>
        <!-- Ungrouped favorites -->
        <template v-if="favoritesStore.favoritesByGroup[''] && favoritesStore.favoritesByGroup[''].length > 0">
          <button
            v-for="(fav, index) in favoritesStore.favoritesByGroup['']"
            :key="fav.id"
            class="action favorite-item"
            draggable="true"
            @click="navigateVolume(fav.path)"
            :title="fav.path"
            @dragstart="onFavDragStart($event, fav.id)"
            @dragover.prevent="onFavDragOverItem($event, fav.id)"
            @dragleave="onFavDragLeaveItem"
            @drop="onFavDropOnItem($event, fav.id)"
            @dragend="onFavDragEnd"
          >
            <i class="material-icons favorite-icon favorite-drag-handle">drag_indicator</i>
            <i class="material-icons favorite-icon">folder</i>
            <div class="favorite-info">
              <span class="favorite-name">{{ fav.name }}</span>
              <span class="favorite-path" v-if="fav.path !== fav.name">{{ fav.path }}</span>
            </div>
            <i
              class="material-icons favorite-remove"
              :title="$t('sidebar.removeFavorite')"
              @click.stop.prevent="removeFavorite(fav.id)"
            >close</i>
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
            <i class="material-icons" :style="{ color: group.color || 'var(--blue)' }">folder</i>
            <span class="group-name">{{ group.name }}</span>
            <span class="category-count">{{ (favoritesStore.favoritesByGroup[group.id] || []).length }}</span>
            <button
              class="section-action-btn"
              :title="$t('sidebar.deleteGroup') || 'Delete Group'"
              @click.stop.prevent="deleteGroup(group.id)"
            >
              <i class="material-icons">close</i>
            </button>
            <i class="material-icons category-arrow" :class="{ expanded: !collapsedGroups[group.id] }">expand_more</i>
          </button>
          <template v-if="!collapsedGroups[group.id]">
            <button
              v-for="fav in (favoritesStore.favoritesByGroup[group.id] || [])"
              :key="fav.id"
              class="action favorite-item category-path-item"
              draggable="true"
              @click="navigateVolume(fav.path)"
              :title="fav.path"
              @dragstart="onFavDragStart($event, fav.id)"
              @dragover.prevent="onFavDragOverItem($event, fav.id)"
              @dragleave="onFavDragLeaveItem"
              @drop="onFavDropOnItem($event, fav.id)"
              @dragend="onFavDragEnd"
            >
              <i class="material-icons favorite-icon favorite-drag-handle">drag_indicator</i>
              <i class="material-icons favorite-icon">folder</i>
              <div class="favorite-info">
                <span class="favorite-name">{{ fav.name }}</span>
                <span class="favorite-path" v-if="fav.path !== fav.name">{{ fav.path }}</span>
              </div>
              <i
                class="material-icons favorite-remove"
                :title="$t('sidebar.removeFavorite')"
                @click.stop.prevent="removeFavorite(fav.id)"
              >close</i>
            </button>
            <div v-if="(favoritesStore.favoritesByGroup[group.id] || []).length === 0" class="section-empty">
              <span>{{ $t('sidebar.noFavoritesInGroup') || 'No favorites in this group' }}</span>
            </div>
          </template>
        </div>
        </template>
      </div>

      <!-- Tags Filter Section -->
      <div class="tags-section">
        <button
          class="tags-header"
          @click="toggleSection('tags')"
        >
          <i class="material-icons">label</i>
          <span>{{ $t("sidebar.tags") }}</span>
          <button
            class="section-action-btn"
            :title="$t('tags.manage')"
            @click.stop.prevent="openTagManager"
          >
            <i class="material-icons">settings</i>
          </button>
          <i class="material-icons section-arrow" :class="{ expanded: !collapsedSections.tags }">expand_more</i>
        </button>
        <template v-if="!collapsedSections.tags">
        <div v-if="tagsStore.sortedTags.length === 0" class="section-empty">
          <i class="material-icons">turned_in_not</i>
          <span>{{ $t("tags.noTags") }}</span>
        </div>
        <button
          v-for="tag in tagsStore.sortedTags"
          :key="tag.id"
          class="action tag-filter-item"
          :class="{ active: tagsStore.activeFilter === tag.id }"
          @click="filterByTag(tag.id)"
        >
          <i class="material-icons tag-filter-dot" :style="{ color: tag.color }">label</i>
          <span class="tag-filter-name">{{ tag.name }}</span>
          <span class="tag-filter-count">{{ tag.paths.length }}</span>
        </button>
        <button
          v-if="tagsStore.activeFilter"
          class="action tag-filter-clear"
          @click="clearTagFilter"
        >
          <i class="material-icons">filter_list_off</i>
          <span>{{ $t("tags.clearFilter") }}</span>
        </button>
        </template>
      </div>

      <!-- Storage Volumes Section (admin only) -->
      <div v-if="user.perm.admin && volumesStore.displayVolumes.length > 0" class="volumes-section">
        <button
          class="volumes-header"
          @click="toggleSection('volumes')"
        >
          <i class="material-icons">storage</i>
          <span>{{ $t("sidebar.storageVolumes") }}</span>
          <i class="material-icons section-arrow" :class="{ expanded: !collapsedSections.volumes }">expand_more</i>
        </button>
        <template v-if="!collapsedSections.volumes">
        <button
          v-for="vol in volumesStore.systemVolumes"
          :key="vol.path"
          class="action volume-item"
          @click="navigateVolume(vol.path)"
        >
          <i class="material-icons" :style="{ color: vol.color }">{{ vol.icon }}</i>
          <div class="volume-info">
            <span class="volume-name">{{ vol.displayName }}</span>
            <div class="volume-bar-wrap">
              <div class="volume-bar">
                <div
                  class="volume-bar-fill"
                  :style="{ width: vol.usedPercentage + '%', background: volumeBarColor(vol.usedPercentage) }"
                ></div>
              </div>
              <span class="volume-usage">{{ vol.usedFormatted }} / {{ vol.totalFormatted }}</span>
            </div>
          </div>
        </button>
        <button
          v-for="vol in volumesStore.otherVolumes"
          :key="vol.path"
          class="action volume-item"
          @click="navigateVolume(vol.path)"
        >
          <i class="material-icons" :style="{ color: vol.color }">{{ vol.icon }}</i>
          <div class="volume-info">
            <span class="volume-name">{{ vol.displayName }}</span>
            <div class="volume-bar-wrap">
              <div class="volume-bar">
                <div
                  class="volume-bar-fill"
                  :style="{ width: vol.usedPercentage + '%', background: volumeBarColor(vol.usedPercentage) }"
                ></div>
              </div>
              <span class="volume-usage">{{ vol.usedFormatted }} / {{ vol.totalFormatted }}</span>
            </div>
          </div>
        </button>
        </template>
      </div>

      <!-- Category Quick Navigation (admin only) -->
      <div v-if="user.perm.admin && categoryGroups.length > 0" class="categories-section">
        <button
          class="categories-header"
          @click="toggleSection('categories')"
        >
          <i class="material-icons">category</i>
          <span>{{ $t("sidebar.directoryCategories") }}</span>
          <i class="material-icons section-arrow" :class="{ expanded: !collapsedSections.categories }">expand_more</i>
        </button>
        <template v-if="!collapsedSections.categories">
        <div v-for="group in categoryGroups" :key="group.id" class="category-group">
          <button
            class="action category-group-header"
            @click="toggleCategory(group.id)"
          >
            <i class="material-icons" :style="{ color: group.color }">{{ group.icon }}</i>
            <span>{{ group.name }}</span>
            <span class="category-count">{{ group.paths.length }}</span>
            <i class="material-icons category-arrow" :class="{ expanded: expandedCategories[group.id] }">expand_more</i>
          </button>
          <div v-if="expandedCategories[group.id]" class="category-paths">
            <button
              v-for="p in group.paths"
              :key="p.path"
              class="action category-path-item"
              @click="navigateVolume(p.path)"
              :title="p.path"
            >
              <i class="material-icons" :class="'risk-' + p.risk">{{ riskIcon(p.risk) }}</i>
              <div class="category-path-info">
                <span class="category-path-name">{{ p.name }}</span>
                <span v-if="p.volumeType && p.volumeType !== 'system'" class="category-path-type">{{ p.volumeType }}</span>
              </div>
            </button>
          </div>
        </div>
        </template>
      </div>

      <div v-if="user.perm.create">
        <button
          @click="showHover('newDir')"
          class="action"
          :aria-label="$t('sidebar.newFolder')"
          :title="$t('sidebar.newFolder')"
        >
          <i class="material-icons">create_new_folder</i>
          <span>{{ $t("sidebar.newFolder") }}</span>
        </button>

        <button
          @click="showHover('newFile')"
          class="action"
          :aria-label="$t('sidebar.newFile')"
          :title="$t('sidebar.newFile')"
        >
          <i class="material-icons">note_add</i>
          <span>{{ $t("sidebar.newFile") }}</span>
        </button>
      </div>

      <div v-if="user.perm.admin">
        <button
          class="action"
          @click="toGlobalSettings"
          :aria-label="$t('sidebar.settings')"
          :title="$t('sidebar.settings')"
        >
          <i class="material-icons">settings_applications</i>
          <span>{{ $t("sidebar.settings") }}</span>
        </button>
      </div>
      <button
        v-if="canLogout"
        @click="logout"
        class="action"
        id="logout"
        :aria-label="$t('sidebar.logout')"
        :title="$t('sidebar.logout')"
      >
        <i class="material-icons">exit_to_app</i>
        <span>{{ $t("sidebar.logout") }}</span>
      </button>
    </template>
    <template v-else>
      <router-link
        v-if="!hideLoginButton"
        class="action"
        to="/login"
        :aria-label="$t('sidebar.login')"
        :title="$t('sidebar.login')"
      >
        <i class="material-icons">exit_to_app</i>
        <span>{{ $t("sidebar.login") }}</span>
      </router-link>

      <router-link
        v-if="signup"
        class="action"
        to="/login"
        :aria-label="$t('sidebar.signup')"
        :title="$t('sidebar.signup')"
      >
        <i class="material-icons">person_add</i>
        <span>{{ $t("sidebar.signup") }}</span>
      </router-link>
    </template>

    <div
      class="credits"
      v-if="isFiles && !disableUsedPercentage"
      style="width: 90%; margin: 2em 2.5em 3em 2.5em"
    >
      <progress-bar :val="usage.usedPercentage" size="small"></progress-bar>
      <br />
      {{ $t("sidebar.diskUsed", { used: usage.used, total: usage.total }) }}
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
        <a @click="help">{{ $t("sidebar.help") }}</a>
      </span>
    </p>
  </nav>
</template>

<script>
import { reactive, ref } from "vue";
import { mapActions, mapState } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useVolumesStore } from "@/stores/volumes";
import { useCategoriesStore } from "@/stores/categories";
import { useFavoritesStore } from "@/stores/favorites";
import { useTagsStore } from "@/stores/tags";

import * as auth from "@/utils/auth";
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

const USAGE_DEFAULT = { used: "0 B", total: "0 B", usedPercentage: 0 };

export default {
  name: "sidebar",
  setup() {
    const usage = reactive(USAGE_DEFAULT);
    const volumesStore = useVolumesStore();
    const categoriesStore = useCategoriesStore();
    const favoritesStore = useFavoritesStore();
    const tagsStore = useTagsStore();
    const expandedCategories = reactive({});
    const collapsedSections = reactive({
      favorites: false,
      tags: false,
      volumes: false,
      categories: false,
    });
    // Load collapsed state from localStorage
    try {
      const saved = localStorage.getItem('nas-file-browser-collapsed-sections');
      if (saved) {
        const parsed = JSON.parse(saved);
        Object.assign(collapsedSections, parsed);
      }
    } catch {}
    const dragFromIndex = ref(-1);
    const dragOverIndex = ref(-1);
    const dragOverPosition = ref('');
    // Group-related state
    const showCreateGroup = ref(false);
    const newGroupName = ref('');
    const collapsedGroups = reactive({});
    const dragOverGroupId = ref('');
    const draggedFavId = ref('');
    const sidebarWidth = ref(parseInt(localStorage.getItem('nas-file-browser-sidebar-width') || '256'));
    // Set CSS variable for main content area adjustment
    document.documentElement.style.setProperty('--sidebar-width', sidebarWidth.value + 'px');
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    return { usage, usageAbortController: new AbortController(), volumesStore, categoriesStore, favoritesStore, tagsStore, expandedCategories, collapsedSections, dragFromIndex, dragOverIndex, dragOverPosition, sidebarWidth, isResizing, startX, startWidth, showCreateGroup, newGroupName, collapsedGroups, dragOverGroupId, draggedFavId };
  },
  components: {
    ProgressBar,
  },
  inject: ["$showError"],
  methods: {
    ...mapActions(useLayoutStore, ["closeHovers", "showHover"]),
    startResize(event) {
      // Support both mouse and touch
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      this.isResizing = true;
      this.startX = clientX;
      this.startWidth = this.sidebarWidth;
      document.addEventListener('mousemove', this.onResize);
      document.addEventListener('mouseup', this.stopResize);
      document.addEventListener('touchmove', this.onResize, { passive: false });
      document.addEventListener('touchend', this.stopResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    onResize(event) {
      if (!this.isResizing) return;
      // Prevent scrolling on touch
      if (event.cancelable) event.preventDefault();
      const clientX = event.touches ? event.touches[0].clientX : event.clientX;
      const diff = clientX - this.startX;
      const newWidth = Math.min(500, Math.max(180, this.startWidth + diff));
      this.sidebarWidth = newWidth;
      document.documentElement.style.setProperty('--sidebar-width', newWidth + 'px');
    },
    stopResize() {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.onResize);
      document.removeEventListener('mouseup', this.stopResize);
      document.removeEventListener('touchmove', this.onResize);
      document.removeEventListener('touchend', this.stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('nas-file-browser-sidebar-width', this.sidebarWidth.toString());
      } catch {}
    },
    resetSidebarWidth() {
      const defaultWidth = 256;
      this.sidebarWidth = defaultWidth;
      document.documentElement.style.setProperty('--sidebar-width', defaultWidth + 'px');
      try {
        localStorage.setItem('nas-file-browser-sidebar-width', defaultWidth.toString());
      } catch {}
    },
    getKnownDirs(volBase) {
      // Return known subdirectories for a volume based on NAS structure
      const dirs = [
        { path: volBase + "/@home", name: "用户主目录" },
        { path: volBase + "/@docker", name: "Docker 数据" },
        { path: volBase + "/@appstore", name: "应用数据" },
        { path: volBase + "/@tmp", name: "临时文件" },
        { path: volBase + "/@upload", name: "上传缓存" },
        { path: volBase + "/@search", name: "搜索索引" },
        { path: volBase + "/@thumbnail", name: "缩略图缓存" },
        { path: volBase + "/Docker", name: "Docker 项目" },
        { path: volBase + "/Download", name: "下载" },
        { path: volBase + "/Movie", name: "电影" },
        { path: volBase + "/Movies", name: "电影" },
        { path: volBase + "/Music", name: "音乐" },
        { path: volBase + "/Photos", name: "照片" },
        { path: volBase + "/Pictures", name: "图片" },
        { path: volBase + "/TV", name: "电视剧" },
        { path: volBase + "/Video", name: "视频" },
        { path: volBase + "/Videos", name: "视频" },
        { path: volBase + "/Documents", name: "文档" },
        { path: volBase + "/Common", name: "公共文件" },
        { path: volBase + "/迅雷下载", name: "迅雷下载" },
      ];

      // Filter to only include directories that likely exist
      // (we can't check existence without an API call, so show all)
      return dirs;
    },
    abortOngoingFetchUsage() {
      this.usageAbortController.abort();
    },
    async fetchUsage() {
      const path = this.$route.path.endsWith("/")
        ? this.$route.path
        : this.$route.path + "/";
      let usageStats = USAGE_DEFAULT;
      if (this.disableUsedPercentage) {
        return Object.assign(this.usage, usageStats);
      }
      try {
        this.abortOngoingFetchUsage();
        this.usageAbortController = new AbortController();
        const usage = await api.usage(path, this.usageAbortController.signal);
        usageStats = {
          used: prettyBytes(usage.used, { binary: true }),
          total: prettyBytes(usage.total, { binary: true }),
          usedPercentage: Math.round((usage.used / usage.total) * 100),
        };
      } finally {
        return Object.assign(this.usage, usageStats);
      }
    },
    volumeBarColor(percent) {
      if (percent >= 90) return "var(--icon-red, #DA4453)";
      if (percent >= 70) return "var(--icon-orange, #F5A623)";
      return "var(--blue, #2196F3)";
    },
    toggleCategory(id) {
      this.expandedCategories[id] = !this.expandedCategories[id];
    },
    toggleSection(id) {
      this.collapsedSections[id] = !this.collapsedSections[id];
      try {
        localStorage.setItem('nas-file-browser-collapsed-sections', JSON.stringify(this.collapsedSections));
      } catch {}
    },
    riskIcon(risk) {
      if (risk === "high") return "warning";
      if (risk === "medium") return "info";
      return "check_circle";
    },
    navigateVolume(path) {
      this.$router.push({ path: "/files" + path + "/" });
      this.closeHovers();
    },
    removeFavorite(id) {
      this.favoritesStore.removeFavorite(id);
    },
    clearAllFavorites() {
      if (this.favoritesStore.sortedFavorites.length === 0) return;
      // Clear all favorites
      this.favoritesStore.favorites = [];
      this.favoritesStore.saveFavorites();
    },
    async createGroup() {
      const name = this.newGroupName.trim();
      if (!name) return;
      await this.favoritesStore.addGroup(name);
      this.newGroupName = '';
      this.showCreateGroup = false;
    },
    async deleteGroup(id) {
      const result = await this.favoritesStore.deleteGroup(id);
      if (result.conflict) {
        this.$showError(new Error('Cannot delete group: it still contains favorites. Move or remove them first.'));
      }
    },
    toggleGroupCollapse(id) {
      this.collapsedGroups[id] = !this.collapsedGroups[id];
    },
    onFavDragStart(event, favId) {
      this.draggedFavId = favId;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', favId);
    },
    onFavDragOverItem(event, favId) {
      event.dataTransfer.dropEffect = 'move';
    },
    onFavDragLeaveItem() {},
    async onFavDropOnItem(event, targetFavId) {
      event.preventDefault();
      this.dragOverGroupId = '';
      // If dropped on a favorite, no action needed for now
    },
    onFavDragOverGroup(event, groupId) {
      event.dataTransfer.dropEffect = 'move';
      this.dragOverGroupId = groupId;
    },
    onFavDragLeaveGroup(event) {
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.dragOverGroupId = '';
      }
    },
    async onFavDropOnGroup(event, groupId) {
      event.preventDefault();
      this.dragOverGroupId = '';
      if (this.draggedFavId) {
        await this.favoritesStore.moveFavoriteToGroup(this.draggedFavId, groupId);
        this.draggedFavId = '';
      }
    },
    onFavDragEnd() {
      this.dragFromIndex = -1;
      this.dragOverIndex = -1;
      this.dragOverPosition = '';
      this.dragOverGroupId = '';
      this.draggedFavId = '';
    },
    openTagManager() {
      this.showHover({ prompt: 'tag-manager' });
    },
    filterByTag(tagId) {
      this.tagsStore.setFilter(tagId);
      this.closeHovers();
    },
    clearTagFilter() {
      this.tagsStore.setFilter(null);
    },
    openSearch() {
      this.$router.push('/search');
      this.closeHovers();
    },
    toRoot() {
      this.$router.push({ path: "/files" });
      this.closeHovers();
    },
    toAccountSettings() {
      this.$router.push({ path: "/settings/profile" });
      this.closeHovers();
    },
    toGlobalSettings() {
      this.$router.push({ path: "/settings/global" });
      this.closeHovers();
    },
    help() {
      this.showHover("help");
    },
    logout: auth.logout,
  },
  computed: {
    ...mapState(useAuthStore, ["user", "isLoggedIn"]),
    ...mapState(useFileStore, ["isFiles", "reload"]),
    ...mapState(useLayoutStore, ["currentPromptName"]),
    active() {
      return this.currentPromptName === "sidebar";
    },
    signup: () => signup,
    hideLoginButton: () => hideLoginButton,
    version: () => version,
    disableExternal: () => disableExternal,
    disableUsedPercentage: () => disableUsedPercentage,
    canLogout: () => !noAuth && (loginPage || logoutPage !== "/login"),
    categoryGroups() {
      const subDirs = this.volumesStore.allSubDirs;
      if (!subDirs.length) return [];

      const groups = {};
      const catOrder = ["personal", "shared", "system", "other"];

      // Initialize groups from categories
      for (const cat of this.categoriesStore.categories) {
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

      // Classify each subdirectory into a category based on its path
      for (const dir of subDirs) {
        const cat = this.categoriesStore.classifyPath(dir.path);
        const risk = this.categoriesStore.getRiskLevel(dir.path);
        if (groups[cat.id]) {
          groups[cat.id].paths.push({
            path: dir.path,
            name: dir.name,
            risk,
            volumeType: '',
          });
        }
      }

      // Sort by predefined order and filter empty groups
      return catOrder
        .filter((id) => groups[id] && groups[id].paths.length > 0)
        .map((id) => groups[id]);
    },
  },
  watch: {
    $route: {
      handler(to) {
        if (to.path.includes("/files")) {
          this.fetchUsage();
        }
      },
      immediate: true,
    },
  },
  mounted() {
    // Load favorites and tags for all users
    this.favoritesStore.loadFavorites();
    this.tagsStore.loadTags();
    // Fetch volumes for admin users
    if (this.user?.perm?.admin) {
      this.volumesStore.fetchVolumes();
      this.categoriesStore.fetchCategories();
    }
  },
  unmounted() {
    this.abortOngoingFetchUsage();
  },
};
</script>
