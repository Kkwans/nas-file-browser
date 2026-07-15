<template>
  <div id="search-page">
    <header-bar show-menu show-logo>
      <form v-if="!tagMode" class="search-page-input" @submit.prevent="submit">
        <input
          ref="inputRef"
          v-model.trim="prompt"
          type="search"
          placeholder="搜索文件"
          aria-label="搜索文件"
          autofocus
          @keyup.escape="clearSearch"
        />
        <div class="search-page-actions">
          <button
            v-if="prompt"
            type="button"
            title="清空搜索内容"
            aria-label="清空搜索内容"
            @click="clearSearch"
          >
            <i class="material-icons" aria-hidden="true">close</i>
          </button>
          <button
            type="submit"
            title="开始搜索"
            aria-label="开始搜索"
            :disabled="!prompt"
          >
            <i
              class="material-icons"
              :class="{ spin: ongoing }"
              aria-hidden="true"
            >
              {{ ongoing ? "autorenew" : "search" }}
            </i>
          </button>
        </div>
        <span v-if="results.length" class="search-result-count"
          >{{ results.length }} 项</span
        >
      </form>
    </header-bar>

    <main class="search-page-content">
      <result-explorer
        v-if="tagMode"
        kind="tag"
        :scope="searchScope"
        :title="activeTag?.name || '标签'"
        :results="tagResults"
        :loading="tagLoading"
        :base-path="currentBasePath"
        :return-route="returnFileRoute"
        :icon-color="activeTag?.color"
        @scope-change="setTagSearchScope"
        @return="prepareTagExit"
        @action="handleResultAction"
      />

      <template v-else>
        <div v-if="!prompt && results.length === 0" class="search-shortcuts">
          <span>按文件类型快速搜索</span>
          <button
            v-for="(item, type) in searchTypes"
            :key="type"
            type="button"
            @click="initSearch(`type:${type}`)"
          >
            <i class="material-icons" aria-hidden="true">{{ item.icon }}</i>
            {{ item.label }}
          </button>
        </div>
        <result-explorer
          kind="search"
          :scope="searchScope"
          :title="prompt || '搜索文件'"
          :results="searchResults"
          :loading="ongoing"
          :base-path="searchBase"
          :return-route="returnFileRoute"
          @scope-change="setSearchScope"
          @action="handleResultAction"
        />
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter } from "vue-router";
import HeaderBar from "@/components/header/HeaderBar.vue";
import ResultExplorer, {
  type ExplorerResult,
  type ExplorerResultAction,
} from "@/components/search/ResultExplorer.vue";
import type { SearchResult } from "@/types/file";
import { files as filesApi, search } from "@/api";
import { StatusError } from "@/api/utils";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { type Tag, useTagsStore } from "@/stores/tags";
import {
  buildFilesRouteFromSearchBase,
  buildTagSearchQuery,
  getSearchPromptFromRoute,
  normalizeSearchBase,
} from "@/utils/searchPath";
import {
  buildResultParentRoute,
  buildTaggedPathUrl,
  getTaggedPathName,
} from "@/utils/tagResults";

const searchTypes = {
  image: { label: "图片", icon: "insert_photo" },
  audio: { label: "音频", icon: "volume_up" },
  video: { label: "视频", icon: "movie" },
  pdf: { label: "PDF 文档", icon: "picture_as_pdf" },
};

const router = useRouter();
const route = useRoute();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const tagsStore = useTagsStore();
const $showError = inject<IToastError>("$showError")!;

const prompt = ref("");
const ongoing = ref(false);
const results = ref<SearchResult[]>([]);
const inputRef = ref<HTMLInputElement | null>(null);
const tagLoading = ref(false);
const tagResults = ref<ExplorerResult[]>([]);
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
let tagLoadGeneration = 0;
let tagLoadAbortController = new AbortController();

const searchBase = computed(() =>
  searchScope.value === "global" ? "/" : currentBasePath.value
);
const returnFileRoute = computed(() =>
  buildFilesRouteFromSearchBase(
    typeof route.query.base === "string"
      ? route.query.base
      : currentBasePath.value
  )
);
const searchResults = computed<ExplorerResult[]>(() =>
  results.value.map((item) => ({
    ...item,
    url: item.url ?? buildTaggedPathUrl(item.path, item.dir),
  }))
);

async function loadTagResults() {
  if (!tagMode.value) return;
  if (!tagsStore.loaded) await tagsStore.loadTags();
  const tag = activeTag.value;
  if (!tag) {
    tagResults.value = [];
    return;
  }

  const generation = ++tagLoadGeneration;
  tagLoadAbortController.abort();
  tagLoadAbortController = new AbortController();
  const signal = tagLoadAbortController.signal;
  tagLoading.value = true;
  try {
    const base =
      normalizeSearchBase(currentBasePath.value).replace(/\/$/, "") || "/";
    const paths = tag.paths.filter((path) => {
      if (searchScope.value === "global" || base === "/") return true;
      const normalized = normalizeSearchBase(path).replace(/\/$/, "");
      return normalized === base || normalized.startsWith(`${base}/`);
    });
    const loaded = await Promise.all(
      paths.map(async (path): Promise<ExplorerResult> => {
        const normalizedPath = normalizeSearchBase(path).replace(/\/$/, "");
        try {
          const resource = await filesApi.fetch(
            buildTaggedPathUrl(normalizedPath, false),
            signal
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
    if (generation === tagLoadGeneration) tagResults.value = loaded;
  } finally {
    if (generation === tagLoadGeneration) tagLoading.value = false;
  }
}

async function setTagSearchScope(scope: "current" | "global") {
  if (searchScope.value === scope) return;
  searchScope.value = scope;
  await router.replace({
    query: {
      ...route.query,
      ...buildTagSearchQuery(currentBasePath.value, scope),
    },
  });
  await loadTagResults();
}

async function setSearchScope(scope: "current" | "global") {
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
}

function prepareTagExit() {
  tagsStore.setFilter(null);
  tagLoadGeneration++;
  tagLoadAbortController.abort();
}

function clearSearch() {
  searchAbortController.abort();
  ongoing.value = false;
  prompt.value = "";
  results.value = [];
  nextTick(() => inputRef.value?.focus());
}

function initSearch(text: string) {
  prompt.value = `${text} `;
  nextTick(() => inputRef.value?.focus());
}

async function submit() {
  if (!prompt.value) return;
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
  const controller = new AbortController();
  searchAbortController = controller;
  results.value = [];
  try {
    await search(searchBase.value, prompt.value, controller.signal, (item) =>
      results.value.push(item)
    );
  } catch (error: any) {
    if (!(error instanceof StatusError && error.is_canceled)) $showError(error);
  } finally {
    if (searchAbortController === controller) ongoing.value = false;
  }
}

function refreshActiveResults() {
  if (tagMode.value) loadTagResults();
  else if (prompt.value) submit();
}

async function handleResultAction(
  action: ExplorerResultAction,
  result: ExplorerResult
) {
  if (action === "open-location") {
    prepareTagExit();
    fileStore.preselect = result.path;
    await router.push(buildResultParentRoute(result.path));
    return;
  }
  if (action === "download") {
    filesApi.download(null, result.url);
    return;
  }
  layoutStore.showHover({
    prompt: "result-action",
    props: { mode: action, result },
    action: refreshActiveResults,
  });
}

onMounted(() => {
  prompt.value = getSearchPromptFromRoute(route.query.q, route.query.tag);
  if (tagMode.value) loadTagResults();
  else {
    inputRef.value?.focus();
    if (prompt.value) nextTick(submit);
  }
});

watch(tagId, () => {
  searchAbortController.abort();
  ongoing.value = false;
  results.value = [];
  prompt.value = getSearchPromptFromRoute(route.query.q, route.query.tag);
  if (tagMode.value) loadTagResults();
});

onUnmounted(() => {
  searchAbortController.abort();
  tagLoadGeneration++;
  tagLoadAbortController.abort();
});
</script>

<style scoped>
#search-page {
  display: flex;
  height: 100%;
  flex-direction: column;
}

.search-page-input {
  position: relative;
  display: flex;
  align-items: center;
  width: min(46rem, 100%);
  height: 2.5rem;
  margin: 0 auto;
  padding: 0 0.3125rem 0 0.875rem;
  background: var(--surfaceSecondary, #f6f8fb);
  border: 1px solid var(--borderPrimary, #dbe2ea);
  border-radius: 0.625rem;
}

.search-page-input:focus-within {
  background: var(--surfacePrimary, #fff);
  border-color: rgba(22, 119, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.12);
}

.search-page-input input {
  min-width: 0;
  height: 100%;
  flex: 1;
  padding: 0;
  color: var(--textPrimary, #1e293b);
  background: transparent;
  border: 0;
  outline: 0;
  font: inherit;
  text-align: center;
}

.search-page-input input:focus,
.search-page-input input:not(:placeholder-shown) {
  text-align: left;
}

.search-page-actions {
  display: inline-flex;
  gap: 0.125rem;
}

.search-page-actions button {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  padding: 0;
  color: var(--textSecondary, #64748b);
  background: transparent;
  border: 0;
  border-radius: 0.5rem;
  cursor: pointer;
}

.search-page-actions button:last-child {
  color: var(--blue, #1677ff);
}

.search-page-actions button:hover:not(:disabled) {
  background: rgba(22, 119, 255, 0.08);
}

.search-page-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.search-page-actions .material-icons {
  font-size: 1.125rem;
}

.search-result-count {
  position: absolute;
  left: calc(100% + 0.75rem);
  padding: 0.25rem 0.625rem;
  color: var(--textSecondary, #64748b);
  background: var(--surfaceSecondary, #f1f5f9);
  border-radius: 999px;
  font-size: 0.75rem;
  white-space: nowrap;
}

.search-page-content {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.search-shortcuts {
  display: flex;
  align-items: center;
  width: min(76rem, 100%);
  gap: 0.5rem;
  margin: 0 auto 1rem;
  color: var(--textSecondary, #64748b);
  font-size: 0.8125rem;
}

.search-shortcuts button {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  gap: 0.25rem;
  padding: 0 0.625rem;
  color: var(--textSecondary, #475569);
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.5rem;
  cursor: pointer;
}

.search-shortcuts button:hover {
  color: var(--blue, #1677ff);
  border-color: rgba(22, 119, 255, 0.35);
}

.search-shortcuts .material-icons {
  font-size: 1rem;
}

@media (max-width: 736px) {
  .search-page-content {
    padding: 0.75rem;
  }

  .search-result-count {
    display: none;
  }

  .search-shortcuts {
    overflow-x: auto;
  }

  .search-shortcuts > span {
    display: none;
  }

  .search-shortcuts button {
    flex: 0 0 auto;
  }
}
</style>
