import { defineStore } from "pinia";
import * as api from "@/api/tasks";
import type { TaskItem } from "@/api/tasks";

const activeStatuses = new Set<TaskItem["status"]>(["queued", "running"]);

export const useTasksStore = defineStore("tasks", {
  state: (): {
    items: TaskItem[];
    loading: boolean;
    loaded: boolean;
    error: string;
  } => ({ items: [], loading: false, loaded: false, error: "" }),
  getters: {
    activeItems: (state) =>
      state.items.filter((item) => activeStatuses.has(item.status)),
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
    record(item: TaskItem) {
      this.items = [
        item,
        ...this.items.filter((saved) => saved.id !== item.id),
      ].sort((left, right) => right.createdAt - left.createdAt);
    },
    async cancel(id: string) {
      const item = await api.cancel(id);
      this.record(item);
      return item;
    },
    async retry(id: string) {
      const item = await api.retry(id);
      this.record(item);
      return item;
    },
    async waitForTerminal(id: string, interval = 750): Promise<TaskItem> {
      for (;;) {
        const item = await api.get(id);
        this.record(item);
        if (!activeStatuses.has(item.status)) return item;
        await new Promise((resolve) =>
          globalThis.setTimeout(resolve, interval)
        );
      }
    },
    resetForUser() {
      this.$reset();
    },
  },
});
