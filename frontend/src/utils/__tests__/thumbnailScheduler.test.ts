import { describe, expect, it, vi } from "vitest";

import { ThumbnailScheduler } from "../thumbnailScheduler";

const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe("thumbnail scheduler", () => {
  it("merges identical work and keeps global concurrency at one", async () => {
    const scheduler = new ThumbnailScheduler(1);
    const firstGate = deferred<string>();
    const secondGate = deferred<string>();
    const firstTask = vi.fn(() => firstGate.promise);
    const secondTask = vi.fn(() => secondGate.promise);

    const first = scheduler.request("same", firstTask);
    const joined = scheduler.request("same", firstTask);
    const second = scheduler.request("second", secondTask);
    await Promise.resolve();

    expect(firstTask).toHaveBeenCalledTimes(1);
    expect(secondTask).not.toHaveBeenCalled();
    firstGate.resolve("frame-a");
    await expect(first.promise).resolves.toBe("frame-a");
    await expect(joined.promise).resolves.toBe("frame-a");
    await vi.waitFor(() => expect(secondTask).toHaveBeenCalledTimes(1));
    secondGate.resolve("frame-b");
    await expect(second.promise).resolves.toBe("frame-b");
  });

  it("cancels queued work after its last offscreen waiter leaves", async () => {
    const scheduler = new ThumbnailScheduler(1);
    const activeGate = deferred<string>();
    const queuedTask = vi.fn(async () => "queued");
    const active = scheduler.request("active", () => activeGate.promise);
    const queued = scheduler.request("queued", queuedTask);

    queued.cancel();
    await expect(queued.promise).rejects.toMatchObject({ name: "AbortError" });
    activeGate.resolve("active");
    await active.promise;
    await Promise.resolve();
    expect(queuedTask).not.toHaveBeenCalled();
  });

  it("aborts active work after its last offscreen waiter leaves", async () => {
    const scheduler = new ThumbnailScheduler(1);
    const task = vi.fn(
      (signal: AbortSignal) =>
        new Promise<string>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => reject(new DOMException("canceled", "AbortError")),
            { once: true }
          );
        })
    );
    const request = scheduler.request("active", task);
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(1));

    request.cancel();

    await expect(request.promise).rejects.toMatchObject({ name: "AbortError" });
  });

  it("cools down failed keys instead of retrying indefinitely", async () => {
    const scheduler = new ThumbnailScheduler(1, 60_000);
    const task = vi.fn(async () => {
      throw new Error("decode failed");
    });

    await expect(scheduler.request("broken", task).promise).rejects.toThrow(
      "decode failed"
    );
    await expect(scheduler.request("broken", task).promise).rejects.toThrow(
      "cooling down"
    );
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("bounds the in-memory frame cache", async () => {
    const scheduler = new ThumbnailScheduler(1, 60_000, 2);
    const task = vi.fn(async () => "frame");

    await scheduler.request("a", task).promise;
    await scheduler.request("b", task).promise;
    await scheduler.request("c", task).promise;
    await scheduler.request("a", task).promise;

    expect(task).toHaveBeenCalledTimes(4);
  });
});
