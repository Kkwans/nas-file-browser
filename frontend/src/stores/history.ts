import { defineStore } from "pinia";
import * as api from "@/api/history";
import type { HistoryEntry, HistoryListFilter } from "@/api/history";

export const useHistoryStore = defineStore("history", {
  state: (): {
    items: HistoryEntry[];
    loading: boolean;
    loaded: boolean;
    error: string;
    total: number;
    nextCursor: string;
    currentFilter: HistoryListFilter;
  } => ({
    items: [],
    loading: false,
    loaded: false,
    error: "",
    total: 0,
    nextCursor: "",
    currentFilter: {},
  }),
  actions: {
    async load(filter: HistoryListFilter = {}) {
      this.loading = true;
      this.error = "";
      try {
        const response = await api.list(filter);
        this.items = response.items;
        this.total = response.total;
        this.nextCursor = response.nextCursor ?? "";
        this.currentFilter = { ...filter };
        this.loaded = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    async loadMore() {
      if (!this.nextCursor || this.loading) return;
      this.loading = true;
      this.error = "";
      try {
        const response = await api.list({
          ...this.currentFilter,
          cursor: this.nextCursor,
        });
        const known = new Set(this.items.map((item) => item.id));
        this.items.push(
          ...response.items.filter((item) => !known.has(item.id))
        );
        this.total = response.total;
        this.nextCursor = response.nextCursor ?? "";
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
    resetForUser() {
      this.$reset();
    },
  },
});
