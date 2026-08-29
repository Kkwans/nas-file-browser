import { defineStore } from "pinia";
import * as api from "@/api/transfers";

export const useTransfersStore = defineStore("transfers", {
  state: (): {
    items: api.TransferItem[];
    loading: boolean;
    loaded: boolean;
    error: string;
  } => ({
    items: [],
    loading: false,
    loaded: false,
    error: "",
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
      this.loading = true;
      this.error = "";
      try {
        const response = await api.list(kind);
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
        this.loading = false;
      }
    },
    record(item: api.TransferItem) {
      this.items = [
        item,
        ...this.items.filter((saved) => saved.id !== item.id),
      ].sort((left, right) => right.createdAt - left.createdAt);
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
