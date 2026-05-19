import { defineStore } from "pinia";
import { ref, computed } from "vue";

export interface Favorite {
  id: string;
  path: string;
  name: string;
  addedAt: number;
  order: number;
}

const STORAGE_KEY = "nas-file-browser-favorites";
const API_BASE = "/api/favorites";

export const useFavoritesStore = defineStore("favorites", () => {
  const favorites = ref<Favorite[]>([]);
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

  async function apiUpdate(id: string, fav: Partial<Favorite>): Promise<boolean> {
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
        body: JSON.stringify({ orderedIds }),
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
    } catch {
      // localStorage full or unavailable
    }
  }

  function loadFromLocalStorage(): Favorite[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  // --- Public methods ---

  // Load favorites: API first, fallback to localStorage
  async function loadFavorites() {
    const apiData = await apiGet();
    if (apiData) {
      favorites.value = apiData;
      saveToLocalStorage(); // keep localStorage in sync
    } else {
      favorites.value = loadFromLocalStorage();
    }
    loaded.value = true;
  }

  // Save to localStorage (kept for backward compat, prefer API)
  function saveFavorites() {
    saveToLocalStorage();
  }

  // Add a favorite
  async function addFavorite(path: string, name: string) {
    const cleaned = path.replace(/\/+$/, "");
    // Check duplicate
    if (favorites.value.some((f) => f.path === cleaned)) return;

    const newFav: Favorite = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      path: cleaned,
      name,
      addedAt: Date.now(),
      order: favorites.value.length,
    };
    favorites.value.push(newFav);
    saveToLocalStorage();
    await apiCreate(newFav);
  }

  // Remove a favorite by id
  async function removeFavorite(id: string) {
    favorites.value = favorites.value.filter((f) => f.id !== id);
    // Re-index order
    favorites.value.forEach((f, i) => (f.order = i));
    saveToLocalStorage();
    await apiDelete(id);
  }

  // Remove a favorite by path
  async function removeByPath(path: string) {
    const cleaned = path.replace(/\/+$/, "");
    const target = favorites.value.find((f) => f.path === cleaned);
    favorites.value = favorites.value.filter((f) => f.path !== cleaned);
    favorites.value.forEach((f, i) => (f.order = i));
    saveToLocalStorage();
    if (target) await apiDelete(target.id);
  }

  // Check if a path is favorited
  function isFavorite(path: string): boolean {
    const cleaned = path.replace(/\/+$/, "");
    return favorites.value.some((f) => f.path === cleaned);
  }

  // Toggle favorite
  async function toggleFavorite(path: string, name: string) {
    const cleaned = path.replace(/\/+$/, "");
    const existing = favorites.value.find((f) => f.path === cleaned);
    if (existing) {
      await removeFavorite(existing.id);
    } else {
      await addFavorite(cleaned, name);
    }
  }

  // Reorder (move item from one position to another)
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

  // Sync local data to API (e.g. after recovering from offline)
  async function syncFavorites() {
    const apiData = await apiGet();
    if (apiData) {
      // API is source of truth; merge any local-only items
      const apiPaths = new Set(apiData.map((f) => f.path));
      const localOnly = favorites.value.filter((f) => !apiPaths.has(f.path));
      for (const fav of localOnly) {
        await apiCreate(fav);
      }
      // Re-fetch to get merged result
      const merged = await apiGet();
      if (merged) {
        favorites.value = merged;
        saveToLocalStorage();
      }
    }
  }

  // Sorted favorites
  const sortedFavorites = computed(() =>
    [...favorites.value].sort((a, b) => a.order - b.order)
  );

  return {
    favorites,
    sortedFavorites,
    loaded,
    loadFavorites,
    saveFavorites,
    addFavorite,
    removeFavorite,
    removeByPath,
    isFavorite,
    toggleFavorite,
    reorderFavorite,
    syncFavorites,
  };
});
