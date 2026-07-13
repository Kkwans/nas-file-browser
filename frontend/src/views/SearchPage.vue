<template>
  <div id="search-page">
    <header-bar showMenu showLogo>
      <div class="search-page-input">
        <button
          class="action"
          type="button"
          @click="goBack"
          aria-label="返回"
          title="返回"
        >
          <i class="material-icons">arrow_back</i>
        </button>
        <input
          type="text"
          ref="inputRef"
          v-model.trim="prompt"
          placeholder="搜索"
          aria-label="搜索"
          @keyup.enter="submit"
          @keyup.escape="goBack"
          autofocus
        />
        <i v-show="ongoing" class="material-icons spin">autorenew</i>
        <span v-show="results.length > 0" class="result-count">{{
          results.length
        }}</span>
      </div>
    </header-bar>

    <div class="search-page-content">
      <template v-if="tagMode">
        <section class="tag-results" aria-labelledby="tag-results-title">
          <div class="tag-results-header">
            <div class="tag-results-heading">
              <i
                class="material-icons"
                :style="{ color: activeTag?.color || 'var(--blue)' }"
                aria-hidden="true"
                >label</i
              >
              <div>
                <span class="tag-results-kicker">全局标签筛选</span>
                <h1 id="tag-results-title">{{ activeTag?.name || "标签" }}</h1>
              </div>
            </div>
            <div class="tag-results-scope" role="group" aria-label="标签筛选范围">
              <button
                type="button"
                :class="{ active: searchScope === 'current' }"
                @click="setTagSearchScope('current')"
              >
                当前目录
              </button>
              <button
                type="button"
                :class="{ active: searchScope === 'global' }"
                @click="setTagSearchScope('global')"
              >
                全局
              </button>
            </div>
            <button
              type="button"
              class="tag-results-back"
              @click.prevent="clearTagMode"
            >
              返回文件
            </button>
          </div>

          <div v-if="tagLoading" class="search-loading">
            <div class="spinner">
              <div class="bounce1"></div>
              <div class="bounce2"></div>
              <div class="bounce3"></div>
            </div>
          </div>
          <div v-else-if="tagResults.length === 0" class="search-empty">
            <i class="material-icons">label_off</i>
            <p>这个标签暂时没有可访问的文件或文件夹</p>
          </div>
          <div v-else class="tag-results-list">
            <router-link
              v-for="result in tagResults"
              :key="result.path"
              :to="result.url"
              class="tag-result-item"
            >
              <i class="material-icons" aria-hidden="true">{{
                getFileIcon(result.name, result.dir)
              }}</i>
              <div class="search-result-info">
                <span class="search-result-name">{{ result.name }}</span>
                <span class="search-result-path">{{ result.path }}</span>
              </div>
              <div class="search-result-meta">
                <span v-if="!result.dir" class="search-result-size">
                  {{ formatSize(result.size) }}
                </span>
                <span v-if="result.modified" class="search-result-time">
                  {{ formatTime(result.modified) }}
                </span>
              </div>
            </router-link>
          </div>
        </section>
      </template>

      <template v-else>
        <div class="search-scope-bar" role="group" aria-label="搜索范围">
          <span class="search-scope-label">搜索范围</span>
          <button
            type="button"
            :class="{ active: searchScope === 'current' }"
            @click="setSearchScope('current')"
          >
            当前目录
          </button>
          <button
            type="button"
            :class="{ active: searchScope === 'global' }"
            @click="setSearchScope('global')"
          >
            全局
          </button>
          <span class="search-scope-path">{{ searchScopeText }}</span>
        </div>

        <!-- '类型快捷入口' -->
        <div
          v-if="prompt.length === 0 && results.length === 0"
          class="search-hints"
        >
          <p>输入关键词搜索</p>
          <div class="search-types">
            <div
              tabindex="0"
              v-for="(v, k) in boxes"
              :key="k"
              class="search-type-item"
              role="button"
              @click="initSearch('type:' + k)"
            >
              <i class="material-icons">{{ v.icon }}</i>
              <span>{{ v.label }}</span>
            </div>
          </div>
        </div>

        <!-- '搜索中...' -->
        <div v-else-if="ongoing && results.length === 0" class="search-loading">
          <div class="spinner">
            <div class="bounce1"></div>
            <div class="bounce2"></div>
            <div class="bounce3"></div>
          </div>
        </div>

        <!-- 无结果 -->
        <div
          v-else-if="!ongoing && prompt.length > 0 && results.length === 0"
          class="search-empty"
        >
          <i class="material-icons">search_off</i>
          <p>无搜索结果</p>
        </div>

        <!-- '搜索结果' -->
        <div v-else class="search-results" ref="resultsRef">
          <router-link
            v-for="(item, index) in filteredResults"
            :key="index"
            :to="item.url ?? '#'"
            class="search-result-item"
          >
            <i class="material-icons">{{ fileIcon(item) }}</i>
            <div class="search-result-info">
              <span class="search-result-name">{{ item.name }}</span>
              <span class="search-result-path">{{ item.path }}</span>
            </div>
            <div class="search-result-meta">
              <span v-if="!item.dir" class="search-result-size">{{
                formatSize(item.size)
              }}</span>
              <span v-if="item.modified" class="search-result-time">{{
                formatTime(item.modified)
              }}</span>
            </div>
          </router-link>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import HeaderBar from "@/components/header/HeaderBar.vue";
import type { SearchResult } from "@/types/file";
import { files as filesApi, search } from "@/api";
import { StatusError } from "@/api/utils";
import { useFileStore } from "@/stores/file";
import { useTagsStore, type Tag } from "@/stores/tags";
import { filesize } from "@/utils";
import { getFileIcon } from "@/utils/fileIcons";
import { normalizeSearchBase } from "@/utils/searchPath";
import { buildTaggedPathUrl, getTaggedPathName } from "@/utils/tagResults";
import dayjs from "@/utils/date";
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { throttle } from "lodash-es";
import { useRoute, useRouter } from "vue-router";
const boxes = {
  image: { label: "图片", icon: "insert_photo" },
  audio: { label: "音频", icon: "volume_up" },
  video: { label: "视频", icon: "movie" },
  pdf: { label: "PDF 文档", icon: "picture_as_pdf" },
};
const router = useRouter();
const route = useRoute();
const fileStore = useFileStore();
const tagsStore = useTagsStore();
const $showError = inject<IToastError>("$showError")!;

const prompt = ref<string>("");
const ongoing = ref<boolean>(false);
const results = ref<SearchResult[]>([]);
const resultsCount = ref<number>(100);
const inputRef = ref<HTMLInputElement | null>(null);
const resultsRef = ref<HTMLElement | null>(null);
const tagLoading = ref(false);
const tagResults = ref<
  Array<{
    path: string;
    name: string;
    dir: boolean;
    size: number;
    modified: string;
    url: string;
  }>
>([]);
const tagId = computed(() =>
  typeof route.query.tag === "string" ? route.query.tag : ""
);
const tagMode = computed(() => tagId.value.length > 0);
const activeTag = computed<Tag | null>(
  () => tagsStore.tags.find((tag) => tag.id === tagId.value) ?? null
);
const searchScope = ref<"current" | "global">(
  route.query.scope === "global" ? "global" : "current"
);
const currentBasePath = ref(
  normalizeSearchBase(
    typeof route.query.base === "string"
      ? route.query.base
      : fileStore.req?.path || "/"
  )
);
let searchAbortController = new AbortController();

const filteredResults = computed(() =>
  results.value.slice(0, resultsCount.value)
);

const searchBase = computed(() => {
  if (searchScope.value === "global") return "/";
  return currentBasePath.value;
});

const searchScopeText = computed(() =>
  searchScope.value === "global" ? "全部可访问目录" : searchBase.value
);

const loadTagResults = async () => {
  if (!tagMode.value) return;
  if (!tagsStore.loaded) await tagsStore.loadTags();

  const tag = activeTag.value;
  if (!tag) {
    tagResults.value = [];
    return;
  }

  tagLoading.value = true;
  try {
    const base = normalizeSearchBase(currentBasePath.value).replace(/\/$/, "") || "/";
    const scopedPaths = tag.paths.filter((path) => {
      if (searchScope.value === "global" || base === "/") return true;
      const normalized = normalizeSearchBase(path).replace(/\/$/, "");
      return normalized === base || normalized.startsWith(`${base}/`);
    });
    const results = await Promise.all(
      scopedPaths.map(async (path) => {
        const normalizedPath = normalizeSearchBase(path).replace(/\/$/, "");
        try {
          const resource = await filesApi.fetch(
            "/files" +
              buildTaggedPathUrl(normalizedPath, false).slice("/files".length)
          );
          return {
            path: resource.path,
            name: resource.name || getTaggedPathName(normalizedPath),
            dir: resource.isDir,
            size: resource.size,
            modified: resource.modified,
            url: buildTaggedPathUrl(resource.path, resource.isDir),
          };
        } catch {
          // 权限变化或文件已删除时仍保留一个可读的路径条目，
          // 让用户知道标签记录存在，而不是静默丢失。
          return {
            path: normalizedPath,
            name: getTaggedPathName(normalizedPath),
            dir: false,
            size: 0,
            modified: "",
            url: buildTaggedPathUrl(normalizedPath, false),
          };
        }
      })
    );
    tagResults.value = results;
  } finally {
    tagLoading.value = false;
  }
};

const setTagSearchScope = async (scope: "current" | "global") => {
  searchScope.value = scope;
  await router.replace({
    query: {
      ...route.query,
      scope,
      base: scope === "global" ? "/" : currentBasePath.value,
    },
  });
  await loadTagResults();
};

const clearTagMode = async () => {
  tagsStore.setFilter(null);
  const base =
    typeof route.query.base === "string"
      ? normalizeSearchBase(route.query.base)
      : "/";
  const target = `/files${base === "/" ? "/" : base}`;
  if (route.path === target) return;
  try {
    await router.push({ path: target });
  } catch (error) {
    // Navigation failures should not leave the search page in a dead state.
    // A retry on the same canonical path is safe when a stale transition was
    // cancelled by a previous search request.
    if (route.path !== target) await router.replace({ path: target });
    else if (error) console.warn("清除标签筛选时导航失败", error);
  }
};

onMounted(() => {
  const query = route.query.q;
  if (typeof query === "string") {
    prompt.value = query;
  }
  if (tagMode.value) {
    loadTagResults();
    return;
  }
  inputRef.value?.focus();
  if (prompt.value) nextTick(submit);
});

watch(tagId, () => {
  if (tagMode.value) loadTagResults();
});

// 滚动加载更多：resultsRef 是条件渲染的，需要 watch 等元素挂载后再绑定
let scrollListenerBound = false;
watch(resultsRef, (el, oldEl) => {
  if (oldEl) oldEl.removeEventListener("scroll", onScroll);
  if (el && !scrollListenerBound) {
    el.addEventListener("scroll", onScroll);
    scrollListenerBound = true;
  }
});

onUnmounted(() => {
  searchAbortController.abort();
  resultsRef.value?.removeEventListener("scroll", onScroll);
});

const onScroll = throttle((event: Event) => {
  const el = event.target as HTMLElement;
  if (el.offsetHeight + el.scrollTop >= el.scrollHeight - 100) {
    resultsCount.value += 50;
  }
}, 200);

const goBack = () => {
  router.back();
};

const initSearch = (text: string) => {
  prompt.value = `${text} `;
  nextTick(() => inputRef.value?.focus());
};

const setSearchScope = async (scope: "current" | "global") => {
  if (searchScope.value === scope) return;
  searchScope.value = scope;
  await router.replace({
    path: "/search",
    query: {
      ...(prompt.value ? { q: prompt.value } : {}),
      ...(scope === "current" ? { base: currentBasePath.value } : {}),
      scope,
    },
  });
  if (prompt.value) await submit();
};

const submit = async () => {
  if (prompt.value === "") return;

  await router.replace({
    path: "/search",
    query: {
      q: prompt.value,
      scope: searchScope.value,
      ...(searchScope.value === "current"
        ? { base: currentBasePath.value }
        : {}),
    },
  });

  ongoing.value = true;
  searchAbortController.abort();
  searchAbortController = new AbortController();
  results.value = [];
  resultsCount.value = 100;

  try {
    await search(
      searchBase.value,
      prompt.value,
      searchAbortController.signal,
      (item) => {
        results.value.push(item);
      }
    );
  } catch (error: any) {
    if (error instanceof StatusError && error.is_canceled) return;
    $showError(error);
  }

  ongoing.value = false;
};

const formatSize = (size: number): string => {
  return filesize(size);
};

const formatTime = (time: string): string => {
  return dayjs(time).fromNow();
};

const fileIcon = (item: SearchResult): string => {
  return getFileIcon(item.name, item.dir);
};
</script>

<style scoped>
#search-page {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.search-page-input {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  padding: 0 8px;
}

.search-page-input input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  padding: 8px;
  color: var(--textPrimary);
}

.search-page-input .result-count {
  font-size: 13px;
  color: var(--textSecondary);
  background: var(--surfaceSecondary);
  padding: 2px 8px;
  border-radius: 10px;
}

.search-page-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
}

.search-scope-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  max-width: 72rem;
  margin: 0 auto;
  padding: 0.625rem 0.75rem;
  color: var(--textSecondary, #64748b);
  background: var(--surfaceSecondary, #f8fafc);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.75rem;
}

.search-scope-label {
  margin-right: 0.25rem;
  font-size: 0.8125rem;
  font-weight: 650;
}

.search-scope-bar button {
  min-height: 2.5rem;
  padding: 0.375rem 0.875rem;
  color: var(--textSecondary, #475569);
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.8125rem;
}

.search-scope-bar button:hover,
.search-scope-bar button.active {
  color: var(--blue, #1677ff);
  background: rgba(22, 119, 255, 0.1);
  border-color: rgba(22, 119, 255, 0.24);
}

.search-scope-path {
  min-width: 0;
  margin-left: auto;
  overflow: hidden;
  color: var(--textSecondary, #64748b);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-hints {
  text-align: center;
  padding-top: 40px;
  color: var(--textSecondary);
}

.search-types {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  flex-wrap: wrap;
}

.search-type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 24px;
  border-radius: 12px;
  background: var(--surfaceSecondary);
  cursor: pointer;
  transition:
    background 0.2s,
    transform 0.1s;
  color: var(--textPrimary);
}

.search-type-item:hover {
  background: var(--hover);
  transform: translateY(-2px);
}

.search-type-item:active {
  transform: translateY(0);
}

.search-type-item i {
  font-size: 28px;
  color: var(--blue);
}

.search-loading {
  display: flex;
  justify-content: center;
  padding-top: 80px;
}

.search-empty {
  text-align: center;
  padding-top: 80px;
  color: var(--textSecondary);
}

.search-empty i {
  font-size: 48px;
  opacity: 0.4;
}

.search-results {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-radius: 8px;
  text-decoration: none;
  color: var(--textPrimary);
  transition: background 0.15s;
}

.search-result-item:hover {
  background: var(--hover);
}

.search-result-item i {
  color: var(--textSecondary);
  font-size: 20px;
}

.search-result-item i:first-child {
  color: var(--blue);
}

.search-result-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.search-result-name {
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-path {
  font-size: 12px;
  color: var(--textSecondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
  flex-shrink: 0;
}

.search-result-size,
.search-result-time {
  font-size: 12px;
  color: var(--textSecondary);
  white-space: nowrap;
}

.tag-results {
  width: min(72rem, 100%);
  margin: 0 auto;
}

.tag-results-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.875rem;
}

.tag-results-heading {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0.75rem;
}

.tag-results-heading > .material-icons {
  flex: 0 0 auto;
  font-size: 1.75rem;
}

.tag-results-kicker {
  display: block;
  color: var(--textSecondary, #64748b);
  font-size: 0.75rem;
}

.tag-results-heading h1 {
  margin: 0.15rem 0 0;
  overflow: hidden;
  color: var(--textPrimary, #1e293b);
  font-size: 1.125rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-results-scope {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.625rem;
  background: var(--surfaceSecondary, #f8fafc);
}

.tag-results-scope button {
  min-height: 2rem;
  padding: 0 0.7rem;
  border: 0;
  border-radius: 0.4rem;
  color: var(--textSecondary, #64748b);
  background: transparent;
  cursor: pointer;
}

.tag-results-scope button:hover,
.tag-results-scope button:focus-visible,
.tag-results-scope button.active {
  color: var(--blue, #1677ff);
  background: var(--surfacePrimary, #fff);
  box-shadow: 0 1px 3px rgb(15 23 42 / 10%);
}

.tag-results-back {
  min-height: 2.75rem;
  flex: 0 0 auto;
  padding: 0 0.875rem;
  color: var(--textSecondary, #475569);
  background: transparent;
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.5rem;
  cursor: pointer;
}

.tag-results-back:hover,
.tag-results-back:focus-visible {
  color: var(--blue, #1677ff);
  border-color: var(--blue, #1677ff);
}

.tag-results-list {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.875rem;
}

.tag-result-item {
  display: flex;
  align-items: center;
  min-height: 3.5rem;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  color: var(--textPrimary, #1e293b);
  border-radius: 0.5rem;
  text-decoration: none;
}

.tag-result-item:hover,
.tag-result-item:focus-visible {
  background: var(--hover, #f4f7fb);
}

.tag-result-item > .material-icons {
  flex: 0 0 auto;
  color: var(--blue, #1677ff);
  font-size: 1.75rem;
}

@media (max-width: 736px) {
  .search-page-content {
    padding: 12px 16px;
  }

  .search-result-item {
    padding: 8px 12px;
  }

  .search-scope-bar {
    align-items: stretch;
    gap: 0.375rem;
  }

  .search-scope-label {
    flex: 0 0 100%;
  }

  .search-scope-bar button {
    flex: 1;
  }

  .search-scope-path {
    flex: 0 0 100%;
    margin-left: 0;
  }

  .search-result-meta {
    flex-direction: column;
    gap: 2px;
    align-items: flex-end;
  }

  .search-types {
    gap: 12px;
  }

  .search-type-item {
    padding: 12px 16px;
  }

  .tag-results-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .tag-results-scope {
    width: 100%;
  }

  .tag-results-scope button {
    flex: 1;
  }

  .tag-results-back {
    width: 100%;
  }
}
</style>
