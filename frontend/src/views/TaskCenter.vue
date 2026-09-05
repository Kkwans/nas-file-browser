<template>
  <div class="task-center-page activity-page">
    <header-bar
      show-menu
      show-logo
      title="任务中心"
      title-icon="tasks"
      back-placement="leading"
      back-label="返回文件"
    >
      <template #actions>
        <action
          app-icon="refresh"
          label="刷新"
          :disabled="loadingCurrent"
          @action="loadCurrent"
        />
      </template>
    </header-bar>

    <main class="task-center-workspace">
      <nav class="task-center-tabs" role="tablist" aria-label="任务类型">
        <button
          v-for="tab in tabs"
          :id="`task-tab-${tab.id}`"
          :key="tab.id"
          type="button"
          role="tab"
          :aria-selected="activeTab === tab.id"
          :aria-controls="`task-panel-${tab.id}`"
          :tabindex="activeTab === tab.id ? 0 : -1"
          :class="{ active: activeTab === tab.id }"
          @click="selectTab(tab.id)"
          @keydown.left.prevent="focusTab(-1)"
          @keydown.right.prevent="focusTab(1)"
        >
          <app-icon :name="tab.icon" :size="18" />
          <span>{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="task-center-tab-count">{{
            tab.count
          }}</span>
        </button>
      </nav>

      <section
        v-if="activeTab === 'file' || activeTab === 'background'"
        :id="`task-panel-${activeTab}`"
        class="task-center-panel"
        role="tabpanel"
        :aria-labelledby="`task-tab-${activeTab}`"
      >
        <div class="task-center-panel-heading">
          <div>
            <h2>{{ activeTab === "file" ? "文件任务" : "后台任务" }}</h2>
            <p>
              {{
                activeTab === "file"
                  ? "复制和移动等文件操作。"
                  : "分析、清理、解压和兼容播放等长操作。"
              }}
            </p>
          </div>
          <label class="task-center-filter">
            <span>状态</span>
            <select v-model="taskFilter" @change="changeTaskFilter">
              <option value="all">全部</option>
              <option value="active">进行中</option>
              <option value="attention">需处理</option>
              <option value="completed">已完成</option>
            </select>
          </label>
        </div>
        <div
          v-if="tasksStore.error"
          class="task-center-state task-center-state--error"
          role="alert"
        >
          <app-icon name="circle-alert" :size="22" />
          <span>{{ tasksStore.error }}</span>
          <button type="button" @click="loadCurrent">重试</button>
        </div>
        <div
          v-else-if="tasksStore.loading && !tasksStore.loaded"
          class="task-center-skeletons"
          aria-label="正在加载任务"
        >
          <span v-for="index in 4" :key="index"></span>
        </div>
        <div
          v-else-if="tasksStore.items.length === 0"
          class="task-center-empty"
        >
          <app-icon name="circle-check" :size="30" />
          <h3>还没有{{ activeTab === "file" ? "文件" : "后台" }}任务</h3>
          <p>
            {{
              activeTab === "file"
                ? "复制和移动任务会自动出现在这里。"
                : "需要较长时间的操作会自动出现在这里。"
            }}
          </p>
        </div>
        <div v-else class="task-center-list">
          <article
            v-for="task in tasksStore.items"
            :key="task.id"
            class="task-center-item"
          >
            <span class="task-center-item-icon" :class="`is-${task.status}`">
              <app-icon :name="taskIcon(task.status)" :size="19" />
            </span>
            <div class="task-center-item-main">
              <div class="task-center-item-title">
                <strong>{{ task.title }}</strong>
                <span class="task-center-status" :class="`is-${task.status}`">{{
                  statusLabel(task.status)
                }}</span>
              </div>
              <p>
                {{ taskTypeLabel(task.type) }} · {{ taskTime(task.createdAt) }}
              </p>
              <div
                v-if="isTaskActive(task) && taskProgress(task).mode === 'bytes'"
                class="task-center-progress"
              >
                <progress
                  :value="taskProgress(task).value"
                  :max="taskProgress(task).max"
                  :aria-label="`${task.title}进度`"
                ></progress>
                <span>{{
                  byteProgress(
                    taskProgress(task).value ?? 0,
                    taskProgress(task).max
                  )
                }}</span>
              </div>
              <div
                v-else-if="
                  isTaskActive(task) && taskProgress(task).mode === 'items'
                "
                class="task-center-progress"
              >
                <progress
                  :value="taskProgress(task).value"
                  :max="taskProgress(task).max"
                  :aria-label="`${task.title}进度`"
                ></progress>
                <span
                  >{{ taskProgress(task).value }} /
                  {{ taskProgress(task).max }}</span
                >
              </div>
              <div
                v-else-if="isTaskActive(task)"
                class="task-center-progress task-center-progress--indeterminate"
                role="status"
                aria-live="polite"
              >
                <span>{{ task.title }}正在处理</span>
              </div>
              <p v-else-if="task.error" class="task-center-error">
                {{ task.error }}
              </p>
            </div>
            <div class="task-center-item-actions">
              <button
                v-if="isTaskActive(task)"
                type="button"
                :disabled="busyIds.has(task.id)"
                @click="cancelTask(task.id)"
              >
                取消
              </button>
              <button
                v-else-if="canRetry(task)"
                type="button"
                class="primary"
                :disabled="busyIds.has(task.id)"
                @click="retryTask(task.id)"
              >
                重试
              </button>
              <button
                v-if="canArchive(task)"
                type="button"
                :disabled="busyIds.has(task.id)"
                @click="archiveTask(task.id)"
              >
                归档
              </button>
            </div>
          </article>
        </div>
      </section>

      <section
        v-else-if="activeTab === 'upload' || activeTab === 'download'"
        :id="`task-panel-${activeTab}`"
        class="task-center-panel"
        role="tabpanel"
        :aria-labelledby="`task-tab-${activeTab}`"
      >
        <div class="task-center-panel-heading">
          <div>
            <h2>{{ activeTab === "upload" ? "上传记录" : "下载记录" }}</h2>
            <p>上传和下载进度会在传输期间实时更新。</p>
          </div>
        </div>
        <div
          v-if="transfersStore.error"
          class="task-center-state task-center-state--error"
          role="alert"
        >
          <app-icon name="circle-alert" :size="22" />
          <span>{{ transfersStore.error }}</span>
          <button type="button" @click="loadCurrent">重试</button>
        </div>
        <div
          v-else-if="transfersStore.loading && !transfersStore.loaded"
          class="task-center-skeletons"
          aria-label="正在加载传输记录"
        >
          <span v-for="index in 4" :key="index"></span>
        </div>
        <div v-else-if="activeTransfers.length === 0" class="task-center-empty">
          <app-icon
            :name="activeTab === 'upload' ? 'upload' : 'download'"
            :size="30"
          />
          <h3>还没有{{ activeTab === "upload" ? "上传" : "下载" }}记录</h3>
          <p>
            {{
              activeTab === "upload"
                ? "拖拽文件到工作区即可开始上传。"
                : "从文件菜单发起下载后，记录会保留在这里。"
            }}
          </p>
        </div>
        <div v-else class="task-center-list">
          <article
            v-for="item in activeTransfers"
            :key="item.id"
            class="task-center-item"
          >
            <span class="task-center-item-icon" :class="`is-${item.status}`">
              <app-icon
                :name="activeTab === 'upload' ? 'upload' : 'download'"
                :size="19"
              />
            </span>
            <div class="task-center-item-main">
              <div class="task-center-item-title">
                <strong :title="item.name">{{ item.name }}</strong>
                <span class="task-center-status" :class="`is-${item.status}`">{{
                  transferStatusLabel(item.status)
                }}</span>
              </div>
              <p :title="item.target">
                {{ item.target }} · {{ taskTime(item.createdAt) }}
              </p>
              <div
                v-if="isTransferActive(item) && item.bytesTotal"
                class="task-center-transfer-progress"
              >
                <div class="task-center-progress-summary">
                  <span>{{
                    byteProgress(item.bytesTransferred, item.bytesTotal)
                  }}</span>
                  <strong>{{ transferPercent(item) }}%</strong>
                </div>
                <div
                  class="task-center-progress-track"
                  role="progressbar"
                  :aria-label="`${item.name}进度`"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuenow="transferPercent(item)"
                >
                  <span :style="{ width: `${transferPercent(item)}%` }"></span>
                </div>
                <div
                  v-if="item.speedBytesPerSecond !== undefined"
                  class="task-center-progress-metrics"
                >
                  <span>速度 {{ transferSpeed(item) }}</span>
                  <span>预计剩余 {{ transferEta(item) }}</span>
                </div>
              </div>
              <p v-else-if="item.error" class="task-center-error">
                {{ item.error }}
              </p>
            </div>
            <div class="task-center-item-actions">
              <button
                v-if="isTransferActive(item)"
                type="button"
                @click="cancelTransfer(item.id)"
              >
                取消
              </button>
              <button type="button" @click="removeTransfer(item.id)">
                删除记录
              </button>
            </div>
          </article>
        </div>
      </section>

      <section
        v-else
        id="task-panel-history"
        class="task-center-panel"
        role="tabpanel"
        aria-labelledby="task-tab-history"
      >
        <div class="task-center-panel-heading">
          <div>
            <h2>操作历史</h2>
            <p>文件操作和任务动作的时间线，按用户隔离保存。</p>
          </div>
        </div>
        <div
          v-if="historyStore.error"
          class="task-center-state task-center-state--error"
          role="alert"
        >
          <app-icon name="circle-alert" :size="22" />
          <span>{{ historyStore.error }}</span>
          <button type="button" @click="loadCurrent">重试</button>
        </div>
        <div
          v-else-if="historyStore.loading && !historyStore.loaded"
          class="task-center-skeletons"
          aria-label="正在加载操作历史"
        >
          <span v-for="index in 5" :key="index"></span>
        </div>
        <div
          v-else-if="historyStore.items.length === 0"
          class="task-center-empty"
        >
          <app-icon name="history" :size="30" />
          <h3>还没有操作记录</h3>
          <p>重命名、移动、上传和任务操作会记录在这里。</p>
        </div>
        <div v-else class="task-center-history-list">
          <article
            v-for="entry in historyStore.items"
            :key="entry.id"
            class="task-center-history-item"
          >
            <span
              class="task-center-history-dot"
              :class="`is-${entry.status}`"
            ></span>
            <div>
              <strong>{{ historyActionLabel(entry.action) }}</strong>
              <p :title="entry.target">{{ entry.target }}</p>
              <small v-if="entry.detail">{{ entry.detail }}</small>
            </div>
            <time :datetime="new Date(entry.createdAt).toISOString()">{{
              taskTime(entry.createdAt)
            }}</time>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HeaderBar from "@/components/header/HeaderBar.vue";
import Action from "@/components/header/Action.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import type { AppIconName } from "@/components/ui/iconRegistry";
import type { TaskItem, TaskStatus, TaskType } from "@/api/tasks";
import type {
  TransferItem,
  TransferKind,
  TransferStatus,
} from "@/api/transfers";
import { useTasksStore } from "@/stores/tasks";
import { useHistoryStore } from "@/stores/history";
import { useTransfersStore } from "@/stores/transfers";
import { useUploadStore } from "@/stores/upload";
import {
  formatTaskBytes,
  getTaskProgress,
  type TaskProgress,
} from "@/utils/taskProgress";

type TaskCenterTab = "download" | "upload" | "file" | "background" | "history";
type TaskFilter = "all" | "active" | "attention" | "completed";
type DisplayTransfer = TransferItem & {
  speedBytesPerSecond?: number;
  etaSeconds?: number;
};

const route = useRoute();
const router = useRouter();
const tasksStore = useTasksStore();
const historyStore = useHistoryStore();
const transfersStore = useTransfersStore();
const uploadStore = useUploadStore();
const activeTab = ref<TaskCenterTab>(parseTab(route.query.tab));
const taskFilter = ref<TaskFilter>(parseTaskFilter(route.query.status));
const busyIds = reactive(new Set<string>());

const tabs = computed(() => [
  {
    id: "download" as const,
    label: "下载",
    icon: "download" as const,
    count: transfersStore.downloads.filter(isTransferActive).length,
  },
  {
    id: "upload" as const,
    label: "上传",
    icon: "upload" as const,
    count: new Set([
      ...transfersStore.uploads.filter(isTransferActive).map((item) => item.id),
      ...Array.from(uploadStore.activeUploads).map(
        (upload) => upload.transferId
      ),
    ]).size,
  },
  {
    id: "file" as const,
    label: "文件任务",
    icon: "folder" as const,
    count: tasksStore.categoryCounts.file.active,
  },
  {
    id: "background" as const,
    label: "后台任务",
    icon: "tasks" as const,
    count: tasksStore.categoryCounts.background.active,
  },
  {
    id: "history" as const,
    label: "操作历史",
    icon: "history" as const,
    count: 0,
  },
]);

const activeTransfers = computed<DisplayTransfer[]>(() => {
  if (activeTab.value !== "upload") return transfersStore.downloads;

  const localUploads = new Map(
    Array.from(uploadStore.activeUploads).map((upload) => [
      upload.transferId,
      upload,
    ])
  );
  const merged = transfersStore.uploads.map<DisplayTransfer>((item) => {
    const local = localUploads.get(item.id);
    if (!local) return item;
    localUploads.delete(item.id);
    return {
      ...item,
      status: "running",
      bytesTotal: local.totalBytes,
      bytesTransferred: local.sentBytes,
      speedBytesPerSecond: local.speedBytesPerSecond,
      etaSeconds:
        local.speedBytesPerSecond > 0
          ? Math.max(0, local.totalBytes - local.sentBytes) /
            local.speedBytesPerSecond
          : Infinity,
    };
  });

  for (const upload of localUploads.values()) {
    merged.unshift({
      id: upload.transferId,
      kind: "upload",
      status: "running",
      name: upload.name,
      target: upload.path,
      bytesTotal: upload.totalBytes,
      bytesTransferred: upload.sentBytes,
      createdAt: upload.createdAt,
      speedBytesPerSecond: upload.speedBytesPerSecond,
      etaSeconds:
        upload.speedBytesPerSecond > 0
          ? Math.max(0, upload.totalBytes - upload.sentBytes) /
            upload.speedBytesPerSecond
          : Infinity,
    });
  }

  return merged.sort((left, right) => right.createdAt - left.createdAt);
});
const loadingCurrent = computed(() => {
  if (activeTab.value === "file" || activeTab.value === "background") {
    return tasksStore.loading;
  }
  if (activeTab.value === "history") return historyStore.loading;
  return transfersStore.loading;
});

function parseTab(value: unknown): TaskCenterTab {
  return value === "upload" ||
    value === "download" ||
    value === "file" ||
    value === "background" ||
    value === "history"
    ? value
    : "download";
}

function parseTaskFilter(value: unknown): TaskFilter {
  return value === "active" || value === "attention" || value === "completed"
    ? value
    : "all";
}

function updateRouteQuery(
  next: Partial<{ tab: TaskCenterTab; status: TaskFilter }>
) {
  const query = { ...route.query, ...next } as Record<string, string>;
  if (!query.tab) query.tab = activeTab.value;
  if (!query.status || query.status === "all") delete query.status;
  void router.replace({ query });
}

function selectTab(tab: TaskCenterTab) {
  activeTab.value = tab;
  updateRouteQuery({ tab });
  void loadCurrent();
}

function changeTaskFilter() {
  updateRouteQuery({ status: taskFilter.value });
  void loadCurrent();
}

function focusTab(direction: number) {
  const index = tabs.value.findIndex((tab) => tab.id === activeTab.value);
  const next =
    tabs.value[(index + direction + tabs.value.length) % tabs.value.length];
  selectTab(next.id);
  requestAnimationFrame(() =>
    document.getElementById(`task-tab-${next.id}`)?.focus()
  );
}

function taskFilterQuery(): { statuses?: TaskStatus[] } {
  if (taskFilter.value === "active") return { statuses: ["queued", "running"] };
  if (taskFilter.value === "attention")
    return { statuses: ["failed", "interrupted"] };
  if (taskFilter.value === "completed") return { statuses: ["completed"] };
  return {};
}

async function loadCurrent() {
  try {
    if (activeTab.value === "file" || activeTab.value === "background") {
      await tasksStore.load({
        ...taskFilterQuery(),
        category: activeTab.value,
        limit: 30,
      });
    } else if (activeTab.value === "history") {
      await historyStore.load({ limit: 30 });
    } else {
      await transfersStore.load(activeTab.value as TransferKind);
    }
  } catch {
    // Each store exposes its own error state and retry button.
  }
}

async function withBusy(id: string, action: () => Promise<void>) {
  if (busyIds.has(id)) return;
  busyIds.add(id);
  try {
    await action();
    await loadCurrent();
  } finally {
    busyIds.delete(id);
  }
}

function cancelTask(id: string) {
  return withBusy(id, async () => {
    await tasksStore.cancel(id);
  });
}

function retryTask(id: string) {
  return withBusy(id, async () => {
    await tasksStore.retry(id);
  });
}

function archiveTask(id: string) {
  return withBusy(id, async () => {
    await tasksStore.archive(id);
  });
}

function cancelTransfer(id: string) {
  return withBusy(id, async () => {
    await transfersStore.cancel(id);
  });
}

function removeTransfer(id: string) {
  return withBusy(id, async () => {
    await transfersStore.remove(id);
  });
}

function isTaskActive(task: TaskItem) {
  return task.status === "queued" || task.status === "running";
}

function canRetry(task: TaskItem) {
  return (
    !task.archivedAt &&
    (task.status === "failed" || task.status === "interrupted")
  );
}

function canArchive(task: TaskItem) {
  return (
    !task.archivedAt &&
    ["completed", "failed", "canceled", "interrupted"].includes(task.status)
  );
}

function isTransferActive(item: TransferItem) {
  return item.status === "queued" || item.status === "running";
}

function taskIcon(status: TaskStatus): AppIconName {
  return (
    {
      queued: "clock",
      running: "loader",
      completed: "circle-check",
      failed: "circle-alert",
      canceled: "circle-stop",
      interrupted: "retry",
    } satisfies Record<TaskStatus, AppIconName>
  )[status];
}

function statusLabel(status: TaskStatus) {
  return (
    {
      queued: "排队中",
      running: "正在执行",
      completed: "已完成",
      failed: "执行失败",
      canceled: "已取消",
      interrupted: "已中断",
    } satisfies Record<TaskStatus, string>
  )[status];
}

function transferStatusLabel(status: TransferStatus) {
  return (
    {
      queued: "排队中",
      running: "传输中",
      completed: "已完成",
      failed: "失败",
      canceled: "已取消",
      interrupted: "已中断",
    } satisfies Record<TransferStatus, string>
  )[status];
}

function taskTypeLabel(type: TaskType) {
  return (
    {
      "file.copy": "复制文件",
      "file.move": "移动文件",
      "trash.clear": "回收站清理",
      "trash.size": "回收站大小统计",
      "analysis.duplicates": "重复文件分析",
      "analysis.duplicates.cleanup": "重复文件清理",
      "analysis.storage": "空间分析",
      "archive.extract": "压缩包解压",
      "media.hls": "兼容播放",
    } satisfies Record<TaskType, string>
  )[type];
}

function historyActionLabel(action: string) {
  return (
    (
      {
        "file.upload": "上传文件",
        "file.rename": "重命名或移动",
        "file.copy": "复制文件",
        "file.delete": "删除文件",
        "trash.restore": "恢复文件",
        "task.cancel": "取消任务",
        "task.retry": "重试任务",
      } as Record<string, string>
    )[action] ?? action
  );
}

function taskTime(timestamp: number) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function byteProgress(value: number, total?: number) {
  if (!total) return `${value} B`;
  return `${formatTaskBytes(value)} / ${formatTaskBytes(total)}`;
}

function transferPercent(item: DisplayTransfer) {
  if (!item.bytesTotal) return 0;
  return Math.min(
    100,
    Math.max(
      0,
      Math.round((item.bytesTransferred / item.bytesTotal) * 1000) / 10
    )
  );
}

function transferSpeed(item: DisplayTransfer) {
  return `${formatTaskBytes(Math.round(item.speedBytesPerSecond ?? 0))}/秒`;
}

function transferEta(item: DisplayTransfer) {
  const seconds = item.etaSeconds;
  if (seconds === undefined || !Number.isFinite(seconds)) return "--:--:--";
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainder = rounded % 60;
  return [hours, minutes, remainder]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function taskProgress(task: TaskItem): TaskProgress {
  return getTaskProgress(task);
}

watch(
  () => [route.query.tab, route.query.status],
  ([tab, status]) => {
    const next = parseTab(tab);
    if (next !== activeTab.value) {
      activeTab.value = next;
    }
    const nextFilter = parseTaskFilter(status);
    if (nextFilter !== taskFilter.value) taskFilter.value = nextFilter;
    void loadCurrent();
  }
);

onMounted(async () => {
  await loadCurrent();
});
</script>
