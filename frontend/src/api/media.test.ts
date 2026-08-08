import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchJSON: vi.fn(),
  fetchURL: vi.fn(),
}));

vi.mock("./utils", () => mocks);

import {
  clearPlayback,
  cancelHLSPlayback,
  getHLSPlayback,
  getMediaInformation,
  getPlayback,
  savePlayback,
  startHLSPlayback,
} from "./media";

describe("媒体 API", () => {
  beforeEach(() => {
    mocks.fetchJSON.mockReset().mockResolvedValue({});
    mocks.fetchURL.mockReset().mockResolvedValue(new Response(null));
  });

  it("只有显式请求时才发送位置元数据参数", async () => {
    await getMediaInformation("/相册/照片.jpg");
    await getMediaInformation("/相册/照片.jpg", true);
    expect(mocks.fetchJSON.mock.calls[0][0]).toBe(
      "/api/media/info?path=%2F%E7%9B%B8%E5%86%8C%2F%E7%85%A7%E7%89%87.jpg"
    );
    expect(mocks.fetchJSON.mock.calls[1][0]).toContain("includeLocation=true");
  });

  it("使用同一播放位置资源读取、精确保存和清除", async () => {
    await getPlayback("/video.mp4");
    await savePlayback("/video.mp4", 99.875, 100);
    await clearPlayback("/video.mp4");
    expect(mocks.fetchJSON.mock.calls[0][0]).toBe(
      "/api/media/playback?path=%2Fvideo.mp4"
    );
    expect(mocks.fetchJSON.mock.calls[1][1]).toMatchObject({ method: "PUT" });
    expect(JSON.parse(mocks.fetchJSON.mock.calls[1][1].body)).toEqual({
      path: "/video.mp4",
      position: 99.875,
      duration: 100,
    });
    expect(mocks.fetchURL).toHaveBeenCalledWith(
      "/api/media/playback?path=%2Fvideo.mp4",
      { method: "DELETE" }
    );
  });

  it("只有显式调用才创建、轮询或取消兼容播放任务", async () => {
    mocks.fetchURL.mockImplementation(async () =>
      Promise.resolve(
        new Response(JSON.stringify({ id: "cache-id", state: "queued" }))
      )
    );
    await startHLSPlayback("/电影/示例.mkv");
    await getHLSPlayback("cache-id");
    await cancelHLSPlayback("cache-id");

    expect(mocks.fetchURL.mock.calls[0]).toEqual([
      "/api/media/hls",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/电影/示例.mkv" }),
      },
    ]);
    expect(mocks.fetchJSON).toHaveBeenCalledWith("/api/media/hls/cache-id");
    expect(mocks.fetchURL.mock.calls[1]).toEqual([
      "/api/media/hls/cache-id/cancel",
      { method: "POST" },
    ]);
  });
});
