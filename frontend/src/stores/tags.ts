import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { fetchURL, StatusError } from "@/api/utils";
import { replaceTagByName } from "@/utils/tagPersistence";
import {
  resolvePersistenceState,
  userStorageKey,
} from "@/utils/favoritePersistence";
import { isDescendantPath, normalizeTagPath } from "@/utils/tagPath";

export interface Tag {
  id: string;
  name: string;
  color: string;
  paths: string[];
  createdAt: number;
}

export type TagFilterMode = "current" | "global";

const STORAGE_KEY = "nas-file-browser-tags";
const API_BASE = "/api/tags";

function normalizeTag(tag: Tag): Tag {
  return {
    ...tag,
    paths: (tag.paths || []).map(normalizeTagPath),
  };
}

// Predefined color palette for tags
export const TAG_COLORS = [
  "#F44336", // Red
  "#E91E63", // Pink
  "#9C27B0", // Purple
  "#673AB7", // Deep Purple
  "#3F51B5", // Indigo
  "#2196F3", // Blue
  "#03A9F4", // Light Blue
  "#00BCD4", // Cyan
  "#009688", // Teal
  "#4CAF50", // Green
  "#8BC34A", // Light Green
  "#CDDC39", // Lime
  "#FFC107", // Amber
  "#FF9800", // Orange
  "#FF5722", // Deep Orange
  "#795548", // Brown
  "#607D8B", // Blue Grey
];

export const useTagsStore = defineStore("tags", () => {
  const authStore = useAuthStore();
  const tags = ref<Tag[]>([]);
  const loaded = ref(false);
  const activeFilter = ref<string | null>(null); // tag id for filtering
  const filterMode = ref<TagFilterMode>("global");

  // --- API helpers ---

  async function apiGet(): Promise<Tag[] | null> {
    try {
      const res = await fetchURL(API_BASE, {});
      const data = (await res.json()) as Tag[];
      return data.map(normalizeTag);
    } catch {
      return null;
    }
  }

  async function apiCreate(tag: Tag): Promise<Tag | null> {
    try {
      const res = await fetchURL(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tag),
      });
      return normalizeTag(await res.json());
    } catch {
      return null;
    }
  }

  async function apiUpdate(
    id: string,
    updates: Partial<Tag>
  ): Promise<{ ok: boolean; status?: number }> {
    try {
      await fetchURL(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        status: error instanceof StatusError ? error.status : undefined,
      };
    }
  }

  async function apiDelete(
    id: string
  ): Promise<{ ok: boolean; status?: number }> {
    try {
      await fetchURL(`${API_BASE}/${id}`, { method: "DELETE" });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        status: error instanceof StatusError ? error.status : undefined,
      };
    }
  }

  async function apiAddPath(
    tagId: string,
    path: string
  ): Promise<{ ok: boolean; status?: number }> {
    try {
      await fetchURL(`${API_BASE}/${tagId}/paths`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        status: error instanceof StatusError ? error.status : undefined,
      };
    }
  }

  async function apiRemovePath(
    tagId: string,
    path: string
  ): Promise<{ ok: boolean; status?: number }> {
    try {
      await fetchURL(`${API_BASE}/${tagId}/paths`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        status: error instanceof StatusError ? error.status : undefined,
      };
    }
  }

  // --- localStorage helpers ---

  function scopedStorageKey(): string {
    return userStorageKey(STORAGE_KEY, authStore.user?.id ?? "anonymous");
  }

  function saveToLocalStorage() {
    try {
      localStorage.setItem(scopedStorageKey(), JSON.stringify(tags.value));
    } catch {
      // localStorage full or unavailable
    }
  }

  function loadFromLocalStorage(): Tag[] {
    try {
      const saved = localStorage.getItem(scopedStorageKey());
      const data = saved ? (JSON.parse(saved) as Tag[]) : [];
      return data.map(normalizeTag);
    } catch {
      return [];
    }
  }

  // --- Public methods ---

  // Load tags: API first, fallback to localStorage
  async function loadTags() {
    const cachedTags = loadFromLocalStorage();
    const apiData = await apiGet();
    const state = resolvePersistenceState(apiData ?? [], cachedTags);
    tags.value = apiData === null ? cachedTags : state.data;
    saveToLocalStorage();
    if (state.shouldSync) await syncTags();
    loaded.value = true;
  }

  /**
   * 旧版本曾把后端真实 ID 和浏览器临时 ID 混在一起，导致更新/删除
   * 返回 404 后界面仍保留错误状态。变更失败时重新同步一次，以服务端
   * 返回的用户记录为准，并让遗留的本地记录重新走创建流程。
   */
  async function refreshAfterMutation() {
    const remote = await apiGet();
    if (remote === null) return;
    if (remote.length === 0 && tags.value.length > 0) {
      await syncTags();
      return;
    }
    tags.value = remote;
    saveToLocalStorage();
  }

  // Save to localStorage (kept for backward compat, prefer API)
  function saveTags() {
    saveToLocalStorage();
  }

  // Create a new tag
  async function createTag(name: string, color: string): Promise<Tag> {
    const tag: Tag = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: name.trim(),
      color,
      paths: [],
      createdAt: Date.now(),
    };
    tags.value.push(tag);
    saveToLocalStorage();
    const savedTag = await apiCreate(tag);
    if (savedTag) {
      tags.value = replaceTagByName(tags.value, savedTag);
      saveToLocalStorage();
      return savedTag;
    }
    await refreshAfterMutation();
    return tag;
  }

  // Update a tag
  async function updateTag(
    id: string,
    updates: Partial<Pick<Tag, "name" | "color">>
  ) {
    const tag = tags.value.find((t) => t.id === id);
    if (!tag) return;
    if (updates.name !== undefined) tag.name = updates.name.trim();
    if (updates.color !== undefined) tag.color = updates.color;
    saveToLocalStorage();
    const result = await apiUpdate(id, updates);
    if (!result.ok && result.status === 404) await refreshAfterMutation();
  }

  // Delete a tag
  async function deleteTag(id: string) {
    tags.value = tags.value.filter((t) => t.id !== id);
    if (activeFilter.value === id) activeFilter.value = null;
    saveToLocalStorage();
    const result = await apiDelete(id);
    if (!result.ok && result.status === 404) await refreshAfterMutation();
  }

  // Add a path to a tag
  async function addPathToTag(tagId: string, path: string) {
    const tag = tags.value.find((t) => t.id === tagId);
    if (!tag) return;
    const cleaned = normalizeTagPath(path);
    if (
      !tag.paths.some((savedPath) => normalizeTagPath(savedPath) === cleaned)
    ) {
      tag.paths.push(cleaned);
      saveToLocalStorage();
      const result = await apiAddPath(tagId, cleaned);
      if (!result.ok && result.status === 404) await refreshAfterMutation();
    }
  }

  // Remove a path from a tag
  async function removePathFromTag(tagId: string, path: string) {
    const tag = tags.value.find((t) => t.id === tagId);
    if (!tag) return;
    const cleaned = normalizeTagPath(path);
    tag.paths = tag.paths.filter(
      (savedPath) => normalizeTagPath(savedPath) !== cleaned
    );
    saveToLocalStorage();
    const result = await apiRemovePath(tagId, cleaned);
    if (!result.ok && result.status === 404) await refreshAfterMutation();
  }

  // Toggle a path in a tag (add if not present, remove if present)
  async function togglePathInTag(tagId: string, path: string) {
    const tag = tags.value.find((t) => t.id === tagId);
    if (!tag) return;
    const cleaned = normalizeTagPath(path);
    const idx = tag.paths.findIndex(
      (savedPath) => normalizeTagPath(savedPath) === cleaned
    );
    if (idx >= 0) {
      tag.paths.splice(idx, 1);
      saveToLocalStorage();
      const result = await apiRemovePath(tagId, cleaned);
      if (!result.ok && result.status === 404) await refreshAfterMutation();
    } else {
      tag.paths.push(cleaned);
      saveToLocalStorage();
      const result = await apiAddPath(tagId, cleaned);
      if (!result.ok && result.status === 404) await refreshAfterMutation();
    }
  }

  // Get all tags for a specific path
  function getTagsForPath(path: string): Tag[] {
    const cleaned = normalizeTagPath(path);
    return tags.value.filter((tag) =>
      tag.paths.some((savedPath) => normalizeTagPath(savedPath) === cleaned)
    );
  }

  // Check if a path has any tags
  function hasTags(path: string): boolean {
    const cleaned = normalizeTagPath(path);
    return tags.value.some((tag) =>
      tag.paths.some((savedPath) => normalizeTagPath(savedPath) === cleaned)
    );
  }

  // Set active filter tag (null = no filter)
  function setFilter(tagId: string | null) {
    activeFilter.value = activeFilter.value === tagId ? null : tagId;
  }

  function setFilterMode(mode: TagFilterMode) {
    filterMode.value = mode;
  }

  // Get filtered paths (based on active filter)
  const filteredPaths = computed(() => {
    if (!activeFilter.value) return null; // null means no filter active
    const tag = tags.value.find((t) => t.id === activeFilter.value);
    return tag ? new Set(tag.paths.map(normalizeTagPath)) : null;
  });

  // Active filter tag object
  const activeFilterTag = computed(() => {
    if (!activeFilter.value) return null;
    return tags.value.find((t) => t.id === activeFilter.value) ?? null;
  });

  // Check if a path matches the current filter
  function matchesFilter(path: string): boolean {
    if (!filteredPaths.value) return true; // no filter = show all
    const cleaned = normalizeTagPath(path);
    if (filterMode.value === "current") {
      return filteredPaths.value.has(cleaned);
    }

    // 全局模式保留标签筛选状态，浏览不同目录时显示标签项及其父目录，
    // 让用户可以沿目录树进入真正被打标的文件/文件夹。
    for (const taggedPath of filteredPaths.value) {
      if (
        taggedPath === cleaned ||
        isDescendantPath(taggedPath, cleaned) ||
        isDescendantPath(cleaned, taggedPath)
      ) {
        return true;
      }
    }
    return false;
  }

  // Sync local data to API (e.g. after recovering from offline)
  async function syncTags() {
    const apiData = await apiGet();
    if (apiData) {
      for (const localTag of [...tags.value]) {
        let remoteTag = apiData.find((tag) => tag.name === localTag.name);
        if (!remoteTag) {
          const created = await apiCreate(localTag);
          if (created) remoteTag = created;
        }
        if (!remoteTag) continue;

        for (const path of localTag.paths) {
          const normalizedPath = normalizeTagPath(path);
          if (
            !remoteTag.paths.some(
              (savedPath) => normalizeTagPath(savedPath) === normalizedPath
            )
          ) {
            await apiAddPath(remoteTag.id, normalizedPath);
          }
        }
      }

      const merged = await apiGet();
      if (merged) {
        tags.value = merged;
        saveToLocalStorage();
      }
    }
  }

  // Tags sorted by name
  const sortedTags = computed(() =>
    [...tags.value].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
  );

  return {
    tags,
    sortedTags,
    loaded,
    activeFilter,
    filterMode,
    activeFilterTag,
    filteredPaths,
    loadTags,
    saveTags,
    createTag,
    updateTag,
    deleteTag,
    addPathToTag,
    removePathFromTag,
    togglePathInTag,
    getTagsForPath,
    hasTags,
    setFilter,
    setFilterMode,
    matchesFilter,
    syncTags,
  };
});
