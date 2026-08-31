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
    requestGeneration: number;
  } => ({
    items: [],
    loading: false,
    loaded: false,
    error: "",
    total: 0,
    nextCursor: "",
    currentFilter: {},
    requestGeneration: 0,
  }),
  actions: {
    record(item: HistoryEntry) {
      this.items = [
        item,
        ...this.items.filter((saved) => saved.id !== item.id),
      ].sort((left, right) => right.createdAt - left.createdAt);
    },
    async load(filter: HistoryListFilter = {}) {
      const generation = ++this.requestGeneration;
      this.loading = true;
      this.error = "";
      try {
        const response = await api.list(filter);
        if (generation !== this.requestGeneration) return;
        this.items = response.items;
        this.total = response.total;
        this.nextCursor = response.nextCursor ?? "";
        this.currentFilter = { ...filter };
        this.loaded = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        if (generation === this.requestGeneration) this.loading = false;
      }
    },
    async loadMore() {
      if (!this.nextCursor || this.loading) return;
      const generation = ++this.requestGeneration;
      this.loading = true;
      this.error = "";
      try {
        const response = await api.list({
          ...this.currentFilter,
          cursor: this.nextCursor,
        });
        if (generation !== this.requestGeneration) return;
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
        if (generation === this.requestGeneration) this.loading = false;
      }
    },
    resetForUser() {
      this.$reset();
    },
  },
});
