import { defineStore } from "pinia";
import * as api from "@/api/tasks";
import type {
  TaskBatchAction,
  TaskItem,
  TaskListCounts,
  TaskListFilter,
} from "@/api/tasks";

const activeStatuses = new Set<TaskItem["status"]>(["queued", "running"]);

export const useTasksStore = defineStore("tasks", {
  state: (): {
    items: TaskItem[];
    loading: boolean;
    loaded: boolean;
    error: string;
    total: number;
    nextCursor: string;
    owners: string[];
    counts: TaskListCounts;
    currentFilter: TaskListFilter;
  } => ({
    items: [],
    loading: false,
    loaded: false,
    error: "",
    total: 0,
    nextCursor: "",
    owners: [],
    counts: {
      all: 0,
      active: 0,
      attention: 0,
      canceled: 0,
      completed: 0,
      archived: 0,
    },
    currentFilter: {},
  }),
  getters: {
    activeItems: (state) =>
      state.items.filter((item) => activeStatuses.has(item.status)),
  },
  actions: {
    async load(filter: TaskListFilter = {}) {
      this.loading = true;
      this.error = "";
      try {
        const response = await api.list(filter);
        this.items = response.items;
        this.total = response.total;
        this.nextCursor = response.nextCursor ?? "";
        this.owners = response.owners;
        this.counts = response.counts;
        this.currentFilter = { ...filter, statuses: filter.statuses?.slice() };
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
        this.nextCursor = response.nextCursor ?? "";
        this.total = response.total;
        this.owners = response.owners;
        this.counts = response.counts;
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
    async archive(id: string) {
      const item = await api.archive(id);
      this.record(item);
      return item;
    },
    async unarchive(id: string) {
      const item = await api.unarchive(id);
      this.record(item);
      return item;
    },
    async batch(action: TaskBatchAction, expectedCount: number) {
      const result = await api.batch(action, this.currentFilter, expectedCount);
      for (const item of result.created ?? []) this.record(item);
      return result;
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
