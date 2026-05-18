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

export const useFavoritesStore = defineStore("favorites", () => {
  const favorites = ref<Favorite[]>([]);
  const loaded = ref(false);

  // Load from localStorage
  function loadFavorites() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        favorites.value = JSON.parse(saved);
      }
    } catch {
      favorites.value = [];
    }
    loaded.value = true;
  }

  // Save to localStorage
  function saveFavorites() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites.value));
    } catch {
      // localStorage full or unavailable
    }
  }

  // Add a favorite
  function addFavorite(path: string, name: string) {
    const cleaned = path.replace(/\/+$/, "");
    // Check duplicate
    if (favorites.value.some((f) => f.path === cleaned)) return;

    favorites.value.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      path: cleaned,
      name,
      addedAt: Date.now(),
      order: favorites.value.length,
    });
    saveFavorites();
  }

  // Remove a favorite by id
  function removeFavorite(id: string) {
    favorites.value = favorites.value.filter((f) => f.id !== id);
    // Re-index order
    favorites.value.forEach((f, i) => (f.order = i));
    saveFavorites();
  }

  // Remove a favorite by path
  function removeByPath(path: string) {
    const cleaned = path.replace(/\/+$/, "");
    favorites.value = favorites.value.filter((f) => f.path !== cleaned);
    favorites.value.forEach((f, i) => (f.order = i));
    saveFavorites();
  }

  // Check if a path is favorited
  function isFavorite(path: string): boolean {
    const cleaned = path.replace(/\/+$/, "");
    return favorites.value.some((f) => f.path === cleaned);
  }

  // Toggle favorite
  function toggleFavorite(path: string, name: string) {
    const cleaned = path.replace(/\/+$/, "");
    const existing = favorites.value.find((f) => f.path === cleaned);
    if (existing) {
      removeFavorite(existing.id);
    } else {
      addFavorite(cleaned, name);
    }
  }

  // Reorder (move item from one position to another)
  function reorderFavorite(fromIndex: number, toIndex: number) {
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
    saveFavorites();
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
  };
});
