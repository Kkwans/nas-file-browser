<template>
  <div v-show="active" @click="closeHovers" class="overlay"></div>
  <nav :class="{ active }">
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
      <div v-if="favoritesStore.sortedFavorites.length > 0" class="favorites-section">
        <div class="favorites-header">
          <i class="material-icons">star</i>
          <span>{{ $t("sidebar.favorites", {}, {默认: "收藏夹"}) }}</span>
        </div>
        <button
          v-for="fav in favoritesStore.sortedFavorites"
          :key="fav.id"
          class="action favorite-item"
          @click="navigateVolume(fav.path)"
          :title="fav.path"
        >
          <i class="material-icons favorite-icon">star</i>
          <span class="favorite-name">{{ fav.name }}</span>
          <i
            class="material-icons favorite-remove"
            :title="$t('sidebar.removeFavorite')"
            @click.stop.prevent="removeFavorite(fav.id)"
          >close</i>
        </button>
      </div>

      <!-- Storage Volumes Section (admin only) -->
      <div v-if="user.perm.admin && volumesStore.displayVolumes.length > 0" class="volumes-section">
        <div class="volumes-header">
          <i class="material-icons">storage</i>
          <span>{{ $t("sidebar.storageVolumes", {}, {默认: "存储卷"}) }}</span>
        </div>
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
      </div>

      <!-- Category Quick Navigation (admin only) -->
      <div v-if="user.perm.admin && categoryGroups.length > 0" class="categories-section">
        <div class="categories-header">
          <i class="material-icons">category</i>
          <span>{{ $t("sidebar.directoryCategories", {}, {默认: "目录分类"}) }}</span>
        </div>
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
import { reactive } from "vue";
import { mapActions, mapState } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useVolumesStore } from "@/stores/volumes";
import { useCategoriesStore } from "@/stores/categories";
import { useFavoritesStore } from "@/stores/favorites";

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
    const expandedCategories = reactive({});
    return { usage, usageAbortController: new AbortController(), volumesStore, categoriesStore, favoritesStore, expandedCategories };
  },
  components: {
    ProgressBar,
  },
  inject: ["$showError"],
  methods: {
    ...mapActions(useLayoutStore, ["closeHovers", "showHover"]),
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
    // Load favorites for all users
    this.favoritesStore.loadFavorites();
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
