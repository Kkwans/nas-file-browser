import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchJSON: vi.fn(),
  fetchURL: vi.fn(),
}));

vi.mock("./utils", () => mocks);

import { listRecentScans } from "./analysis";

describe("存储分析 API", () => {
  beforeEach(() => {
    mocks.fetchJSON.mockReset().mockResolvedValue([]);
    mocks.fetchURL.mockReset();
  });

  it("按当前工具和上限读取安全的最近扫描摘要", async () => {
    await listRecentScans("storage", 5);
    expect(mocks.fetchJSON).toHaveBeenCalledWith(
      "/api/analysis/recent?tool=storage&limit=5"
    );
  });
});
