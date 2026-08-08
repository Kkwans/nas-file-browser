import { defineStore } from "pinia";
import * as api from "@/api/history";
import type { HistoryEntry } from "@/api/history";

export const useHistoryStore = defineStore("history", {
  state: (): {
    items: HistoryEntry[];
    loading: boolean;
    loaded: boolean;
    error: string;
  } => ({ items: [], loading: false, loaded: false, error: "" }),
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
    resetForUser() {
      this.$reset();
    },
  },
});
