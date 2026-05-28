import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface FavoriteGroup {
  id: string;
  name: string;
  order: number;
  color?: string;
}

export interface Favorite {
  id: string;
  path: string;
  name: string;
  groupId?: string;
  addedAt: number;
  order: number;
}

const STORAGE_KEY = "nas-file-browser-favorites";
const GROUPS_STORAGE_KEY = "nas-file-browser-favorite-groups";
const API_BASE = "/api/favorites";
const GROUPS_API_BASE = "/api/favorites/groups";

export const useFavoritesStore = defineStore("favorites", () => {
  const favorites = ref<Favorite[]>([]);
  const groups = ref<FavoriteGroup[]>([]);
  const loaded = ref(false);

  // --- API helpers ---

  async function apiGet(): Promise<Favorite[] | null> {
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }

  async function apiCreate(fav: Favorite): Promise<boolean> {
    try {
      const res = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fav),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function apiUpdate(
    id: string,
    fav: Partial<Favorite>
  ): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fav),
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

  async function apiReorder(orderedIds: string[]): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderedIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- Groups API helpers ---

  async function apiGetGroups(): Promise<FavoriteGroup[] | null> {
    try {
      const res = await fetch(GROUPS_API_BASE);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }

  async function apiCreateGroup(
    group: Partial<FavoriteGroup>
  ): Promise<FavoriteGroup | null> {
    try {
      const res = await fetch(GROUPS_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function apiUpdateGroup(
    id: string,
    group: Partial<FavoriteGroup>
  ): Promise<boolean> {
    try {
      const res = await fetch(`${GROUPS_API_BASE}/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(group),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function apiDeleteGroup(
    id: string
  ): Promise<{ ok: boolean; conflict?: boolean }> {
    try {
      const res = await fetch(`${GROUPS_API_BASE}/${id}`, { method: "DELETE" });
      if (res.status === 409) return { ok: false, conflict: true };
      return { ok: res.ok };
    } catch {
      return { ok: false };
    }
  }

  async function apiReorderGroups(orderedIds: string[]): Promise<boolean> {
    try {
      const res = await fetch(`${GROUPS_API_BASE}/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderedIds }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  // --- localStorage helpers ---

  function saveToLocalStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value));
    } catch {}
  }

  function saveGroupsToLocalStorage() {
    try {
      localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups.value));
    } catch {}
  }

  function loadFromLocalStorage(): Favorite[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  function loadGroupsFromLocalStorage(): FavoriteGroup[] {
    try {
      const saved = localStorage.getItem(GROUPS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  // --- Public methods ---

  async function loadFavorites() {
    // Load groups
    const apiGroups = await apiGetGroups();
    if (apiGroups) {
      groups.value = apiGroups;
      saveGroupsToLocalStorage();
    } else {
      groups.value = loadGroupsFromLocalStorage();
    }

    // Load favorites
    const apiData = await apiGet();
    if (apiData) {
      favorites.value = apiData;
      saveToLocalStorage();
    } else {
      favorites.value = loadFromLocalStorage();
    }
    loaded.value = true;
  }

  function saveFavorites() {
    saveToLocalStorage();
  }

  async function addFavorite(path: string, name: string, groupId?: string) {
    const cleaned = path.replace(/\/+$/, "");
    if (favorites.value.some((f) => f.path === cleaned)) return;

    const newFav: Favorite = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      path: cleaned,
      name,
      groupId: groupId || "",
      addedAt: Date.now(),
      order: favorites.value.length,
    };
    favorites.value.push(newFav);
    saveToLocalStorage();
    await apiCreate(newFav);
  }

  async function removeFavorite(id: string) {
    favorites.value = favorites.value.filter((f) => f.id !== id);
    favorites.value.forEach((f, i) => (f.order = i));
    saveToLocalStorage();
    await apiDelete(id);
  }

  async function removeByPath(path: string) {
    const cleaned = path.replace(/\/+$/, "");
    const target = favorites.value.find((f) => f.path === cleaned);
    favorites.value = favorites.value.filter((f) => f.path !== cleaned);
    favorites.value.forEach((f, i) => (f.order = i));
    saveToLocalStorage();
    if (target) await apiDelete(target.id);
  }

  function isFavorite(path: string): boolean {
    const cleaned = path.replace(/\/+$/, "");
    return favorites.value.some((f) => f.path === cleaned);
  }

  async function toggleFavorite(path: string, name: string, groupId?: string) {
    const cleaned = path.replace(/\/+$/, "");
    const existing = favorites.value.find((f) => f.path === cleaned);
    if (existing) {
      await removeFavorite(existing.id);
    } else {
      await addFavorite(cleaned, name, groupId);
    }
  }

  async function moveFavoriteToGroup(favId: string, groupId: string) {
    const fav = favorites.value.find((f) => f.id === favId);
    if (!fav) return;
    fav.groupId = groupId;
    saveToLocalStorage();
    await apiUpdate(favId, { groupId });
  }

  async function reorderFavorite(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= favorites.value.length ||
      toIndex < 0 ||
      toIndex >= favorites.value.length
    )
      return;

    const [item] = favorites.value.splice(fromIndex, 1);
    favorites.value.splice(toIndex, 0, item);
    favorites.value.forEach((f, i) => (f.order = i));
    saveToLocalStorage();
    await apiReorder(favorites.value.map((f) => f.id));
  }

  async function syncFavorites() {
    const apiData = await apiGet();
    if (apiData) {
      const apiPaths = new Set(apiData.map((f) => f.path));
      const localOnly = favorites.value.filter((f) => !apiPaths.has(f.path));
      for (const fav of localOnly) {
        await apiCreate(fav);
      }
      const merged = await apiGet();
      if (merged) {
        favorites.value = merged;
        saveToLocalStorage();
      }
    }
  }

  // --- Group methods ---

  async function addGroup(name: string, color?: string) {
    const newGroup: Partial<FavoriteGroup> = { name, color: color || "" };
    const created = await apiCreateGroup(newGroup);
    if (created) {
      groups.value.push(created);
      saveGroupsToLocalStorage();
      return created;
    }
    // Fallback: create locally
    const localGroup: FavoriteGroup = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      order: groups.value.length,
      color: color || "",
    };
    groups.value.push(localGroup);
    saveGroupsToLocalStorage();
    return localGroup;
  }

  async function updateGroup(id: string, updates: Partial<FavoriteGroup>) {
    const group = groups.value.find((g) => g.id === id);
    if (!group) return;
    if (updates.name !== undefined) group.name = updates.name;
    if (updates.color !== undefined) group.color = updates.color;
    saveGroupsToLocalStorage();
    await apiUpdateGroup(id, updates);
  }

  async function deleteGroup(
    id: string
  ): Promise<{ ok: boolean; conflict?: boolean }> {
    const result = await apiDeleteGroup(id);
    if (result.ok) {
      groups.value = groups.value.filter((g) => g.id !== id);
      // Move favorites from deleted group to ungrouped
      favorites.value.forEach((f) => {
        if (f.groupId === id) f.groupId = "";
      });
      saveGroupsToLocalStorage();
      saveToLocalStorage();
    }
    return result;
  }

  async function reorderGroups(fromIndex: number, toIndex: number) {
    if (
      fromIndex < 0 ||
      fromIndex >= groups.value.length ||
      toIndex < 0 ||
      toIndex >= groups.value.length
    )
      return;

    const [item] = groups.value.splice(fromIndex, 1);
    groups.value.splice(toIndex, 0, item);
    groups.value.forEach((g, i) => (g.order = i));
    saveGroupsToLocalStorage();
    await apiReorderGroups(groups.value.map((g) => g.id));
  }

  // Sorted favorites
  const sortedFavorites = computed(() =>
    [...favorites.value].sort((a, b) => a.order - b.order)
  );

  // Sorted groups
  const sortedGroups = computed(() =>
    [...groups.value].sort((a, b) => a.order - b.order)
  );

  // Favorites grouped by group
  const favoritesByGroup = computed(() => {
    const result: Record<string, Favorite[]> = {};
    result[""] = []; // ungrouped
    for (const g of groups.value) {
      result[g.id] = [];
    }
    for (const fav of sortedFavorites.value) {
      const gid = fav.groupId || "";
      if (!result[gid]) result[gid] = [];
      result[gid].push(fav);
    }
    return result;
  });

  return {
    favorites,
    groups,
    sortedFavorites,
    sortedGroups,
    favoritesByGroup,
    loaded,
    loadFavorites,
    saveFavorites,
    addFavorite,
    removeFavorite,
    removeByPath,
    isFavorite,
    toggleFavorite,
    moveFavoriteToGroup,
    reorderFavorite,
    syncFavorites,
    addGroup,
    updateGroup,
    deleteGroup,
    reorderGroups,
  };
});
