<template>
  <div id="tasks-page" class="activity-page">
    <header-bar show-menu show-logo>
      <div class="activity-header-title">
        <app-icon name="tasks" :size="24" />
        <div>
          <strong>任务中心</strong>
          <span>{{ summaryLabel }}</span>
        </div>
      </div>
      <template #actions>
        <button
          type="button"
          class="activity-header-action"
          :class="{ 'is-loading': tasksStore.loading }"
          :disabled="tasksStore.loading"
          @click="load()"
        >
          <app-icon name="refresh" :size="19" />
          刷新
        </button>
      </template>
    </header-bar>

    <main class="activity-workspace">
      <nav class="activity-switcher" aria-label="任务与历史">
        <router-link to="/tasks" aria-current="page">
          <app-icon name="tasks" :size="18" />
          任务中心
        </router-link>
        <router-link to="/history">
          <app-icon name="history" :size="18" />
          操作历史
        </router-link>
      </nav>

      <section class="task-overview" aria-labelledby="tasks-title">
        <div>
          <h1 id="tasks-title">后台任务</h1>
          <p>运行中任务展示真实进度；失败和中断任务由你决定是否重试。</p>
        </div>
        <span class="task-overview__state">
          <span :class="{ active: tasksStore.counts.active > 0 }"></span>
          {{
            tasksStore.counts.active
              ? `${tasksStore.counts.active} 项进行中`
              : "当前空闲"
          }}
        </span>
      </section>

      <div
        class="activity-toolbar task-status-tabs"
        role="group"
        aria-label="筛选任务状态"
      >
        <button
          v-for="option in filters"
          :key="option.id"
          type="button"
          :class="{ active: activeFilter === option.id }"
          @click="activeFilter = option.id"
        >
          {{ option.label }}
          <span>{{ option.count }}</span>
        </button>
      </div>

      <form class="task-filter-bar" @submit.prevent="applyFilters">
        <label class="task-filter-bar__search">
          <app-icon name="search" :size="18" />
          <span class="sr-only">搜索任务</span>
          <input
            v-model="filterDraft.text"
            type="search"
            placeholder="搜索标题、任务类型或错误信息"
          />
        </label>
        <select
          v-model="filterDraft.type"
          aria-label="任务类型"
          @change="applyFilters"
        >
          <option value="">全部类型</option>
          <option
            v-for="option in taskTypes"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <button type="submit" class="primary">筛选</button>
        <details class="task-filter-more">
          <summary>更多筛选</summary>
          <div>
            <label v-if="authStore.user?.perm.admin">
              <span>用户</span>
              <input
                v-model="filterDraft.user"
                type="text"
                placeholder="用户名或用户 ID"
              />
            </label>
            <label>
              <span>开始日期</span>
              <input v-model="filterDraft.from" type="date" />
            </label>
            <label>
              <span>结束日期</span>
              <input v-model="filterDraft.to" type="date" />
            </label>
            <button type="button" @click="resetFilters">清除附加筛选</button>
          </div>
        </details>
      </form>

      <section
        v-if="showBatchActions"
        class="task-batch-bar"
        aria-label="批量任务操作"
      >
        <div>
          <strong
            >{{ tasksStore.total }} 项{{
              activeFilter === "attention" ? "需处理任务" : "归档任务"
            }}</strong
          >
          <span>操作范围为当前全部筛选结果，不只限于本页。</span>
        </div>
        <div>
          <button
            v-if="activeFilter === 'attention'"
            type="button"
            class="primary"
            @click="beginBatch('retry')"
          >
            <app-icon name="retry" :size="18" />
            一键处理
          </button>
          <button
            v-if="activeFilter === 'attention'"
            type="button"
            @click="beginBatch('archive')"
          >
            <app-icon name="archive" :size="18" />
            一键归档
          </button>
          <button
            v-if="activeFilter === 'archived'"
            type="button"
            @click="beginBatch('unarchive')"
          >
            <app-icon name="archive-restore" :size="18" />
            恢复当前筛选
          </button>
        </div>
      </section>

      <section
        v-if="tasksStore.error"
        class="activity-state activity-state--error"
      >
        <app-icon name="circle-alert" :size="24" />
        <div>
          <strong>无法读取任务</strong>
          <p>{{ tasksStore.error }}</p>
        </div>
        <button type="button" @click="load()">重试</button>
      </section>

      <section
        v-else-if="tasksStore.loading && !tasksStore.loaded"
        class="activity-list activity-list--loading"
        aria-label="正在加载任务"
      >
        <div v-for="index in 4" :key="index" class="activity-skeleton"></div>
      </section>

      <section v-else-if="tasksStore.items.length === 0" class="activity-empty">
        <div aria-hidden="true">
          <app-icon name="circle-check" :size="28" />
        </div>
        <h2>
          {{
            tasksStore.counts.all || tasksStore.counts.archived
              ? "此筛选下没有任务"
              : "还没有后台任务"
          }}
        </h2>
        <p>回收站清空、分析、兼容播放和其他长操作会出现在这里。</p>
      </section>

      <section v-else class="activity-list task-list" aria-label="任务列表">
        <div class="task-list__header" aria-hidden="true">
          <span>任务</span>
          <span>更新时间 / 操作</span>
        </div>
        <article
          v-for="task in tasksStore.items"
          :id="`task-${task.id}`"
          :key="task.id"
          class="task-row"
          :class="{ 'is-return-focus': returnFocusId === task.id }"
          tabindex="-1"
        >
          <span class="task-icon" :class="`task-icon--${task.status}`">
            <app-icon :name="taskIcon(task.status)" :size="20" />
          </span>

          <div class="task-row__content">
            <div class="task-row__heading">
              <strong>{{ task.title }}</strong>
              <span
                class="task-status"
                :class="`task-status--${task.status}`"
                >{{ statusLabel(task.status) }}</span
              >
            </div>
            <div class="task-card-meta">
              <span v-if="authStore.user?.perm.admin"
                ><app-icon name="user" :size="14" />{{
                  task.ownerName || `用户 ${task.userId}`
                }}</span
              >
              <span>{{ typeLabel(task.type) }}</span>
              <span v-if="task.retryOf"
                ><app-icon name="retry" :size="14" />重试任务</span
              >
            </div>

            <div
              v-if="isActive(task.status) && task.totalItems > 0"
              class="task-progress"
            >
              <div>
                <span
                  >已处理 {{ task.processedItems }} /
                  {{ task.totalItems }} 项</span
                >
                <strong>{{ progressPercent(task) }}%</strong>
              </div>
              <progress
                :value="task.processedItems"
                :max="task.totalItems"
                :aria-label="`${task.title}进度`"
              ></progress>
            </div>
            <p v-else-if="isActive(task.status)" class="task-progress-pending">
              {{
                task.status === "queued"
                  ? "正在等待可用执行槽"
                  : "任务正在执行，暂时没有可量化进度"
              }}
            </p>
            <template v-if="task.error">
              <p class="task-error">
                <app-icon name="circle-alert" :size="15" />
                <span>{{ summarizeTaskError(task.error) }}</span>
              </p>
              <details class="task-error-details">
                <summary>查看完整错误</summary>
                <pre>{{ task.error }}</pre>
              </details>
            </template>
            <details class="task-row__details">
              <summary>详细信息</summary>
              <dl>
                <div>
                  <dt>任务 ID</dt>
                  <dd>{{ task.id }}</dd>
                </div>
                <div>
                  <dt>创建时间</dt>
                  <dd>{{ exactTime(task.createdAt) }}</dd>
                </div>
              </dl>
            </details>
          </div>

          <div class="task-row__aside">
            <time
              class="task-row__time"
              :datetime="
                new Date(
                  task.finishedAt || task.startedAt || task.createdAt
                ).toISOString()
              "
              :title="
                exactTime(task.finishedAt || task.startedAt || task.createdAt)
              "
            >
              <span>最近更新</span>
              <strong>{{ taskTime(task) }}</strong>
            </time>

            <div class="task-card-actions">
              <button
                v-if="canCancel(task.status)"
                type="button"
                :disabled="busyIds.has(task.id)"
                @click="cancelTask(task)"
              >
                <app-icon name="circle-stop" :size="17" />取消
              </button>
              <button
                v-if="canRetry(task)"
                type="button"
                class="primary"
                :disabled="busyIds.has(task.id)"
                @click="retryTask(task)"
              >
                <app-icon name="retry" :size="17" />重试
              </button>
              <button
                v-if="resultRoute(task)"
                type="button"
                class="primary task-result-action"
                @click="resultTask = task"
              >
                <app-icon :name="resultIcon(task.type)" :size="17" />查看结果
              </button>
              <button
                v-if="task.archivedAt"
                type="button"
                :disabled="busyIds.has(task.id)"
                @click="restoreTask(task)"
              >
                <app-icon name="archive-restore" :size="17" />恢复
              </button>
              <button
                v-else-if="canArchive(task)"
                type="button"
                :disabled="busyIds.has(task.id)"
                @click="archiveTask(task)"
              >
                <app-icon name="archive" :size="17" />归档
              </button>
            </div>
          </div>
        </article>

        <button
          v-if="tasksStore.nextCursor"
          type="button"
          class="task-load-more"
          :disabled="tasksStore.loading"
          @click="loadMore"
        >
          {{
            tasksStore.loading
              ? "正在加载…"
              : `继续加载（已显示 ${tasksStore.items.length} / ${tasksStore.total}）`
          }}
        </button>
      </section>
    </main>

    <task-batch-dialog
      v-if="batchContext"
      :action="batchContext.action"
      :count="batchContext.count"
      :owners="batchContext.owners"
      :busy="batchBusy"
      :result="batchResult"
      @close="closeBatch"
      @confirm="confirmBatch"
    />
    <task-result-dialog
      v-if="resultTask"
      :task="resultTask"
      @close="resultTask = null"
      @full-report="openFullReport(resultTask)"
    />
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  inject,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import dayjs from "dayjs";
import HeaderBar from "@/components/header/HeaderBar.vue";
import TaskBatchDialog from "@/components/tasks/TaskBatchDialog.vue";
import TaskResultDialog from "@/components/tasks/TaskResultDialog.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import type { AppIconName } from "@/components/ui/iconRegistry";
import * as taskApi from "@/api/tasks";
import { StatusError } from "@/api/utils";
import type {
  TaskBatchAction,
  TaskBatchResponse,
  TaskItem,
  TaskListFilter,
  TaskStatus,
  TaskType,
} from "@/api/tasks";
import { useAuthStore } from "@/stores/auth";
import { useTasksStore } from "@/stores/tasks";
import { summarizeTaskError } from "@/utils/taskError";

type TaskFilter =
  | "all"
  | "active"
  | "attention"
  | "canceled"
  | "completed"
  | "archived";

const authStore = useAuthStore();
const tasksStore = useTasksStore();
const route = useRoute();
const router = useRouter();
const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<IToastSuccess>("$showSuccess")!;
const activeFilter = ref<TaskFilter>("all");
const busyIds = reactive(new Set<string>());
const filterDraft = reactive({
  text: "",
  type: "" as TaskType | "",
  user: "",
  from: "",
  to: "",
});
const appliedFilter = reactive({
  text: "",
  type: "" as TaskType | "",
  user: "",
  from: "",
  to: "",
});
const batchContext = ref<{
  action: TaskBatchAction;
  count: number;
  owners: string[];
  filter: TaskListFilter;
} | null>(null);
const batchResult = ref<TaskBatchResponse | null>(null);
const batchBusy = ref(false);
const resultTask = ref<TaskItem | null>(null);
const returnFocusId = ref("");
let pollingTimer: number | undefined;
let restoringReturn = false;

const taskReturnStorageKey = "nfb:task-return:v1";

interface TaskReturnState {
  taskId: string;
  activeFilter: TaskFilter;
  filters: typeof appliedFilter;
  loadedCount: number;
  scrollY: number;
}

const taskTypes: Array<{ value: TaskType; label: string }> = [
  { value: "trash.clear", label: "回收站清理" },
  { value: "analysis.duplicates", label: "重复文件分析" },
  { value: "analysis.storage", label: "空间分析" },
  { value: "archive.extract", label: "压缩包解压" },
  { value: "media.hls", label: "兼容播放" },
];

const filters = computed(() => [
  { id: "all" as const, label: "全部", count: tasksStore.counts.all },
  { id: "active" as const, label: "进行中", count: tasksStore.counts.active },
  {
    id: "attention" as const,
    label: "需处理",
    count: tasksStore.counts.attention,
  },
  {
    id: "canceled" as const,
    label: "已取消",
    count: tasksStore.counts.canceled,
  },
  {
    id: "completed" as const,
    label: "已完成",
    count: tasksStore.counts.completed,
  },
  {
    id: "archived" as const,
    label: "已归档",
    count: tasksStore.counts.archived,
  },
]);

const summaryLabel = computed(() =>
  tasksStore.counts.active
    ? `${tasksStore.counts.active} 项进行中`
    : `${tasksStore.counts.all} 项未归档任务`
);
const showBatchActions = computed(
  () =>
    tasksStore.total > 0 &&
    (activeFilter.value === "attention" || activeFilter.value === "archived")
);

function viewFilter(): TaskListFilter {
  const filter: TaskListFilter = {
    archived: activeFilter.value === "archived",
    limit: 30,
  };
  if (activeFilter.value === "active") filter.statuses = ["queued", "running"];
  if (activeFilter.value === "attention")
    filter.statuses = ["failed", "interrupted"];
  if (activeFilter.value === "canceled") filter.statuses = ["canceled"];
  if (activeFilter.value === "completed") filter.statuses = ["completed"];
  if (appliedFilter.text.trim()) filter.text = appliedFilter.text.trim();
  if (appliedFilter.type) filter.type = appliedFilter.type;
  if (authStore.user?.perm.admin && appliedFilter.user.trim())
    filter.user = appliedFilter.user.trim();
  if (appliedFilter.from)
    filter.from = new Date(`${appliedFilter.from}T00:00:00`).getTime();
  if (appliedFilter.to)
    filter.to = new Date(`${appliedFilter.to}T23:59:59.999`).getTime();
  return filter;
}

async function load(showError = true) {
  try {
    await tasksStore.load(viewFilter());
  } catch (error) {
    if (showError) $showError(error as Error, false);
  }
}

async function loadMore() {
  try {
    await tasksStore.loadMore();
  } catch (error) {
    $showError(error as Error, false);
  }
}

function applyFilters() {
  Object.assign(appliedFilter, filterDraft);
  void load();
}

function resetFilters() {
  Object.assign(filterDraft, {
    text: "",
    type: "",
    user: "",
    from: "",
    to: "",
  });
  Object.assign(appliedFilter, filterDraft);
  void load();
}

async function withTaskBusy(
  task: TaskItem,
  action: () => Promise<unknown>,
  message: string
) {
  if (busyIds.has(task.id)) return;
  busyIds.add(task.id);
  try {
    await action();
    await load(false);
    $showSuccess(message);
  } catch (error) {
    $showError(error as Error, false);
  } finally {
    busyIds.delete(task.id);
  }
}

function cancelTask(task: TaskItem) {
  return withTaskBusy(task, () => tasksStore.cancel(task.id), "取消请求已提交");
}

function retryTask(task: TaskItem) {
  return withTaskBusy(
    task,
    async () => {
      await tasksStore.retry(task.id);
      activeFilter.value = "active";
    },
    "重试任务已提交"
  );
}

function archiveTask(task: TaskItem) {
  return withTaskBusy(task, () => tasksStore.archive(task.id), "任务已归档");
}

function restoreTask(task: TaskItem) {
  return withTaskBusy(task, () => tasksStore.unarchive(task.id), "任务已恢复");
}

function beginBatch(action: TaskBatchAction) {
  batchResult.value = null;
  batchContext.value = {
    action,
    count: tasksStore.total,
    owners: tasksStore.owners.slice(),
    filter: {
      ...tasksStore.currentFilter,
      statuses: tasksStore.currentFilter.statuses?.slice(),
      cursor: undefined,
    },
  };
}

async function confirmBatch() {
  const context = batchContext.value;
  if (!context || batchBusy.value) return;
  batchBusy.value = true;
  try {
    batchResult.value = await taskApi.batch(
      context.action,
      context.filter,
      context.count
    );
    await load(false);
  } catch (error) {
    if (error instanceof StatusError && error.status === 409) {
      closeBatch();
      await load(false);
      $showError(
        new Error("筛选结果在确认期间发生变化，请核对新数量后重新操作。"),
        false
      );
    } else {
      $showError(error as Error, false);
    }
  } finally {
    batchBusy.value = false;
  }
}

function closeBatch() {
  if (batchBusy.value) return;
  batchContext.value = null;
  batchResult.value = null;
}

function canCancel(status: TaskStatus) {
  return status === "queued" || status === "running";
}

function isActive(status: TaskStatus) {
  return canCancel(status);
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

function progressPercent(task: TaskItem) {
  if (task.totalItems <= 0) return 0;
  return Math.min(
    100,
    Math.round((task.processedItems / task.totalItems) * 100)
  );
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

function taskTime(task: TaskItem) {
  return dayjs(task.finishedAt || task.startedAt || task.createdAt).fromNow();
}

function exactTime(timestamp: number) {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");
}

function typeLabel(type: TaskType) {
  return taskTypes.find((item) => item.value === type)?.label ?? type;
}

function resultRoute(task: TaskItem): RouteLocationRaw | null {
  if (task.status !== "completed") return null;
  if (task.type === "analysis.duplicates")
    return { path: "/analysis", query: { task: task.id } };
  if (task.type === "analysis.storage")
    return { path: "/analysis", query: { tool: "storage", task: task.id } };
  if (task.type === "archive.extract")
    return { path: "/archive", query: { task: task.id } };
  return null;
}

function fullResultRoute(task: TaskItem): RouteLocationRaw | null {
  const target = resultRoute(task);
  if (!target || typeof target === "string") return target;
  return {
    ...target,
    query: {
      ...(target.query ?? {}),
      from: "tasks",
      returnTask: task.id,
    },
  };
}

function rememberTaskPosition(taskId: string) {
  const state: TaskReturnState = {
    taskId,
    activeFilter: activeFilter.value,
    filters: { ...appliedFilter },
    loadedCount: tasksStore.items.length,
    scrollY: window.scrollY,
  };
  try {
    sessionStorage.setItem(taskReturnStorageKey, JSON.stringify(state));
  } catch {
    // 浏览器禁用会话存储时仍允许打开完整报告，只是不恢复原滚动位置。
  }
}

async function openFullReport(task: TaskItem) {
  const target = fullResultRoute(task);
  if (!target) return;
  rememberTaskPosition(task.id);
  resultTask.value = null;
  await router.push(target);
}

function readTaskReturnState(taskId: string): TaskReturnState | null {
  try {
    const raw = sessionStorage.getItem(taskReturnStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TaskReturnState>;
    if (
      parsed.taskId !== taskId ||
      !filters.value.some((item) => item.id === parsed.activeFilter) ||
      !parsed.filters
    ) {
      return null;
    }
    return parsed as TaskReturnState;
  } catch {
    return null;
  }
}

async function restoreTaskPosition() {
  const taskId =
    typeof route.query.returnTask === "string" ? route.query.returnTask : "";
  if (!taskId) {
    await load();
    return;
  }
  const state = readTaskReturnState(taskId);
  if (state) {
    restoringReturn = true;
    activeFilter.value = state.activeFilter;
    Object.assign(filterDraft, state.filters);
    Object.assign(appliedFilter, state.filters);
  }
  await load();
  if (state) {
    while (
      tasksStore.nextCursor &&
      tasksStore.items.length < state.loadedCount &&
      !tasksStore.items.some((task) => task.id === taskId)
    ) {
      await tasksStore.loadMore();
    }
  }
  restoringReturn = false;
  await nextTick();
  const target = document.getElementById(`task-${taskId}`);
  if (target) {
    returnFocusId.value = taskId;
    window.scrollTo({
      top: state?.scrollY ?? window.scrollY,
      behavior: "auto",
    });
    target.focus({ preventScroll: true });
    window.setTimeout(() => {
      if (returnFocusId.value === taskId) returnFocusId.value = "";
    }, 600);
  }
  try {
    sessionStorage.removeItem(taskReturnStorageKey);
  } catch {
    // 无会话存储时无需清理。
  }
  const query = { ...route.query };
  delete query.returnTask;
  await router.replace({ query });
}

function resultIcon(type: TaskType): AppIconName {
  if (type === "analysis.duplicates") return "analysis-duplicates";
  if (type === "analysis.storage") return "analysis-storage";
  if (type === "archive.extract") return "archive";
  return "tasks";
}

watch(activeFilter, () => {
  if (!restoringReturn) void load();
});

onMounted(() => {
  void restoreTaskPosition();
  pollingTimer = window.setInterval(() => {
    if (!batchContext.value) void load(false);
  }, 5000);
});

onUnmounted(() => {
  if (pollingTimer !== undefined) window.clearInterval(pollingTimer);
});
</script>
