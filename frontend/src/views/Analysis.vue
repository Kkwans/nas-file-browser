<template>
  <div id="analysis-page" class="analysis-page">
    <header-bar show-menu show-logo>
      <div class="analysis-header-title">
        <AppIcon name="chart-storage" :size="23" />
        <div>
          <strong>存储工具</strong>
          <span>主动、只读、低并发</span>
        </div>
      </div>
      <template #actions>
        <router-link class="analysis-header-action" :to="taskReturnRoute">
          <AppIcon :name="taskReturnId ? 'arrow-left' : 'tasks'" :size="19" />
          {{ taskReturnId ? "返回原任务" : "任务中心" }}
        </router-link>
      </template>
    </header-bar>

    <main class="analysis-workspace">
      <AnalysisToolSwitcher :active-tool="activeTool" @select="selectTool" />

      <AnalysisScopePanel
        v-model:scope-input="scopeInput"
        v-model:root-confirmed="rootConfirmed"
        :tool="activeTool"
        :scopes="scopes"
        :includes-root="includesRoot"
        :can-start="canStart"
        :starting="starting"
        @add="addScope"
        @remove="removeScope"
        @start="startScan"
      />

      <section
        v-if="currentTask && !report && !storageReport"
        class="analysis-task-card"
        aria-live="polite"
      >
        <div class="analysis-task-icon" :class="`is-${currentTask.status}`">
          <AppIcon :name="taskIcon" :size="23" />
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
            {{ currentTask.totalItems }}
            {{ activeTool === "duplicates" ? "个校验阶段" : "个文件或目录" }}
          </small>
          <small v-else-if="isTaskActive">
            <template v-if="currentTask.processedItems > 0">
              已枚举 {{ currentTask.processedItems.toLocaleString() }} 项 ·
              {{ formatBytes(currentTask.processedBytes) }}
            </template>
            <template v-else>正在枚举范围或等待唯一分析工作槽</template>
          </small>
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
        <AppIcon name="circle-alert" :size="23" />
        <div>
          <strong>无法读取分析状态</strong>
          <p>{{ loadError }}</p>
        </div>
      </section>

      <template v-if="report && activeTool === 'duplicates'">
        <section class="analysis-results-heading">
          <div>
            <span>03</span>
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
          <AppIcon name="circle-alert" :size="19" />
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
                <AppIcon :name="resourceIcon(file.path)" :size="19" />
                <span>
                  <strong>{{ fileName(file.path) }}</strong>
                  <small :title="file.path">{{ file.path }}</small>
                </span>
                <time :datetime="new Date(file.modified).toISOString()">{{
                  formatModified(file.modified)
                }}</time>
                <AppIcon name="external-link" :size="17" />
              </router-link>
            </div>
          </article>
        </section>

        <section v-else class="analysis-clean-state">
          <AppIcon name="circle-check" :size="34" />
          <div class="analysis-clean-state__copy">
            <h2>所选范围内没有确认的重复文件</h2>
            <p>同名或同大小并不会被误判；只有完整 SHA-256 相同才会进入结果。</p>
          </div>
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

      <template v-if="storageReport && activeTool === 'storage'">
        <section class="analysis-results-heading">
          <div>
            <span>03</span>
            <div>
              <h2>空间分布</h2>
              <p>
                {{ completedTime }} ·
                {{ storageReport.scopes.map((scope) => scope.path).join("、") }}
              </p>
            </div>
          </div>
          <span class="analysis-readonly-chip">实时只读报告</span>
        </section>

        <section class="analysis-summary-grid" aria-label="存储空间分析摘要">
          <article>
            <small>已扫描文件</small>
            <strong>{{ storageReport.scannedFiles.toLocaleString() }}</strong>
            <span
              >{{
                storageReport.scannedDirectories.toLocaleString()
              }}
              个目录</span
            >
          </article>
          <article class="analysis-summary-highlight">
            <small>所选范围占用</small>
            <strong>{{ formatBytes(storageReport.scannedBytes) }}</strong>
            <span>基于本次元数据扫描</span>
          </article>
          <article>
            <small>统计时间</small>
            <strong class="analysis-summary-time">{{ completedTime }}</strong>
            <span>未使用旧缓存</span>
          </article>
        </section>

        <section
          v-if="storageReport.scopes.length > 1"
          class="storage-scope-grid"
          aria-label="各扫描范围占用"
        >
          <article v-for="scope in storageReport.scopes" :key="scope.path">
            <AppIcon :name="resourceIcon(scope.path, scope.isDir)" :size="20" />
            <span>
              <strong :title="scope.path">{{ scope.path }}</strong>
              <small>
                {{ scope.files.toLocaleString() }} 个文件 ·
                {{ formatBytes(scope.bytes) }}
              </small>
            </span>
          </article>
        </section>

        <section
          v-if="storageReport.truncated"
          class="analysis-warning"
          role="status"
        >
          <AppIcon name="circle-alert" :size="19" />
          排行榜各最多展示
          {{ storageReport.resultLimit.toLocaleString() }}
          项；顶部总量仍为完整扫描结果。
        </section>

        <section class="storage-rankings" aria-label="存储占用排行">
          <article>
            <header>
              <span>目录大小</span>
              <small>包含全部后代文件</small>
            </header>
            <div v-if="storageReport.largestDirectories.length">
              <router-link
                v-for="(directory, index) in storageReport.largestDirectories"
                :key="directory.path"
                :to="fileRoute(directory.path, true)"
              >
                <b>{{ String(index + 1).padStart(2, "0") }}</b>
                <AppIcon name="folder" :size="19" />
                <span>
                  <strong>{{ fileName(directory.path) }}</strong>
                  <small :title="directory.path">{{ directory.path }}</small>
                  <em>
                    <i
                      :style="{
                        width: storageBarWidth(
                          directory.bytes,
                          maxDirectoryBytes
                        ),
                      }"
                    ></i>
                  </em>
                </span>
                <span class="storage-rank-value">
                  <strong>{{ formatBytes(directory.bytes) }}</strong>
                  <small>{{ directory.files.toLocaleString() }} 个文件</small>
                </span>
              </router-link>
            </div>
            <p v-else class="storage-rank-empty">所选范围内没有目录。</p>
          </article>

          <article>
            <header>
              <span>大文件</span>
              <small>按实际文件大小排序</small>
            </header>
            <div v-if="storageReport.largestFiles.length">
              <router-link
                v-for="(file, index) in storageReport.largestFiles"
                :key="file.path"
                :to="fileRoute(file.path, false)"
              >
                <b>{{ String(index + 1).padStart(2, "0") }}</b>
                <AppIcon :name="resourceIcon(file.path)" :size="19" />
                <span>
                  <strong>{{ fileName(file.path) }}</strong>
                  <small :title="file.path">{{ file.path }}</small>
                  <em>
                    <i
                      :style="{
                        width: storageBarWidth(file.size, maxFileBytes),
                      }"
                    ></i>
                  </em>
                </span>
                <span class="storage-rank-value">
                  <strong>{{ formatBytes(file.size) }}</strong>
                  <small>{{ formatModified(file.modified) }}</small>
                </span>
              </router-link>
            </div>
            <p v-else class="storage-rank-empty">所选范围内没有普通文件。</p>
          </article>
        </section>

        <details v-if="storageReport.skippedCount" class="analysis-skipped">
          <summary>
            有 {{ storageReport.skippedCount }} 个路径被安全跳过
          </summary>
          <p>符号链接、特殊文件或无权读取的路径不计入空间统计。</p>
          <ul>
            <li v-for="item in storageReport.skipped" :key="item.path">
              <span>{{ item.path }}</span>
              <small>{{ item.reason }}</small>
            </li>
          </ul>
        </details>
      </template>

      <AnalysisRecentScans
        :tool="activeTool"
        :items="recentScans"
        :loading="recentLoading"
        :error="recentError"
        @retry="loadRecent(activeTool)"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AnalysisRecentScans from "@/components/analysis/AnalysisRecentScans.vue";
import AnalysisScopePanel from "@/components/analysis/AnalysisScopePanel.vue";
import AnalysisToolSwitcher from "@/components/analysis/AnalysisToolSwitcher.vue";
import HeaderBar from "@/components/header/HeaderBar.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import type { AppIconName } from "@/components/ui/iconRegistry";
import * as analysisApi from "@/api/analysis";
import * as taskApi from "@/api/tasks";
import type {
  AnalysisRecentItem,
  DuplicateReport,
  StorageReport,
} from "@/api/analysis";
import type { TaskItem, TaskStatus } from "@/api/tasks";
import { useTasksStore } from "@/stores/tasks";
import {
  addAnalysisScope,
  analysisScopesFromQuery,
} from "@/utils/analysisScopes";
import { encodePath } from "@/utils/url";
import { resourceOpenRoute } from "@/utils/archivePath";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";
import type { AnalysisTool } from "@/utils/analysisTools";
import { getResourceIconName } from "@/utils/fileIcons";

const route = useRoute();
const router = useRouter();
const tasksStore = useTasksStore();
const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<IToastSuccess>("$showSuccess")!;

const scopeInput = ref("");
const scopes = ref(analysisScopesFromQuery(route.query.paths));
const activeTool = ref<AnalysisTool>(toolFromRoute());
const rootConfirmed = ref(false);
const starting = ref(false);
const canceling = ref(false);
const currentTask = ref<TaskItem | null>(null);
const report = ref<DuplicateReport | null>(null);
const storageReport = ref<StorageReport | null>(null);
const loadError = ref("");
const recentScans = ref<AnalysisRecentItem[]>([]);
const recentLoading = ref(false);
const recentError = ref("");
let pollTimer: number | undefined;
let disposed = false;
let taskLoadSequence = 0;
let recentLoadSequence = 0;

const taskReturnId = computed(() =>
  route.query.from === "tasks" && typeof route.query.returnTask === "string"
    ? route.query.returnTask
    : ""
);
const taskReturnRoute = computed(() => ({
  path: "/tasks",
  query: taskReturnId.value ? { returnTask: taskReturnId.value } : undefined,
}));

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
const taskIcon = computed<AppIconName>(() => {
  const icons: Record<TaskStatus, AppIconName> = {
    queued: "hourglass",
    running: "loader",
    completed: "circle-check",
    failed: "circle-alert",
    canceled: "circle-stop",
    interrupted: "retry",
  };
  return currentTask.value ? icons[currentTask.value.status] : "hourglass";
});
const completedTime = computed(() => {
  const completedAt =
    activeTool.value === "storage"
      ? storageReport.value?.completedAt
      : report.value?.completedAt;
  return completedAt ? dayjs(completedAt).format("YYYY-MM-DD HH:mm") : "";
});
const maxDirectoryBytes = computed(
  () => storageReport.value?.largestDirectories[0]?.bytes ?? 0
);
const maxFileBytes = computed(
  () => storageReport.value?.largestFiles[0]?.size ?? 0
);

watch(includesRoot, (value) => {
  if (!value) rootConfirmed.value = false;
});

watch(
  () => [route.query.tool, route.query.task],
  ([, taskValue]) => {
    const taskId = typeof taskValue === "string" ? taskValue : "";
    if (taskId) {
      if (taskId !== currentTask.value?.id) void loadTask(taskId);
      return;
    }
    taskLoadSequence++;
    stopPolling();
    currentTask.value = null;
    report.value = null;
    storageReport.value = null;
    loadError.value = "";
    activeTool.value = toolFromRoute();
    scopes.value = analysisScopesFromQuery(route.query.paths);
    void loadRecent(activeTool.value);
  }
);

function selectTool(tool: AnalysisTool) {
  if (tool === activeTool.value) return;
  activeTool.value = tool;
  taskLoadSequence++;
  stopPolling();
  currentTask.value = null;
  report.value = null;
  storageReport.value = null;
  loadError.value = "";
  void router.push({
    path: "/analysis",
    query: { tool, paths: scopes.value },
  });
}

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
  const tool = activeTool.value;
  starting.value = true;
  loadError.value = "";
  report.value = null;
  storageReport.value = null;
  try {
    const task =
      tool === "storage"
        ? await analysisApi.startStorageScan(scopes.value)
        : await analysisApi.startDuplicateScan(scopes.value);
    currentTask.value = task;
    tasksStore.record(task);
    void loadRecent(tool);
    await router.replace({
      path: "/analysis",
      query: { tool, task: task.id, paths: scopes.value },
    });
    $showSuccess(
      tool === "storage"
        ? "存储空间分析已提交，可在任务中心取消"
        : "重复文件扫描已提交，可在任务中心取消"
    );
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
    void loadRecent(activeTool.value);
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
    if (disposed || currentTask.value?.id !== id) return;
    currentTask.value = task;
    tasksStore.record(task);
    if (task.status === "queued" || task.status === "running") {
      schedulePoll();
      return;
    }
    if (task.status === "completed") await loadReport(task.id);
    await loadRecent(activeTool.value);
  } catch (error) {
    if (disposed || currentTask.value?.id !== id) return;
    loadError.value = error instanceof Error ? error.message : String(error);
    schedulePoll(1500);
  }
}

async function loadReport(taskId: string) {
  const taskType = currentTask.value?.type;
  try {
    if (taskType === "analysis.storage") {
      const next = await analysisApi.getStorageReport(taskId);
      if (disposed || currentTask.value?.id !== taskId) return;
      storageReport.value = next;
      report.value = null;
      scopes.value = storageReport.value.scopes.map((scope) => scope.path);
    } else {
      const next = await analysisApi.getDuplicateReport(taskId);
      if (disposed || currentTask.value?.id !== taskId) return;
      report.value = next;
      storageReport.value = null;
      scopes.value = [...report.value.scopes];
    }
    loadError.value = "";
  } catch (error) {
    if (disposed || currentTask.value?.id !== taskId) return;
    loadError.value = error instanceof Error ? error.message : String(error);
  }
}

async function loadTask(taskId: string) {
  const sequence = ++taskLoadSequence;
  stopPolling();
  currentTask.value = null;
  report.value = null;
  storageReport.value = null;
  loadError.value = "";

  try {
    const task = await taskApi.get(taskId);
    if (sequence !== taskLoadSequence || disposed) return;
    if (
      task.type !== "analysis.duplicates" &&
      task.type !== "analysis.storage"
    ) {
      loadError.value = "该任务不是存储分析任务。";
      return;
    }
    const taskTool: AnalysisTool =
      task.type === "analysis.storage" ? "storage" : "duplicates";
    if (activeTool.value !== taskTool) {
      activeTool.value = taskTool;
      void loadRecent(taskTool);
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
    activeTool.value = toolFromRoute();
    await loadRecent(activeTool.value);
    const taskId = typeof route.query.task === "string" ? route.query.task : "";
    if (!taskId) return;
    await loadTask(taskId);
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
  }
}

async function loadRecent(tool: AnalysisTool) {
  const sequence = ++recentLoadSequence;
  recentLoading.value = true;
  recentError.value = "";
  recentScans.value = [];
  try {
    const items = await analysisApi.listRecentScans(tool);
    if (sequence !== recentLoadSequence || disposed) return;
    recentScans.value = items;
  } catch (error) {
    if (sequence !== recentLoadSequence || disposed) return;
    recentError.value = error instanceof Error ? error.message : String(error);
  } finally {
    if (sequence === recentLoadSequence && !disposed) {
      recentLoading.value = false;
    }
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

function toolFromRoute(): AnalysisTool {
  return route.query.tool === "storage" ? "storage" : "duplicates";
}

function fileRoute(path: string, isDir = false) {
  const suffix = isDir && path !== "/" ? "/" : "";
  return resourceOpenRoute({
    isDir,
    path,
    url: `/files${encodePath(path)}${suffix}`,
  });
}

function fileName(path: string) {
  return path.split("/").at(-1) || path;
}

function resourceIcon(path: string, isDir = false): AppIconName {
  return getResourceIconName(fileName(path), "", isDir);
}

function formatBytes(value: number) {
  return filesize(value || 0);
}

function formatModified(value: number) {
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}

function storageBarWidth(value: number, maximum: number) {
  if (value <= 0 || maximum <= 0) return "0%";
  return `${Math.max(4, Math.round((value / maximum) * 100))}%`;
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
  gap: 11px;
}

.analysis-header-title > div {
  flex-direction: column;
  gap: 1px;
}

.analysis-header-title > .app-icon {
  color: var(--blue);
}

.analysis-header-title strong {
  font-size: 16px;
  line-height: 1.25;
}

.analysis-header-title span {
  color: var(--textPrimary);
  font-size: 12px;
  line-height: 1.35;
}

.analysis-header-action {
  display: inline-flex;
  min-height: 38px;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 1px solid var(--borderPrimary);
  border-radius: 9px;
  color: var(--textSecondary);
  font-size: 13px;
  text-decoration: none;
}

.analysis-header-action:hover,
.analysis-header-action:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--blue) 40%, var(--borderPrimary));
  background: color-mix(in srgb, var(--blue) 5%, var(--surfacePrimary));
}

.analysis-header-action:focus-visible {
  box-shadow: inset 0 0 0 2px var(--focus-ring);
}

.analysis-workspace {
  box-sizing: border-box;
  width: min(1180px, calc(100% - 40px));
  margin: 0 auto;
  padding: 18px 0 48px;
}

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

.analysis-task-card,
.analysis-error {
  margin-top: 14px;
  border: 1px solid var(--borderPrimary);
  border-radius: 10px;
  background: var(--surfacePrimary);
}

.analysis-results-heading,
.analysis-results-heading > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.analysis-results-heading > div {
  justify-content: flex-start;
}

.analysis-results-heading > div > span {
  display: grid;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  place-items: center;
  border-radius: 10px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 9%, transparent);
  font-size: 11px;
  font-weight: 800;
}

.analysis-results-heading h2 {
  margin: 0;
  color: var(--textSecondary);
  font-size: 18px;
}

.analysis-results-heading p {
  margin: 3px 0 0;
  color: var(--textPrimary);
  font-size: 12px;
}

.analysis-cancel-action {
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

.analysis-cancel-action:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.analysis-task-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 16px;
  padding: 18px 20px;
}

.analysis-task-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 11px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 10%, transparent);
}

.analysis-task-icon.is-running .app-icon {
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
  font-size: 15px;
}

.analysis-task-copy span,
.analysis-task-copy small {
  color: var(--textPrimary);
  font-size: 12px;
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
  gap: 12px;
  padding: 16px 18px;
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
  font-size: 12px;
}

.analysis-results-heading {
  margin-top: 28px;
}

.analysis-readonly-chip {
  padding: 6px 9px;
}

.analysis-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 16px;
}

.analysis-summary-grid article {
  display: grid;
  gap: 6px;
  padding: 15px 17px;
  border: 1px solid var(--borderPrimary);
  border-radius: 10px;
  background: var(--surfacePrimary);
}

.analysis-summary-grid small,
.analysis-summary-grid span {
  color: var(--textPrimary);
  font-size: 12px;
}

.analysis-summary-grid strong {
  color: var(--textSecondary);
  font-size: 27px;
  letter-spacing: -0.03em;
}

.analysis-summary-grid .analysis-summary-time {
  font-size: 18px;
  letter-spacing: 0;
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
  font-size: 12px;
  line-height: 1.5;
}

.storage-scope-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.storage-scope-grid article {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 11px;
  padding: 13px 15px;
  border: 1px solid var(--borderPrimary);
  border-radius: 11px;
  background: var(--surfacePrimary);
}

.storage-scope-grid > article > .app-icon {
  width: 20px;
  height: 20px;
  color: var(--blue);
}

.storage-scope-grid span {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.storage-scope-grid strong,
.storage-scope-grid small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.storage-scope-grid strong {
  font-size: 13px;
}

.storage-scope-grid small {
  color: var(--textPrimary);
  font-size: 11px;
}

.storage-rankings {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.storage-rankings > article {
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--borderPrimary);
  border-radius: 12px;
  background: var(--surfacePrimary);
}

.storage-rankings > article > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 50px;
  padding: 0 16px;
  border-bottom: 1px solid var(--borderPrimary);
  background: var(--surfaceSecondary);
}

.storage-rankings > article > header > span {
  color: var(--textSecondary);
  font-size: 14px;
  font-weight: 700;
}

.storage-rankings > article > header > small {
  color: var(--textPrimary);
  font-size: 11px;
}

.storage-rankings > article > div {
  max-height: 560px;
  overflow: auto;
}

.storage-rankings a {
  display: grid;
  min-width: 0;
  grid-template-columns: auto auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 72px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--borderPrimary);
  color: var(--textSecondary);
  text-decoration: none;
}

.storage-rankings a:last-child {
  border-bottom: 0;
}

.storage-rankings a:hover,
.storage-rankings a:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--blue) 4%, var(--surfacePrimary));
}

.storage-rankings a:focus-visible {
  box-shadow: inset 3px 0 var(--focus-ring);
}

.storage-rankings a > b {
  color: var(--textPrimary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.storage-rankings a > .app-icon {
  width: 19px;
  height: 19px;
  color: var(--textPrimary);
}

.storage-rankings a > span:not(.storage-rank-value) {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.storage-rankings a strong,
.storage-rankings a small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.storage-rankings a strong {
  font-size: 12px;
}

.storage-rankings a small {
  color: var(--textPrimary);
  font-size: 11px;
}

.storage-rankings em {
  display: block;
  height: 3px;
  margin-top: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surfaceSecondary);
}

.storage-rankings em > i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--blue);
  transition: width 180ms ease;
}

.storage-rank-value {
  display: grid;
  justify-items: end;
  gap: 2px;
  text-align: right;
}

.storage-rank-empty {
  margin: 0;
  padding: 28px 14px;
  color: var(--textPrimary);
  font-size: 11px;
  text-align: center;
}

.duplicate-groups {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.duplicate-group {
  overflow: hidden;
  border: 1px solid var(--borderPrimary);
  border-radius: 11px;
  background: var(--surfacePrimary);
}

.duplicate-group > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 15px;
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
  font-size: 13px;
}

.duplicate-group header small {
  margin-top: 3px;
  color: var(--textPrimary);
  font-size: 11px;
}

.duplicate-group code {
  max-width: 180px;
  overflow: hidden;
  color: var(--textPrimary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.duplicate-file-list > a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 7px 14px;
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

.duplicate-file-list > a > .app-icon:first-child {
  width: 20px;
  height: 20px;
  color: var(--textPrimary);
}

.duplicate-file-list > a > .app-icon:last-child {
  width: 17px;
  height: 17px;
  color: var(--textPrimary);
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
  font-size: 12px;
}

.duplicate-file-list small,
.duplicate-file-list time {
  color: var(--textPrimary);
  font-size: 10px;
}

.analysis-clean-state {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  justify-items: start;
  gap: 16px;
  margin-top: 12px;
  padding: 22px 24px;
  border: 1px solid color-mix(in srgb, #1ea672 22%, var(--borderPrimary));
  border-radius: 12px;
  background: color-mix(in srgb, #1ea672 4%, var(--surfacePrimary));
  text-align: left;
}

.analysis-clean-state > .app-icon {
  width: 42px;
  height: 42px;
  padding: 9px;
  box-sizing: border-box;
  border: 1px solid color-mix(in srgb, #1ea672 22%, transparent);
  border-radius: 12px;
  color: #16845d;
  background: color-mix(in srgb, #1ea672 10%, transparent);
}

.analysis-clean-state__copy {
  min-width: 0;
}

.analysis-clean-state__copy h2 {
  margin: 0;
  color: var(--textSecondary);
  font-size: 16px;
}

.analysis-clean-state__copy p {
  margin: 5px 0 0;
  color: var(--textPrimary);
  font-size: 12px;
  line-height: 1.5;
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

  .analysis-summary-grid {
    grid-template-columns: 1fr;
  }

  .storage-rankings {
    grid-template-columns: 1fr;
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
  .analysis-task-icon.is-running .app-icon {
    animation: none;
  }

  .analysis-task-progress > div,
  .storage-rankings em > i {
    transition: none;
  }
}
</style>
