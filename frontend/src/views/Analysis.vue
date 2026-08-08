<template>
  <div id="analysis-page" class="analysis-page">
    <header-bar show-menu show-logo>
      <div class="analysis-header-title">
        <i class="material-icons" aria-hidden="true">data_usage</i>
        <div>
          <strong>存储工具</strong>
          <span>重复文件 · 主动扫描</span>
        </div>
      </div>
      <template #actions>
        <router-link class="analysis-header-action" to="/tasks">
          <i class="material-icons" aria-hidden="true">pending_actions</i>
          任务中心
        </router-link>
      </template>
    </header-bar>

    <main class="analysis-workspace">
      <section class="analysis-hero" aria-labelledby="analysis-title">
        <div class="analysis-hero-icon" aria-hidden="true">
          <i class="material-icons">content_copy</i>
        </div>
        <div>
          <p class="analysis-eyebrow">DUPLICATE FINDER</p>
          <h1 id="analysis-title">确认内容相同，而不只是名称相似</h1>
          <p>
            先按大小缩小范围，再比较文件首尾样本，最后使用完整 SHA-256
            确认。扫描只读，不会自动删除或修改任何文件。
          </p>
        </div>
        <span class="analysis-safety-badge">
          <i class="material-icons" aria-hidden="true">verified_user</i>
          全局并发 1
        </span>
      </section>

      <section class="analysis-scope-card" aria-labelledby="scope-title">
        <div class="analysis-section-title">
          <div>
            <span>01</span>
            <div>
              <h2 id="scope-title">选择扫描范围</h2>
              <p>支持文件或目录；父目录已包含的子路径会自动合并。</p>
            </div>
          </div>
          <small>{{ scopes.length }} / 32</small>
        </div>

        <form class="analysis-scope-input" @submit.prevent="addScope">
          <i class="material-icons" aria-hidden="true">folder_open</i>
          <input
            v-model="scopeInput"
            type="text"
            autocomplete="off"
            placeholder="例如 /照片/2026"
            aria-label="添加扫描路径"
          />
          <button type="submit" :disabled="!scopeInput.trim()">添加范围</button>
        </form>

        <div
          v-if="scopes.length"
          class="analysis-scope-list"
          aria-label="已选扫描范围"
        >
          <span v-for="scope in scopes" :key="scope">
            <i class="material-icons" aria-hidden="true">folder</i>
            <b :title="scope">{{ scope }}</b>
            <button
              type="button"
              :aria-label="`移除 ${scope}`"
              @click="removeScope(scope)"
            >
              <i class="material-icons" aria-hidden="true">close</i>
            </button>
          </span>
        </div>
        <div v-else class="analysis-scope-empty">
          <i class="material-icons" aria-hidden="true">touch_app</i>
          <span
            >尚未选择范围。可在文件列表中选中项目后点击“分析”，也可在此输入路径。</span
          >
        </div>

        <label v-if="includesRoot" class="analysis-root-confirm">
          <input v-model="rootConfirmed" type="checkbox" />
          <span>
            <strong>确认扫描整个可访问范围</strong>
            根目录可能唤醒更多磁盘并持续较长时间；你可以随时在任务中心取消。
          </span>
        </label>

        <div class="analysis-start-row">
          <p>
            <i class="material-icons" aria-hidden="true">info</i>
            不会后台定时扫描；每次都必须由你主动开始。
          </p>
          <button
            type="button"
            class="analysis-primary-action"
            :disabled="!canStart"
            @click="startScan"
          >
            <i class="material-icons" aria-hidden="true">manage_search</i>
            {{ starting ? "正在提交…" : "开始查找重复文件" }}
          </button>
        </div>
      </section>

      <section v-if="currentTask" class="analysis-task-card" aria-live="polite">
        <div class="analysis-task-icon" :class="`is-${currentTask.status}`">
          <i class="material-icons" aria-hidden="true">{{ taskIcon }}</i>
        </div>
        <div class="analysis-task-copy">
          <div>
            <strong>{{ currentTask.title }}</strong>
            <span>{{ taskStatusLabel }}</span>
          </div>
          <div v-if="currentTask.totalItems > 0" class="analysis-task-progress">
            <div :style="{ width: `${taskProgress}%` }"></div>
          </div>
          <small v-if="currentTask.totalItems > 0">
            已处理 {{ currentTask.processedItems }} /
            {{ currentTask.totalItems }} 个校验阶段
          </small>
          <small v-else-if="isTaskActive"
            >正在枚举范围或等待唯一分析工作槽</small
          >
          <small v-if="currentTask.error" class="analysis-task-error">{{
            currentTask.error
          }}</small>
        </div>
        <button
          v-if="isTaskActive"
          type="button"
          class="analysis-cancel-action"
          :disabled="canceling"
          @click="cancelScan"
        >
          {{ canceling ? "提交中…" : "取消扫描" }}
        </button>
        <router-link v-else-if="currentTask.status !== 'completed'" to="/tasks">
          查看任务
        </router-link>
      </section>

      <section v-if="loadError" class="analysis-error" role="alert">
        <i class="material-icons" aria-hidden="true">error_outline</i>
        <div>
          <strong>无法读取分析状态</strong>
          <p>{{ loadError }}</p>
        </div>
      </section>

      <template v-if="report">
        <section class="analysis-results-heading">
          <div>
            <span>02</span>
            <div>
              <h2>确认结果</h2>
              <p>{{ completedTime }} · {{ report.scopes.join("、") }}</p>
            </div>
          </div>
          <span class="analysis-readonly-chip">只读报告</span>
        </section>

        <section class="analysis-summary-grid" aria-label="重复文件分析摘要">
          <article>
            <small>已扫描文件</small>
            <strong>{{ report.scannedFiles.toLocaleString() }}</strong>
            <span>{{ formatBytes(report.scannedBytes) }}</span>
          </article>
          <article>
            <small>重复组</small>
            <strong>{{ report.duplicateGroups.toLocaleString() }}</strong>
            <span>{{ report.duplicateFiles.toLocaleString() }} 个文件</span>
          </article>
          <article class="analysis-summary-highlight">
            <small>可回收空间</small>
            <strong>{{ formatBytes(report.reclaimableBytes) }}</strong>
            <span>保留每组一份后的估算值</span>
          </article>
        </section>

        <section v-if="report.truncated" class="analysis-warning" role="status">
          <i class="material-icons" aria-hidden="true">warning_amber</i>
          结果文件超过
          {{ report.resultFileLimit.toLocaleString() }}
          项，当前仅展示前一部分；顶部统计仍为完整扫描结果。
        </section>

        <section
          v-if="report.groups.length"
          class="duplicate-groups"
          aria-label="重复文件组"
        >
          <article
            v-for="(group, index) in report.groups"
            :key="group.sha256"
            class="duplicate-group"
          >
            <header>
              <div>
                <span>{{ String(index + 1).padStart(2, "0") }}</span>
                <div>
                  <strong>{{ group.totalFiles }} 个完全相同的文件</strong>
                  <small
                    >{{ formatBytes(group.size) }} / 个 · 可回收
                    {{ formatBytes(group.reclaimableBytes) }}</small
                  >
                </div>
              </div>
              <code :title="group.sha256"
                >SHA-256 {{ group.sha256.slice(0, 12) }}…</code
              >
            </header>
            <div class="duplicate-file-list">
              <router-link
                v-for="file in group.files"
                :key="file.path"
                :to="fileRoute(file.path)"
              >
                <i class="material-icons" aria-hidden="true"
                  >insert_drive_file</i
                >
                <span>
                  <strong>{{ fileName(file.path) }}</strong>
                  <small :title="file.path">{{ file.path }}</small>
                </span>
                <time :datetime="new Date(file.modified).toISOString()">{{
                  formatModified(file.modified)
                }}</time>
                <i class="material-icons" aria-hidden="true">open_in_new</i>
              </router-link>
            </div>
          </article>
        </section>

        <section v-else class="analysis-clean-state">
          <i class="material-icons" aria-hidden="true">done_all</i>
          <h2>所选范围内没有确认的重复文件</h2>
          <p>同名或同大小并不会被误判；只有完整 SHA-256 相同才会进入结果。</p>
        </section>

        <details v-if="report.skippedCount" class="analysis-skipped">
          <summary>有 {{ report.skippedCount }} 个路径被安全跳过</summary>
          <p>符号链接、无权读取或扫描期间发生变化的文件不会进入重复结果。</p>
          <ul>
            <li v-for="item in report.skipped" :key="item.path">
              <span>{{ item.path }}</span>
              <small>{{ item.reason }}</small>
            </li>
          </ul>
        </details>
      </template>

      <section v-if="recentTasks.length" class="analysis-recent-tasks">
        <div class="analysis-section-title">
          <div>
            <span>03</span>
            <div>
              <h2>最近扫描</h2>
              <p>结果属于发起任务的用户；管理员任务中心可查看任务状态。</p>
            </div>
          </div>
        </div>
        <router-link
          v-for="task in recentTasks"
          :key="task.id"
          :to="{ path: '/analysis', query: { task: task.id } }"
        >
          <i class="material-icons" aria-hidden="true">{{
            task.status === "completed" ? "fact_check" : "pending_actions"
          }}</i>
          <span>
            <strong>{{ task.title }}</strong>
            <small
              >{{ taskStatus(task.status) }} ·
              {{ formatModified(task.createdAt) }}</small
            >
          </span>
          <i class="material-icons" aria-hidden="true">chevron_right</i>
        </router-link>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import HeaderBar from "@/components/header/HeaderBar.vue";
import * as analysisApi from "@/api/analysis";
import * as taskApi from "@/api/tasks";
import type { DuplicateReport } from "@/api/analysis";
import type { TaskItem, TaskStatus } from "@/api/tasks";
import { useTasksStore } from "@/stores/tasks";
import {
  addAnalysisScope,
  analysisScopesFromQuery,
} from "@/utils/analysisScopes";
import { encodePath } from "@/utils/url";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";

const route = useRoute();
const router = useRouter();
const tasksStore = useTasksStore();
const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<IToastSuccess>("$showSuccess")!;

const scopeInput = ref("");
const scopes = ref(analysisScopesFromQuery(route.query.paths));
const rootConfirmed = ref(false);
const starting = ref(false);
const canceling = ref(false);
const currentTask = ref<TaskItem | null>(null);
const report = ref<DuplicateReport | null>(null);
const loadError = ref("");
let pollTimer: number | undefined;
let disposed = false;
let taskLoadSequence = 0;

const includesRoot = computed(() => scopes.value.includes("/"));
const isTaskActive = computed(
  () =>
    currentTask.value?.status === "queued" ||
    currentTask.value?.status === "running"
);
const canStart = computed(
  () =>
    scopes.value.length > 0 &&
    (!includesRoot.value || rootConfirmed.value) &&
    !starting.value &&
    !isTaskActive.value
);
const taskProgress = computed(() => {
  const task = currentTask.value;
  if (!task || task.totalItems <= 0) return 0;
  return Math.min(
    100,
    Math.round((task.processedItems / task.totalItems) * 100)
  );
});
const taskStatusLabel = computed(() =>
  currentTask.value ? taskStatus(currentTask.value.status) : ""
);
const taskIcon = computed(() => {
  const icons: Record<TaskStatus, string> = {
    queued: "hourglass_top",
    running: "sync",
    completed: "task_alt",
    failed: "error_outline",
    canceled: "cancel",
    interrupted: "power_settings_new",
  };
  return currentTask.value ? icons[currentTask.value.status] : "pending";
});
const recentTasks = computed(() =>
  tasksStore.items
    .filter((task) => task.type === "analysis.duplicates")
    .slice(0, 5)
);
const completedTime = computed(() =>
  report.value ? dayjs(report.value.completedAt).format("YYYY-MM-DD HH:mm") : ""
);

watch(includesRoot, (value) => {
  if (!value) rootConfirmed.value = false;
});

watch(
  () => route.query.task,
  (value) => {
    const taskId = typeof value === "string" ? value : "";
    if (!taskId || taskId === currentTask.value?.id) return;
    void loadTask(taskId);
  }
);

function addScope() {
  const next = addAnalysisScope(scopes.value, scopeInput.value);
  if (
    next.length === scopes.value.length &&
    next.every((item, index) => item === scopes.value[index])
  ) {
    scopeInput.value = "";
    return;
  }
  scopes.value = next;
  scopeInput.value = "";
}

function removeScope(scope: string) {
  scopes.value = scopes.value.filter((item) => item !== scope);
}

async function startScan() {
  if (!canStart.value) return;
  starting.value = true;
  loadError.value = "";
  report.value = null;
  try {
    const task = await analysisApi.startDuplicateScan(scopes.value);
    currentTask.value = task;
    tasksStore.record(task);
    await router.replace({
      path: "/analysis",
      query: { task: task.id, paths: scopes.value },
    });
    $showSuccess("重复文件扫描已提交，可在任务中心取消");
    schedulePoll(0);
  } catch (error) {
    $showError(error instanceof Error ? error : String(error), false);
  } finally {
    starting.value = false;
  }
}

async function cancelScan() {
  if (!currentTask.value || canceling.value) return;
  canceling.value = true;
  try {
    currentTask.value = await tasksStore.cancel(currentTask.value.id);
    stopPolling();
    $showSuccess("取消请求已提交");
  } catch (error) {
    $showError(error instanceof Error ? error : String(error), false);
  } finally {
    canceling.value = false;
  }
}

function schedulePoll(delay = 750) {
  stopPolling();
  if (disposed || !currentTask.value) return;
  pollTimer = window.setTimeout(pollTask, delay);
}

function stopPolling() {
  if (pollTimer !== undefined) window.clearTimeout(pollTimer);
  pollTimer = undefined;
}

async function pollTask() {
  const id = currentTask.value?.id;
  if (!id || disposed) return;
  try {
    const task = await taskApi.get(id);
    currentTask.value = task;
    tasksStore.record(task);
    if (task.status === "queued" || task.status === "running") {
      schedulePoll();
      return;
    }
    if (task.status === "completed") await loadReport(task.id);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
    schedulePoll(1500);
  }
}

async function loadReport(taskId: string) {
  try {
    report.value = await analysisApi.getDuplicateReport(taskId);
    scopes.value = [...report.value.scopes];
    loadError.value = "";
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  }
}

async function loadTask(taskId: string) {
  const sequence = ++taskLoadSequence;
  stopPolling();
  currentTask.value = null;
  report.value = null;
  loadError.value = "";

  try {
    const task = await taskApi.get(taskId);
    if (sequence !== taskLoadSequence || disposed) return;
    if (task.type !== "analysis.duplicates") {
      loadError.value = "该任务不是重复文件分析任务。";
      return;
    }
    currentTask.value = task;
    tasksStore.record(task);
    if (task.status === "completed") await loadReport(task.id);
    else if (task.status === "queued" || task.status === "running") {
      schedulePoll(0);
    }
  } catch (error) {
    if (sequence !== taskLoadSequence || disposed) return;
    loadError.value = error instanceof Error ? error.message : String(error);
  }
}

async function loadInitial() {
  try {
    await tasksStore.load();
    const taskId = typeof route.query.task === "string" ? route.query.task : "";
    if (!taskId) return;
    await loadTask(taskId);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  }
}

function taskStatus(status: TaskStatus) {
  const labels: Record<TaskStatus, string> = {
    queued: "排队中",
    running: "正在扫描",
    completed: "已完成",
    failed: "扫描失败",
    canceled: "已取消",
    interrupted: "已中断",
  };
  return labels[status];
}

function fileRoute(path: string) {
  return `/files${encodePath(path)}`;
}

function fileName(path: string) {
  return path.split("/").at(-1) || path;
}

function formatBytes(value: number) {
  return filesize(value || 0);
}

function formatModified(value: number) {
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

onMounted(loadInitial);
onBeforeUnmount(() => {
  disposed = true;
  stopPolling();
});
</script>

<style scoped>
.analysis-page {
  min-height: 100vh;
  color: var(--textSecondary);
  background: var(--background);
}

.analysis-header-title,
.analysis-header-title > div {
  display: flex;
  min-width: 0;
}

.analysis-header-title {
  align-items: center;
  gap: 10px;
}

.analysis-header-title > div {
  flex-direction: column;
  gap: 1px;
}

.analysis-header-title > .material-icons {
  color: var(--blue);
  font-size: 25px;
}

.analysis-header-title strong {
  font-size: 15px;
}

.analysis-header-title span {
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-header-action {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 8px;
  color: var(--textSecondary);
  font-size: 13px;
  text-decoration: none;
}

.analysis-header-action:hover,
.analysis-header-action:focus-visible {
  outline: none;
  background: var(--hover);
}

.analysis-header-action:focus-visible {
  box-shadow: inset 0 0 0 2px var(--focus-ring);
}

.analysis-workspace {
  box-sizing: border-box;
  width: min(1120px, calc(100% - 32px));
  margin: 0 auto;
  padding: 18px 0 56px;
}

.analysis-hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  padding: 22px;
  border: 1px solid var(--borderPrimary);
  border-radius: 16px;
  background: var(--surfacePrimary);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}

.analysis-hero-icon {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 15px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 11%, transparent);
}

.analysis-hero-icon .material-icons {
  font-size: 29px;
}

.analysis-eyebrow {
  margin: 0 0 5px;
  color: var(--blue);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.14em;
}

.analysis-hero h1 {
  margin: 0;
  color: var(--textSecondary);
  font-size: 20px;
  line-height: 1.3;
}

.analysis-hero p:last-child {
  max-width: 720px;
  margin: 7px 0 0;
  color: var(--textPrimary);
  font-size: 12px;
  line-height: 1.7;
}

.analysis-safety-badge,
.analysis-readonly-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 999px;
  color: #16845d;
  background: color-mix(in srgb, #1ea672 11%, transparent);
  font-size: 11px;
  font-weight: 700;
}

.analysis-safety-badge {
  padding: 7px 10px;
}

.analysis-safety-badge .material-icons {
  font-size: 16px;
}

.analysis-scope-card,
.analysis-task-card,
.analysis-error,
.analysis-recent-tasks {
  margin-top: 14px;
  border: 1px solid var(--borderPrimary);
  border-radius: 14px;
  background: var(--surfacePrimary);
}

.analysis-scope-card {
  padding: 18px;
}

.analysis-section-title,
.analysis-section-title > div,
.analysis-results-heading,
.analysis-results-heading > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.analysis-section-title > div,
.analysis-results-heading > div {
  justify-content: flex-start;
}

.analysis-section-title > div > span,
.analysis-results-heading > div > span {
  display: grid;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 8px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 9%, transparent);
  font-size: 10px;
  font-weight: 800;
}

.analysis-section-title h2,
.analysis-results-heading h2 {
  margin: 0;
  color: var(--textSecondary);
  font-size: 15px;
}

.analysis-section-title p,
.analysis-results-heading p {
  margin: 3px 0 0;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-section-title > small {
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-scope-input {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  margin-top: 14px;
  padding: 5px 5px 5px 11px;
  border: 1px solid var(--borderPrimary);
  border-radius: 10px;
  background: var(--surfaceSecondary);
}

.analysis-scope-input > .material-icons {
  color: var(--textPrimary);
  font-size: 19px;
}

.analysis-scope-input input {
  min-width: 0;
  min-height: 38px;
  border: 0;
  outline: 0;
  color: var(--textSecondary);
  background: transparent;
}

.analysis-scope-input button,
.analysis-primary-action,
.analysis-cancel-action {
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

.analysis-scope-input button {
  min-height: 38px;
  padding: 0 14px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 10%, var(--surfacePrimary));
}

.analysis-scope-input button:disabled,
.analysis-primary-action:disabled,
.analysis-cancel-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.analysis-scope-list {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 11px;
}

.analysis-scope-list > span {
  display: inline-grid;
  grid-template-columns: auto minmax(0, auto) auto;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 34px;
  padding: 0 5px 0 9px;
  border: 1px solid color-mix(in srgb, var(--blue) 20%, var(--borderPrimary));
  border-radius: 8px;
  color: var(--textSecondary);
  background: color-mix(in srgb, var(--blue) 4%, var(--surfacePrimary));
  font-size: 11px;
}

.analysis-scope-list > span > .material-icons {
  color: var(--blue);
  font-size: 16px;
}

.analysis-scope-list b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-scope-list button {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 6px;
  color: var(--textPrimary);
  background: transparent;
  cursor: pointer;
}

.analysis-scope-list button:hover {
  color: var(--red);
  background: var(--hover);
}

.analysis-scope-list button .material-icons {
  font-size: 16px;
}

.analysis-scope-empty {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 11px;
  padding: 10px 12px;
  border: 1px dashed var(--borderPrimary);
  border-radius: 9px;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-scope-empty .material-icons {
  font-size: 18px;
}

.analysis-root-confirm {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 12px;
  padding: 11px 12px;
  border: 1px solid
    color-mix(in srgb, var(--icon-orange) 28%, var(--borderPrimary));
  border-radius: 9px;
  background: color-mix(in srgb, var(--icon-orange) 6%, transparent);
  font-size: 11px;
  line-height: 1.5;
}

.analysis-root-confirm input {
  width: 17px;
  height: 17px;
  margin-top: 2px;
}

.analysis-root-confirm span {
  display: grid;
  gap: 2px;
}

.analysis-root-confirm strong {
  color: var(--textSecondary);
}

.analysis-start-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
}

.analysis-start-row p {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-start-row p .material-icons {
  font-size: 16px;
}

.analysis-primary-action {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  color: white;
  background: var(--blue);
  box-shadow: 0 5px 14px color-mix(in srgb, var(--blue) 24%, transparent);
}

.analysis-primary-action .material-icons {
  font-size: 19px;
}

.analysis-task-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 13px;
  padding: 14px 16px;
}

.analysis-task-icon {
  display: grid;
  width: 42px;
  height: 42px;
  place-items: center;
  border-radius: 11px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 10%, transparent);
}

.analysis-task-icon.is-running .material-icons {
  animation: analysis-spin 1.4s linear infinite;
}

.analysis-task-icon.is-completed {
  color: #16845d;
  background: color-mix(in srgb, #1ea672 10%, transparent);
}

.analysis-task-icon.is-failed,
.analysis-task-icon.is-canceled,
.analysis-task-icon.is-interrupted {
  color: var(--red);
  background: color-mix(in srgb, var(--red) 8%, transparent);
}

.analysis-task-copy,
.analysis-task-copy > div:first-child {
  display: grid;
  min-width: 0;
  gap: 3px;
}

.analysis-task-copy strong {
  color: var(--textSecondary);
  font-size: 13px;
}

.analysis-task-copy span,
.analysis-task-copy small {
  color: var(--textPrimary);
  font-size: 10px;
}

.analysis-task-error {
  color: var(--red) !important;
}

.analysis-task-progress {
  height: 5px;
  margin: 5px 0 2px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surfaceSecondary);
}

.analysis-task-progress > div {
  height: 100%;
  border-radius: inherit;
  background: var(--blue);
  transition: width 180ms ease;
}

.analysis-cancel-action,
.analysis-task-card > a {
  min-height: 36px;
  padding: 0 12px;
  color: var(--textSecondary);
  background: var(--surfaceSecondary);
  font-size: 11px;
}

.analysis-task-card > a {
  display: inline-flex;
  align-items: center;
  border-radius: 8px;
  text-decoration: none;
}

.analysis-error,
.analysis-warning {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 13px 15px;
}

.analysis-error {
  color: var(--red);
}

.analysis-error strong,
.analysis-error p {
  margin: 0;
}

.analysis-error p {
  margin-top: 3px;
  font-size: 11px;
}

.analysis-results-heading {
  margin-top: 22px;
}

.analysis-readonly-chip {
  padding: 6px 9px;
}

.analysis-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-top: 12px;
}

.analysis-summary-grid article {
  display: grid;
  gap: 4px;
  padding: 16px;
  border: 1px solid var(--borderPrimary);
  border-radius: 12px;
  background: var(--surfacePrimary);
}

.analysis-summary-grid small,
.analysis-summary-grid span {
  color: var(--textPrimary);
  font-size: 10px;
}

.analysis-summary-grid strong {
  color: var(--textSecondary);
  font-size: 22px;
  letter-spacing: -0.03em;
}

.analysis-summary-grid .analysis-summary-highlight {
  border-color: color-mix(in srgb, #1ea672 24%, var(--borderPrimary));
  background: color-mix(in srgb, #1ea672 5%, var(--surfacePrimary));
}

.analysis-summary-highlight strong {
  color: #16845d;
}

.analysis-warning {
  margin-top: 10px;
  border: 1px solid
    color-mix(in srgb, var(--icon-orange) 26%, var(--borderPrimary));
  border-radius: 10px;
  color: var(--textSecondary);
  background: color-mix(in srgb, var(--icon-orange) 6%, transparent);
  font-size: 11px;
  line-height: 1.5;
}

.duplicate-groups {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.duplicate-group {
  overflow: hidden;
  border: 1px solid var(--borderPrimary);
  border-radius: 13px;
  background: var(--surfacePrimary);
}

.duplicate-group > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 15px;
  border-bottom: 1px solid var(--borderPrimary);
  background: var(--surfaceSecondary);
}

.duplicate-group > header > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.duplicate-group > header > div > span {
  color: var(--blue);
  font-size: 11px;
  font-weight: 800;
}

.duplicate-group header strong,
.duplicate-group header small {
  display: block;
}

.duplicate-group header strong {
  color: var(--textSecondary);
  font-size: 12px;
}

.duplicate-group header small {
  margin-top: 3px;
  color: var(--textPrimary);
  font-size: 10px;
}

.duplicate-group code {
  max-width: 180px;
  overflow: hidden;
  color: var(--textPrimary);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duplicate-file-list > a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 6px 14px;
  border-bottom: 1px solid var(--borderPrimary);
  color: var(--textSecondary);
  text-decoration: none;
}

.duplicate-file-list > a:last-child {
  border-bottom: 0;
}

.duplicate-file-list > a:hover,
.duplicate-file-list > a:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--blue) 4%, var(--surfacePrimary));
}

.duplicate-file-list > a:focus-visible {
  box-shadow: inset 3px 0 var(--focus-ring);
}

.duplicate-file-list > a > .material-icons:first-child {
  color: var(--textPrimary);
  font-size: 20px;
}

.duplicate-file-list > a > .material-icons:last-child {
  color: var(--textPrimary);
  font-size: 17px;
}

.duplicate-file-list span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.duplicate-file-list strong,
.duplicate-file-list small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duplicate-file-list strong {
  font-size: 11px;
}

.duplicate-file-list small,
.duplicate-file-list time {
  color: var(--textPrimary);
  font-size: 9px;
}

.analysis-clean-state {
  display: grid;
  justify-items: center;
  margin-top: 12px;
  padding: 38px 20px;
  border: 1px solid var(--borderPrimary);
  border-radius: 14px;
  background: var(--surfacePrimary);
  text-align: center;
}

.analysis-clean-state > .material-icons {
  color: #16845d;
  font-size: 34px;
}

.analysis-clean-state h2 {
  margin: 10px 0 0;
  color: var(--textSecondary);
  font-size: 15px;
}

.analysis-clean-state p {
  margin: 6px 0 0;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-skipped {
  margin-top: 10px;
  padding: 11px 13px;
  border: 1px solid var(--borderPrimary);
  border-radius: 10px;
  background: var(--surfacePrimary);
  font-size: 11px;
}

.analysis-skipped summary {
  color: var(--textSecondary);
  cursor: pointer;
  font-weight: 700;
}

.analysis-skipped p {
  color: var(--textPrimary);
}

.analysis-skipped ul {
  display: grid;
  gap: 5px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.analysis-skipped li {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding-top: 5px;
  border-top: 1px solid var(--borderPrimary);
}

.analysis-skipped li small {
  color: var(--textPrimary);
}

.analysis-recent-tasks {
  padding: 16px;
}

.analysis-recent-tasks > a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 50px;
  margin-top: 8px;
  padding: 0 10px;
  border-radius: 9px;
  color: var(--textSecondary);
  background: var(--surfaceSecondary);
  text-decoration: none;
}

.analysis-recent-tasks > a:hover {
  background: var(--hover);
}

.analysis-recent-tasks > a > .material-icons {
  color: var(--blue);
  font-size: 19px;
}

.analysis-recent-tasks > a > .material-icons:last-child {
  color: var(--textPrimary);
}

.analysis-recent-tasks > a span {
  display: grid;
  gap: 2px;
}

.analysis-recent-tasks > a strong {
  font-size: 11px;
}

.analysis-recent-tasks > a small {
  color: var(--textPrimary);
  font-size: 9px;
}

@keyframes analysis-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .analysis-workspace {
    width: min(100% - 20px, 1120px);
    padding-top: 12px;
  }

  .analysis-hero {
    grid-template-columns: auto minmax(0, 1fr);
    padding: 16px;
  }

  .analysis-safety-badge {
    grid-column: 2;
    justify-self: start;
  }

  .analysis-summary-grid {
    grid-template-columns: 1fr;
  }

  .analysis-start-row {
    align-items: stretch;
    flex-direction: column;
  }

  .analysis-primary-action {
    width: 100%;
  }

  .analysis-task-card {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .analysis-task-card > button,
  .analysis-task-card > a {
    grid-column: 2;
    justify-self: start;
  }
}

@media (max-width: 520px) {
  .analysis-header-action {
    width: 42px;
    justify-content: center;
    padding: 0;
    font-size: 0;
  }

  .analysis-hero-icon {
    width: 48px;
    height: 48px;
  }

  .analysis-hero h1 {
    font-size: 16px;
  }

  .analysis-scope-card {
    padding: 14px;
  }

  .analysis-scope-input {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .analysis-scope-input button {
    grid-column: 1 / -1;
  }

  .analysis-results-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .duplicate-group > header {
    align-items: flex-start;
    flex-direction: column;
  }

  .duplicate-file-list > a {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .duplicate-file-list time {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-task-icon.is-running .material-icons {
    animation: none;
  }

  .analysis-task-progress > div {
    transition: none;
  }
}
</style>
