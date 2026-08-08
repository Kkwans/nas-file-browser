<template>
  <div id="tasks-page" class="activity-page">
    <header-bar show-menu show-logo>
      <div class="activity-header-title">
        <i class="material-icons" aria-hidden="true">pending_actions</i>
        <div>
          <strong>任务中心</strong>
          <span>{{ summaryLabel }}</span>
        </div>
      </div>
      <template #actions>
        <button
          type="button"
          class="activity-header-action"
          :disabled="tasksStore.loading"
          @click="load()"
        >
          <i class="material-icons" aria-hidden="true">refresh</i>
          刷新
        </button>
      </template>
    </header-bar>

    <main class="activity-workspace">
      <nav class="activity-switcher" aria-label="任务与历史">
        <router-link to="/tasks" aria-current="page">
          <i class="material-icons" aria-hidden="true">pending_actions</i>
          任务中心
        </router-link>
        <router-link to="/history">
          <i class="material-icons" aria-hidden="true">history</i>
          操作历史
        </router-link>
      </nav>

      <section class="activity-intro" aria-labelledby="tasks-title">
        <div class="activity-intro-mark" aria-hidden="true">
          <span>{{ tasksStore.activeItems.length }}</span>
          <small>ACTIVE</small>
        </div>
        <div>
          <h1 id="tasks-title">只展示真实任务状态</h1>
          <p>
            长操作会保留进度与结果。服务重启后任务标记为已中断，由你决定是否重试。
          </p>
        </div>
        <span class="activity-polling-state">
          <i class="material-icons" aria-hidden="true">sync</i>
          页面打开时自动刷新
        </span>
      </section>

      <div class="activity-toolbar" role="group" aria-label="筛选任务">
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

      <section
        v-if="tasksStore.error"
        class="activity-state activity-state--error"
      >
        <i class="material-icons" aria-hidden="true">cloud_off</i>
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

      <section v-else-if="visibleTasks.length === 0" class="activity-empty">
        <div aria-hidden="true"><i class="material-icons">task_alt</i></div>
        <h2>
          {{ tasksStore.items.length ? "此筛选下没有任务" : "还没有后台任务" }}
        </h2>
        <p>回收站清空、分析、兼容播放和其他长操作会出现在这里。</p>
      </section>

      <section v-else class="activity-list" aria-label="任务列表">
        <article
          v-for="task in visibleTasks"
          :key="task.id"
          class="task-card"
          :class="`task-card--${task.status}`"
        >
          <div class="task-card-rail" aria-hidden="true"></div>
          <div class="task-card-main">
            <div class="task-card-heading">
              <div class="task-icon" :class="`task-icon--${task.status}`">
                <i class="material-icons" aria-hidden="true">{{
                  taskIcon(task.status)
                }}</i>
              </div>
              <div>
                <strong>{{ task.title }}</strong>
                <span>{{ statusLabel(task.status) }}</span>
              </div>
            </div>
            <div class="task-card-meta">
              <span>
                <i class="material-icons" aria-hidden="true">schedule</i>
                {{ taskTime(task) }}
              </span>
              <span v-if="authStore.user?.perm.admin">
                <i class="material-icons" aria-hidden="true">person_outline</i>
                {{ task.ownerName || `用户 ${task.userId}` }}
              </span>
              <span v-if="task.retryOf">
                <i class="material-icons" aria-hidden="true">replay</i>
                重试任务
              </span>
            </div>

            <div v-if="task.totalItems > 0" class="task-progress">
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
            <p v-else class="task-progress-pending">
              <i class="material-icons" aria-hidden="true">hourglass_top</i>
              {{
                task.status === "queued"
                  ? "正在等待可用执行槽"
                  : "尚无可量化进度"
              }}
            </p>
            <p v-if="task.error" class="task-error">
              <i class="material-icons" aria-hidden="true">error_outline</i>
              {{ task.error }}
            </p>
          </div>

          <div class="task-card-actions">
            <button
              v-if="canCancel(task.status)"
              type="button"
              :disabled="busyIds.has(task.id)"
              @click="cancelTask(task)"
            >
              <i class="material-icons" aria-hidden="true">stop_circle</i>
              {{ busyIds.has(task.id) ? "正在提交…" : "取消" }}
            </button>
            <button
              v-if="canRetry(task.status)"
              type="button"
              class="primary"
              :disabled="busyIds.has(task.id)"
              @click="retryTask(task)"
            >
              <i class="material-icons" aria-hidden="true">replay</i>
              {{ busyIds.has(task.id) ? "正在提交…" : "重试" }}
            </button>
            <router-link
              v-if="
                task.status === 'completed' &&
                task.type === 'analysis.duplicates'
              "
              class="primary"
              :to="{ path: '/analysis', query: { task: task.id } }"
            >
              <i class="material-icons" aria-hidden="true">fact_check</i>
              查看结果
            </router-link>
            <router-link
              v-if="
                task.status === 'completed' && task.type === 'analysis.storage'
              "
              class="primary"
              :to="{
                path: '/analysis',
                query: { tool: 'storage', task: task.id },
              }"
            >
              <i class="material-icons" aria-hidden="true">donut_large</i>
              查看结果
            </router-link>
            <router-link
              v-if="
                task.status === 'completed' && task.type === 'archive.extract'
              "
              class="primary"
              :to="{ path: '/archive', query: { task: task.id } }"
            >
              <i class="material-icons" aria-hidden="true">folder_zip</i>
              查看结果
            </router-link>
            <span
              v-if="
                !canCancel(task.status) &&
                !canRetry(task.status) &&
                !(
                  task.status === 'completed' &&
                  task.type === 'analysis.duplicates'
                ) &&
                !(
                  task.status === 'completed' &&
                  task.type === 'analysis.storage'
                ) &&
                !(
                  task.status === 'completed' && task.type === 'archive.extract'
                )
              "
              class="task-finished"
            >
              <i class="material-icons" aria-hidden="true">check</i>
              已结束
            </span>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, reactive, ref } from "vue";
import dayjs from "dayjs";
import HeaderBar from "@/components/header/HeaderBar.vue";
import type { TaskItem, TaskStatus } from "@/api/tasks";
import { useAuthStore } from "@/stores/auth";
import { useTasksStore } from "@/stores/tasks";

type TaskFilter = "all" | "active" | "attention" | "completed";

const authStore = useAuthStore();
const tasksStore = useTasksStore();
const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<IToastSuccess>("$showSuccess")!;
const activeFilter = ref<TaskFilter>("all");
const busyIds = reactive(new Set<string>());
let pollingTimer: number | undefined;

const visibleTasks = computed(() =>
  tasksStore.items.filter((task) => {
    if (activeFilter.value === "active") return canCancel(task.status);
    if (activeFilter.value === "attention") return canRetry(task.status);
    if (activeFilter.value === "completed") return task.status === "completed";
    return true;
  })
);

const filters = computed(() => [
  { id: "all" as const, label: "全部", count: tasksStore.items.length },
  {
    id: "active" as const,
    label: "进行中",
    count: tasksStore.activeItems.length,
  },
  {
    id: "attention" as const,
    label: "需处理",
    count: tasksStore.items.filter((task) => canRetry(task.status)).length,
  },
  {
    id: "completed" as const,
    label: "已完成",
    count: tasksStore.items.filter((task) => task.status === "completed")
      .length,
  },
]);

const summaryLabel = computed(() =>
  tasksStore.activeItems.length
    ? `${tasksStore.activeItems.length} 项进行中`
    : `${tasksStore.items.length} 项任务`
);

async function load(showError = true) {
  try {
    await tasksStore.load();
  } catch (error) {
    if (showError) $showError(error as Error, false);
  }
}

async function cancelTask(task: TaskItem) {
  if (busyIds.has(task.id)) return;
  busyIds.add(task.id);
  try {
    await tasksStore.cancel(task.id);
    $showSuccess("取消请求已提交");
  } catch (error) {
    $showError(error as Error, false);
  } finally {
    busyIds.delete(task.id);
  }
}

async function retryTask(task: TaskItem) {
  if (busyIds.has(task.id)) return;
  busyIds.add(task.id);
  try {
    await tasksStore.retry(task.id);
    activeFilter.value = "active";
    $showSuccess("重试任务已提交");
  } catch (error) {
    $showError(error as Error, false);
  } finally {
    busyIds.delete(task.id);
  }
}

function canCancel(status: TaskStatus) {
  return status === "queued" || status === "running";
}

function canRetry(status: TaskStatus) {
  return (
    status === "failed" || status === "canceled" || status === "interrupted"
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
  const labels: Record<TaskStatus, string> = {
    queued: "排队中",
    running: "正在执行",
    completed: "已完成",
    failed: "执行失败",
    canceled: "已取消",
    interrupted: "已中断",
  };
  return labels[status];
}

function taskIcon(status: TaskStatus) {
  const icons: Record<TaskStatus, string> = {
    queued: "hourglass_top",
    running: "sync",
    completed: "task_alt",
    failed: "error_outline",
    canceled: "cancel",
    interrupted: "power_settings_new",
  };
  return icons[status];
}

function taskTime(task: TaskItem) {
  const timestamp = task.finishedAt || task.startedAt || task.createdAt;
  return dayjs(timestamp).fromNow();
}

onMounted(() => {
  void load();
  pollingTimer = window.setInterval(() => void load(false), 2500);
});

onUnmounted(() => {
  if (pollingTimer !== undefined) window.clearInterval(pollingTimer);
});
</script>
