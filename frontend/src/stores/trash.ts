import { defineStore } from "pinia";
import * as api from "@/api/trash";
import type { TrashConflict, TrashItem, TrashRestoreResult } from "@/api/trash";
import { useFavoritesStore } from "@/stores/favorites";
import { useTagsStore } from "@/stores/tags";

export const useTrashStore = defineStore("trash", {
  state: (): {
    items: TrashItem[];
    loading: boolean;
    error: string;
    loaded: boolean;
  } => ({
    items: [],
    loading: false,
    error: "",
    loaded: false,
  }),
  getters: {
    availableItems: (state) =>
      state.items.filter((item) => item.status === "available"),
  },
  actions: {
    async load() {
      this.loading = true;
      this.error = "";
      try {
        this.items = await api.list();
        this.loaded = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    recordMoved(item: TrashItem) {
      this.items = [
        item,
        ...this.items.filter((saved) => saved.id !== item.id),
      ];
    },
    async restore(
      id: string,
      conflict: TrashConflict = "fail"
    ): Promise<TrashRestoreResult> {
      const result = await api.restore(id, conflict);
      if (!result.skipped) {
        this.items = this.items.filter((item) => item.id !== id);
        await this.reloadMetadata();
      }
      return result;
    },
    async restoreMany(items: readonly Pick<TrashItem, "id">[]) {
      const restored: TrashRestoreResult[] = [];
      let changed = false;
      try {
        for (const item of items) {
          const result = await api.restore(item.id, "fail");
          restored.push(result);
          if (!result.skipped) {
            changed = true;
            this.items = this.items.filter((saved) => saved.id !== item.id);
          }
        }
      } finally {
        if (changed) await this.reloadMetadata();
      }
      return restored;
    },
    async removePermanent(id: string) {
      await api.removePermanent(id);
      this.items = this.items.filter((item) => item.id !== id);
    },
    async clear() {
      await api.clear();
      this.items = [];
    },
    async reloadMetadata() {
      await Promise.allSettled([
        useFavoritesStore().loadFavorites(),
        useTagsStore().loadTags(),
      ]);
    },
    resetForUser() {
      this.$reset();
    },
  },
});
