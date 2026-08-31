import { defineStore } from "pinia";
import * as api from "@/api/transfers";

function upsertPendingEvent(
  events: api.TransferItem[],
  item: api.TransferItem
) {
  const index = events.findIndex((saved) => saved.id === item.id);
  if (index === -1) events.push(item);
  else events[index] = item;
}

export const useTransfersStore = defineStore("transfers", {
  state: (): {
    items: api.TransferItem[];
    loading: boolean;
    loaded: boolean;
    error: string;
    requestGeneration: Record<string, number>;
    loadingKeys: Record<string, boolean>;
    pendingEvents: api.TransferItem[];
    eventRevision: number;
  } => ({
    items: [],
    loading: false,
    loaded: false,
    error: "",
    requestGeneration: {},
    loadingKeys: {},
    pendingEvents: [],
    eventRevision: 0,
  }),
  getters: {
    uploads: (state) => state.items.filter((item) => item.kind === "upload"),
    downloads: (state) =>
      state.items.filter((item) => item.kind === "download"),
    active: (state) =>
      state.items.filter(
        (item) => item.status === "queued" || item.status === "running"
      ),
  },
  actions: {
    async load(kind?: api.TransferKind) {
      const key = kind || "all";
      const generation = (this.requestGeneration[key] || 0) + 1;
      this.requestGeneration[key] = generation;
      this.loadingKeys[key] = true;
      this.loading = true;
      this.error = "";
      try {
        const response = await api.list(kind);
        if (generation !== this.requestGeneration[key]) return;
        const existing = kind
          ? this.items.filter((item) => item.kind !== kind)
          : [];
        this.items = [...existing, ...response.items].sort(
          (left, right) => right.createdAt - left.createdAt
        );
        this.loaded = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : String(error);
        throw error;
      } finally {
        if (generation === this.requestGeneration[key]) {
          this.loadingKeys[key] = false;
          this.loading = Object.values(this.loadingKeys).some(Boolean);
          this.flushPendingEvents();
        }
      }
    },
    flushPendingEvents() {
      if (this.loading || this.pendingEvents.length === 0) return;
      const pending = this.pendingEvents;
      this.pendingEvents = [];
      for (const item of pending) this.applyRecord(item);
    },
    applyRecord(item: api.TransferItem) {
      this.items = [
        item,
        ...this.items.filter((saved) => saved.id !== item.id),
      ].sort((left, right) => right.createdAt - left.createdAt);
    },
    record(item: api.TransferItem) {
      this.eventRevision += 1;
      if (this.loading) {
        upsertPendingEvent(this.pendingEvents, item);
        return;
      }
      this.applyRecord(item);
    },
    async cancel(id: string) {
      this.record(await api.cancel(id));
    },
    async remove(id: string) {
      await api.remove(id);
      this.items = this.items.filter((item) => item.id !== id);
    },
    resetForUser() {
      this.$reset();
    },
  },
});
