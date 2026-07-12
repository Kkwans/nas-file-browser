import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { replaceTagByName } from "@/utils/tagPersistence";

export interface Tag {
  id: string;
  name: string;
  color: string;
  paths: string[];
  createdAt: number;
}

const STORAGE_KEY = "nas-file-browser-tags";
const API_BASE = "/api/tags";

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
  const tags = ref<Tag[]>([]);
  const loaded = ref(false);
  const activeFilter = ref<string | null>(null); // tag id for filtering

  // --- API helpers ---

  async function apiGet(): Promise<Tag[] | null> {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }

  async function apiCreate(tag: Tag): Promise<Tag | null> {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tag),
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  async function apiUpdate(
    id: string,
    updates: Partial<Tag>
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function apiDelete(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function apiAddPath(tagId: string, path: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${tagId}/paths`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function apiRemovePath(tagId: string, path: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${tagId}/paths`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- localStorage helpers ---

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tags.value));
    } catch {
      // localStorage full or unavailable
    }
  }

  function loadFromLocalStorage(): Tag[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  // --- Public methods ---

  // Load tags: API first, fallback to localStorage
  async function loadTags() {
    const apiData = await apiGet();
    if (apiData) {
      tags.value = apiData;
      saveToLocalStorage(); // keep localStorage in sync
    } else {
      tags.value = loadFromLocalStorage();
    }
    loaded.value = true;
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
    await apiUpdate(id, updates);
  }

  // Delete a tag
  async function deleteTag(id: string) {
    tags.value = tags.value.filter((t) => t.id !== id);
    if (activeFilter.value === id) activeFilter.value = null;
    saveToLocalStorage();
    await apiDelete(id);
  }

  // Add a path to a tag
  async function addPathToTag(tagId: string, path: string) {
    const tag = tags.value.find((t) => t.id === tagId);
    if (!tag) return;
    const cleaned = path.replace(/\/+$/, "");
    if (!tag.paths.includes(cleaned)) {
      tag.paths.push(cleaned);
      saveToLocalStorage();
      await apiAddPath(tagId, cleaned);
    }
  }

  // Remove a path from a tag
  async function removePathFromTag(tagId: string, path: string) {
    const tag = tags.value.find((t) => t.id === tagId);
    if (!tag) return;
    const cleaned = path.replace(/\/+$/, "");
    tag.paths = tag.paths.filter((p) => p !== cleaned);
    saveToLocalStorage();
    await apiRemovePath(tagId, cleaned);
  }

  // Toggle a path in a tag (add if not present, remove if present)
  async function togglePathInTag(tagId: string, path: string) {
    const tag = tags.value.find((t) => t.id === tagId);
    if (!tag) return;
    const cleaned = path.replace(/\/+$/, "");
    const idx = tag.paths.indexOf(cleaned);
    if (idx >= 0) {
      tag.paths.splice(idx, 1);
      saveToLocalStorage();
      await apiRemovePath(tagId, cleaned);
    } else {
      tag.paths.push(cleaned);
      saveToLocalStorage();
      await apiAddPath(tagId, cleaned);
    }
  }

  // Get all tags for a specific path
  function getTagsForPath(path: string): Tag[] {
    const cleaned = path.replace(/\/+$/, "");
    return tags.value.filter((t) => t.paths.includes(cleaned));
  }

  // Check if a path has any tags
  function hasTags(path: string): boolean {
    const cleaned = path.replace(/\/+$/, "");
    return tags.value.some((t) => t.paths.includes(cleaned));
  }

  // Set active filter tag (null = no filter)
  function setFilter(tagId: string | null) {
    activeFilter.value = activeFilter.value === tagId ? null : tagId;
  }

  // Get filtered paths (based on active filter)
  const filteredPaths = computed(() => {
    if (!activeFilter.value) return null; // null means no filter active
    const tag = tags.value.find((t) => t.id === activeFilter.value);
    return tag ? new Set(tag.paths) : null;
  });

  // Active filter tag object
  const activeFilterTag = computed(() => {
    if (!activeFilter.value) return null;
    return tags.value.find((t) => t.id === activeFilter.value) ?? null;
  });

  // Check if a path matches the current filter
  function matchesFilter(path: string): boolean {
    if (!filteredPaths.value) return true; // no filter = show all
    const cleaned = path.replace(/\/+$/, "");
    return filteredPaths.value.has(cleaned);
  }

  // Sync local data to API (e.g. after recovering from offline)
  async function syncTags() {
    const apiData = await apiGet();
    if (apiData) {
      // API is source of truth; merge any local-only tags
      const apiIds = new Set(apiData.map((t) => t.id));
      const localOnly = tags.value.filter((t) => !apiIds.has(t.id));
      for (const tag of localOnly) {
        await apiCreate(tag);
      }
      // Re-fetch to get merged result
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
    matchesFilter,
    syncTags,
  };
});
