<template>
  <div v-show="active" @click="closeHovers" class="overlay"></div>
  <nav :class="{ active }" :style="{ width: sidebarWidth + 'px' }">
    <div
      class="sidebar-resize-handle"
      @mousedown="startResize"
      :title="t('sidebar.resizeSidebar')"
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

      <!-- Favorites Section -->
      <div class="favorites-section">
        <button
          class="favorites-header"
          @click="toggleSection('favorites')"
        >
          <i class="material-icons">star</i>
          <span>{{ $t("sidebar.favorites") }}</span>
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
        <div v-if="favoritesStore.sortedFavorites.length === 0" class="section-empty">
          <i class="material-icons">star_border</i>
          <span>{{ $t("sidebar.noFavorites") }}</span>
        </div>
        <button
          v-for="(fav, index) in favoritesStore.sortedFavorites"
          :key="fav.id"
          class="action favorite-item"
          :class="{
            'drag-over-top': dragOverIndex === index && dragFromIndex !== index && dragOverPosition === 'top',
            'drag-over-bottom': dragOverIndex === index && dragFromIndex !== index && dragOverPosition === 'bottom',
            'dragging': dragFromIndex === index,
          }"
          draggable="true"
          @click="navigateVolume(fav.path)"
          :title="fav.path"
          @dragstart="onFavDragStart($event, index)"
          @dragover="onFavDragOver($event, index)"
          @dragleave="onFavDragLeave"
          @drop="onFavDrop($event, index)"
          @dragend="onFavDragEnd"
        >
          <i class="material-icons favorite-icon favorite-drag-handle">drag_indicator</i>
          <i class="material-icons favorite-icon">star</i>
          <span class="favorite-name">{{ fav.name }}</span>
          <i
            class="material-icons favorite-remove"
            :title="$t('sidebar.removeFavorite')"
            @click.stop.prevent="removeFavorite(fav.id)"
          >close</i>
        </button>
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
            >
              <i class="material-icons" :class="'risk-' + p.risk">{{ riskIcon(p.risk) }}</i>
              <span>{{ p.name }}</span>
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
    const sidebarWidth = ref(parseInt(localStorage.getItem('nas-file-browser-sidebar-width') || '256'));
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;
    return { usage, usageAbortController: new AbortController(), volumesStore, categoriesStore, favoritesStore, tagsStore, expandedCategories, collapsedSections, dragFromIndex, dragOverIndex, dragOverPosition, sidebarWidth, isResizing, startX, startWidth };
  },
  components: {
    ProgressBar,
  },
  inject: ["$showError"],
  methods: {
    ...mapActions(useLayoutStore, ["closeHovers", "showHover"]),
    startResize(event) {
      this.isResizing = true;
      this.startX = event.clientX;
      this.startWidth = this.sidebarWidth;
      document.addEventListener('mousemove', this.onResize);
      document.addEventListener('mouseup', this.stopResize);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    onResize(event) {
      if (!this.isResizing) return;
      const diff = event.clientX - this.startX;
      const newWidth = Math.min(500, Math.max(180, this.startWidth + diff));
      this.sidebarWidth = newWidth;
    },
    stopResize() {
      this.isResizing = false;
      document.removeEventListener('mousemove', this.onResize);
      document.removeEventListener('mouseup', this.stopResize);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem('nas-file-browser-sidebar-width', this.sidebarWidth.toString());
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
    openTagManager() {
      this.showHover({ prompt: 'tag-manager' });
    },
    onFavDragStart(event, index) {
      this.dragFromIndex = index;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
      // Add slight delay so the dragging class applies after the drag image is captured
      this.$nextTick(() => {
        event.target.classList.add('dragging');
      });
    },
    onFavDragOver(event, index) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      if (this.dragFromIndex === index) return;

      // Determine if dropping above or below the item
      const rect = event.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      this.dragOverIndex = index;
      this.dragOverPosition = event.clientY < midY ? 'top' : 'bottom';
    },
    onFavDragLeave(event) {
      // Only clear if actually leaving the element (not entering a child)
      if (!event.currentTarget.contains(event.relatedTarget)) {
        this.dragOverIndex = -1;
        this.dragOverPosition = '';
      }
    },
    onFavDrop(event, toIndex) {
      event.preventDefault();
      const fromIndex = this.dragFromIndex;
      if (fromIndex < 0 || fromIndex === toIndex) return;

      // Adjust target index based on drop position
      let targetIndex = toIndex;
      if (this.dragOverPosition === 'bottom') {
        targetIndex = toIndex + 1;
      }
      // If dragging from before the target, adjust for the removal shift
      if (fromIndex < targetIndex) {
        targetIndex--;
      }

      this.favoritesStore.reorderFavorite(fromIndex, targetIndex);
      this.dragFromIndex = -1;
      this.dragOverIndex = -1;
      this.dragOverPosition = '';
    },
    onFavDragEnd() {
      this.dragFromIndex = -1;
      this.dragOverIndex = -1;
      this.dragOverPosition = '';
    },
    filterByTag(tagId) {
      this.tagsStore.setFilter(tagId);
      this.closeHovers();
    },
    clearTagFilter() {
      this.tagsStore.setFilter(null);
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
      const volumes = this.volumesStore.displayVolumes;
      if (!volumes.length) return [];

      const groups = {};
      const catOrder = ["personal", "shared", "system", "other"];

      // Classify top-level directories of each volume
      for (const vol of volumes) {
        // We don't have the subdirectory listing yet, so we use the
        // categories store patterns to build known paths
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
      }

      // Build category paths from volume paths
      // For each volume, add known subdirectory paths based on category patterns
      for (const vol of volumes) {
        const volBase = vol.path;
        const knownDirs = this.getKnownDirs(volBase);
        for (const dir of knownDirs) {
          const cat = this.categoriesStore.classifyPath(dir.path);
          const risk = this.categoriesStore.getRiskLevel(dir.path);
          if (groups[cat.id]) {
            groups[cat.id].paths.push({ ...dir, risk });
          }
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
