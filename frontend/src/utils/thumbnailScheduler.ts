export type ThumbnailTask = (signal: AbortSignal) => Promise<string>;

export type ThumbnailRequest = {
  promise: Promise<string>;
  cancel: () => void;
};

type Waiter = {
  resolve: (value: string) => void;
  reject: (reason: unknown) => void;
  canceled: boolean;
};

type Job = {
  key: string;
  task: ThumbnailTask;
  controller: AbortController;
  waiters: Set<Waiter>;
  started: boolean;
  onStart?: () => void;
};

const abortError = () =>
  new DOMException("Thumbnail task canceled", "AbortError");

export class ThumbnailScheduler {
  private active = 0;
  private readonly queue: Job[] = [];
  private readonly jobs = new Map<string, Job>();
  private readonly cache = new Map<string, string>();
  private readonly failures = new Map<string, number>();

  constructor(
    private readonly concurrency = 1,
    private readonly cooldownMs = 15_000,
    private readonly cacheEntries = 128,
    private readonly failureEntries = 256
  ) {}

  request(
    key: string,
    task: ThumbnailTask,
    onStart?: () => void
  ): ThumbnailRequest {
    const cached = this.cache.get(key);
    if (cached) return { promise: Promise.resolve(cached), cancel: () => {} };

    const failedAt = this.failures.get(key);
    if (failedAt && Date.now() - failedAt < this.cooldownMs) {
      return {
        promise: Promise.reject(
          new Error("Thumbnail generation is cooling down")
        ),
        cancel: () => {},
      };
    }
    this.failures.delete(key);

    let job = this.jobs.get(key);
    if (!job) {
      job = {
        key,
        task,
        controller: new AbortController(),
        waiters: new Set(),
        started: false,
        onStart,
      };
      this.jobs.set(key, job);
      this.queue.push(job);
    }

    let waiter!: Waiter;
    const promise = new Promise<string>((resolve, reject) => {
      waiter = { resolve, reject, canceled: false };
      job!.waiters.add(waiter);
    });
    const cancel = () => {
      if (waiter.canceled) return;
      waiter.canceled = true;
      job!.waiters.delete(waiter);
      waiter.reject(abortError());
      if (job!.waiters.size === 0) {
        job!.controller.abort();
        if (!job!.started) {
          const index = this.queue.indexOf(job!);
          if (index >= 0) this.queue.splice(index, 1);
          this.jobs.delete(job!.key);
        }
      }
    };

    this.pump();
    return { promise, cancel };
  }

  private pump() {
    while (this.active < this.concurrency && this.queue.length > 0) {
      const job = this.queue.shift()!;
      if (job.waiters.size === 0) continue;
      job.started = true;
      job.onStart?.();
      this.active++;
      void job
        .task(job.controller.signal)
        .then((value) => {
          this.cache.delete(job.key);
          this.cache.set(job.key, value);
          this.trimOldest(this.cache, this.cacheEntries);
          for (const waiter of job.waiters) waiter.resolve(value);
        })
        .catch((error) => {
          if (!(error instanceof Error && error.name === "AbortError")) {
            this.failures.delete(job.key);
            this.failures.set(job.key, Date.now());
            this.trimOldest(this.failures, this.failureEntries);
          }
          for (const waiter of job.waiters) waiter.reject(error);
        })
        .finally(() => {
          this.jobs.delete(job.key);
          this.active--;
          this.pump();
        });
    }
  }

  private trimOldest<T>(entries: Map<string, T>, maximum: number) {
    while (entries.size > maximum) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) return;
      entries.delete(oldest);
    }
  }
}

export const browserVideoThumbnailScheduler = new ThumbnailScheduler(1);

export function extractVideoFrame(
  source: string,
  signal: AbortSignal
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    const fail = (error: unknown) => {
      cleanup();
      reject(error);
    };
    const onAbort = () => fail(abortError());
    signal.addEventListener("abort", onAbort, { once: true });

    video.onerror = () =>
      fail(new Error("Browser cannot decode video preview"));
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration)) {
        fail(new Error("Video duration is unavailable"));
        return;
      }
      video.currentTime = Math.min(0.1, Math.max(video.duration / 20, 0));
    };
    video.onseeked = () => {
      try {
        const width = video.videoWidth;
        const height = video.videoHeight;
        if (!width || !height) throw new Error("Video frame has no dimensions");
        const scale = Math.min(1, 256 / Math.max(width, height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Canvas is unavailable");
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const result = canvas.toDataURL("image/jpeg", 0.78);
        cleanup();
        resolve(result);
      } catch (error) {
        fail(error);
      }
    };

    video.src = source;
  });
}
