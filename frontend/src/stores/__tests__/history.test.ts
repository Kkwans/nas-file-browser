import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useHistoryStore } from "../history";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock("@/api/history", () => mocks);

describe("history store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    mocks.list.mockReset();
  });

  it("loads the authenticated user's private history", async () => {
    mocks.list.mockResolvedValue([
      {
        id: "entry",
        action: "trash.restore",
        target: "/document.txt",
        status: "success",
        createdAt: 10,
      },
    ]);
    const store = useHistoryStore();

    await store.load();

    expect(store.items).toHaveLength(1);
    expect(store.items[0].target).toBe("/document.txt");
  });
});
