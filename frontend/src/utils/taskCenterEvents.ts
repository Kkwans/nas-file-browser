import { baseURL, origin } from "@/utils/constants";

export type TaskCenterEventType =
  | "task.changed"
  | "transfer.changed"
  | "history.created"
  | "resync.required";

export interface TaskCenterEvent {
  id: number;
  type: TaskCenterEventType;
  data?: unknown;
}

export type TaskCenterEventHandler = (event: TaskCenterEvent) => void;

/**
 * Connect to the authenticated task-center event stream. REST remains the
 * snapshot source: normal notifications are merged locally and an explicit
 * resync marker causes the caller to refetch all three stores.
 */
export function connectTaskCenterEvents(
  onChange: TaskCenterEventHandler,
  onResync: () => void
) {
  if (typeof window === "undefined" || typeof EventSource === "undefined") {
    return () => {};
  }

  const endpoint = `${origin}${baseURL}/api/task-center/events`;
  let source: EventSource | null = null;
  let retryTimer: number | undefined;
  let retryDelay = 1000;
  let closed = false;
  let lastEventId = 0;

  const parse = (event: MessageEvent<string>, type: TaskCenterEventType) => {
    let data: unknown;
    try {
      data = event.data ? JSON.parse(event.data) : undefined;
    } catch {
      data = event.data;
    }
    const id = Number(event.lastEventId || 0);
    if (Number.isFinite(id) && id > lastEventId) lastEventId = id;
    onChange({ id, type, data });
  };

  const connect = () => {
    if (closed) return;
    source?.close();
    const url = new URL(endpoint, window.location.href);
    if (lastEventId > 0)
      url.searchParams.set("lastEventId", String(lastEventId));
    source = new EventSource(url.toString(), { withCredentials: true });
    source.onopen = () => {
      retryDelay = 1000;
    };
    source.onerror = () => {
      source?.close();
      source = null;
      if (closed || retryTimer !== undefined) return;
      retryTimer = window.setTimeout(() => {
        retryTimer = undefined;
        connect();
      }, retryDelay);
      retryDelay = Math.min(retryDelay * 2, 30000);
    };
    source.addEventListener("task.changed", (event) =>
      parse(event as MessageEvent<string>, "task.changed")
    );
    source.addEventListener("transfer.changed", (event) =>
      parse(event as MessageEvent<string>, "transfer.changed")
    );
    source.addEventListener("history.created", (event) =>
      parse(event as MessageEvent<string>, "history.created")
    );
    source.addEventListener("resync.required", (event) => {
      const message = event as MessageEvent<string>;
      const id = Number(message.lastEventId || 0);
      if (Number.isFinite(id) && id > lastEventId) lastEventId = id;
      onResync();
    });
  };

  connect();
  return () => {
    closed = true;
    if (retryTimer !== undefined) window.clearTimeout(retryTimer);
    retryTimer = undefined;
    source?.close();
    source = null;
  };
}
