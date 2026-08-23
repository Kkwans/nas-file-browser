<template>
  <div id="history-page" class="activity-page">
    <header-bar show-menu show-logo>
      <div class="activity-header-title">
        <app-icon name="history" :size="24" />
        <div>
          <strong>操作历史</strong>
          <span
            >已显示 {{ historyStore.items.length }} /
            {{ historyStore.total }} 条</span
          >
        </div>
      </div>
      <template #actions>
        <button
          type="button"
          class="activity-header-action"
          :class="{ 'is-loading': historyStore.loading }"
          :disabled="historyStore.loading"
          @click="load"
        >
          <app-icon name="refresh" :size="19" />
          刷新
        </button>
      </template>
    </header-bar>

    <main class="activity-workspace">
      <nav class="activity-switcher" aria-label="任务与历史">
        <router-link to="/tasks">
          <app-icon name="tasks" :size="18" />
          任务中心
        </router-link>
        <router-link to="/history" aria-current="page">
          <app-icon name="history" :size="18" />
          操作历史
        </router-link>
      </nav>

      <section class="history-overview" aria-labelledby="history-title">
        <div>
          <h1 id="history-title">你的操作轨迹</h1>
          <p>记录核心文件操作和任务动作，默认每批显示 30 条。</p>
        </div>
        <span class="history-overview__private">
          <app-icon name="shield-check" :size="16" />用户私有
        </span>
      </section>

      <form class="history-filter-bar" @submit.prevent="applyFilters">
        <label class="history-filter-bar__search">
          <app-icon name="search" :size="18" />
          <span class="sr-only">搜索操作历史</span>
          <input
            v-model="filterDraft.text"
            type="search"
            placeholder="搜索路径、动作或详情"
          />
        </label>
        <select v-model="filterDraft.action" aria-label="历史动作">
          <option value="">全部动作</option>
          <option
            v-for="option in actionOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <select v-model="filterDraft.status" aria-label="历史状态">
          <option value="">全部状态</option>
          <option value="success">已完成</option>
          <option value="submitted">已提交</option>
          <option value="failed">失败</option>
        </select>
        <button type="submit" class="primary">筛选</button>
        <details class="history-filter-more">
          <summary>时间范围</summary>
          <div>
            <label>
              <span>开始日期</span>
              <input v-model="filterDraft.from" type="date" />
            </label>
            <label>
              <span>结束日期</span>
              <input v-model="filterDraft.to" type="date" />
            </label>
            <button type="button" @click="resetFilters">清除全部筛选</button>
          </div>
        </details>
      </form>

      <section
        v-if="historyStore.error"
        class="activity-state activity-state--error"
      >
        <app-icon name="circle-alert" :size="24" />
        <div>
          <strong>无法读取操作历史</strong>
          <p>{{ historyStore.error }}</p>
        </div>
        <button type="button" @click="load">重试</button>
      </section>

      <section
        v-else-if="historyStore.loading && !historyStore.loaded"
        class="activity-list activity-list--loading"
        aria-label="正在加载操作历史"
      >
        <div
          v-for="index in 6"
          :key="index"
          class="activity-skeleton activity-skeleton--slim"
        ></div>
      </section>

      <section
        v-else-if="historyStore.items.length === 0"
        class="activity-empty"
      >
        <div aria-hidden="true">
          <app-icon name="history" :size="30" />
        </div>
        <h2>
          {{ hasAppliedFilters ? "此筛选下没有记录" : "还没有操作记录" }}
        </h2>
        <p>移动、恢复、重命名、上传和任务操作会记录在这里。</p>
      </section>

      <section v-else class="history-ledger" aria-label="操作历史列表">
        <div class="history-ledger__entries">
          <article
            v-for="entry in historyStore.items"
            :key="entry.id"
            class="history-entry"
          >
            <div class="history-entry-line" aria-hidden="true">
              <span :class="`history-entry-dot--${entry.status}`"></span>
            </div>
            <div class="history-entry-icon">
              <app-icon :name="actionMeta(entry.action).icon" :size="19" />
            </div>
            <div class="history-entry-copy">
              <div>
                <strong>{{ actionMeta(entry.action).label }}</strong>
                <span :class="`history-status--${entry.status}`">{{
                  statusLabel(entry.status)
                }}</span>
              </div>
              <p :title="entry.target">{{ entry.target }}</p>
              <small v-if="entry.detail">{{ detailLabel(entry) }}</small>
            </div>
            <time :datetime="new Date(entry.createdAt).toISOString()">
              {{ dayjs(entry.createdAt).fromNow() }}
            </time>
          </article>
        </div>
        <button
          v-if="historyStore.nextCursor"
          type="button"
          class="history-load-more"
          :disabled="historyStore.loading"
          @click="loadMore"
        >
          {{
            historyStore.loading
              ? "正在加载…"
              : `继续加载（已显示 ${historyStore.items.length} / ${historyStore.total}）`
          }}
        </button>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, reactive } from "vue";
import dayjs from "dayjs";
import HeaderBar from "@/components/header/HeaderBar.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import type { AppIconName } from "@/components/ui/iconRegistry";
import type {
  HistoryEntry,
  HistoryListFilter,
  HistoryStatus,
} from "@/api/history";
import { useHistoryStore } from "@/stores/history";

const historyStore = useHistoryStore();
const $showError = inject<IToastError>("$showError")!;
const filterDraft = reactive({
  text: "",
  action: "",
  status: "" as HistoryStatus | "",
  from: "",
  to: "",
});
const appliedFilter = reactive({ ...filterDraft });

const actions: Record<string, { label: string; icon: AppIconName }> = {
  "trash.move": { label: "移入回收站", icon: "trash" },
  "trash.restore": { label: "从回收站恢复", icon: "archive-restore" },
  "trash.delete": { label: "永久删除", icon: "trash" },
  "trash.clear": { label: "清空回收站", icon: "trash" },
  "analysis.duplicates": { label: "查找重复文件", icon: "analysis-duplicates" },
  "analysis.storage": { label: "分析存储空间", icon: "analysis-storage" },
  "archive.extract": { label: "解压归档", icon: "archive" },
  "media.hls": { label: "准备兼容播放", icon: "play" },
  "task.cancel": { label: "取消任务", icon: "circle-stop" },
  "task.retry": { label: "重试任务", icon: "retry" },
  "task.archive": { label: "归档任务", icon: "archive" },
  "task.unarchive": { label: "恢复归档任务", icon: "archive-restore" },
  "task.batch.retry": { label: "批量重试任务", icon: "retry" },
  "task.batch.archive": { label: "批量归档任务", icon: "archive" },
  "task.batch.unarchive": { label: "批量恢复任务", icon: "archive-restore" },
  "file.mkdir": { label: "新建文件夹", icon: "folder-new" },
  "file.upload": { label: "上传文件", icon: "upload" },
  "file.save": { label: "保存文件", icon: "file" },
  "file.rename": { label: "移动或重命名", icon: "rename" },
  "file.copy": { label: "复制文件", icon: "analysis-duplicates" },
  "file.delete": { label: "永久删除文件", icon: "trash" },
};

const actionOptions = computed(() =>
  Object.entries(actions)
    .map(([value, meta]) => ({ value, label: meta.label }))
    .sort((left, right) => left.label.localeCompare(right.label, "zh-CN"))
);
const hasAppliedFilters = computed(() =>
  Object.values(appliedFilter).some((value) => value.trim() !== "")
);

function viewFilter(): HistoryListFilter {
  const filter: HistoryListFilter = { limit: 30 };
  if (appliedFilter.text.trim()) filter.text = appliedFilter.text.trim();
  if (appliedFilter.action) filter.action = appliedFilter.action;
  if (appliedFilter.status) filter.status = appliedFilter.status;
  if (appliedFilter.from)
    filter.from = new Date(`${appliedFilter.from}T00:00:00`).getTime();
  if (appliedFilter.to)
    filter.to = new Date(`${appliedFilter.to}T23:59:59.999`).getTime();
  return filter;
}

async function load() {
  try {
    await historyStore.load(viewFilter());
  } catch (error) {
    $showError(error as Error, false);
  }
}

async function loadMore() {
  try {
    await historyStore.loadMore();
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
    action: "",
    status: "",
    from: "",
    to: "",
  });
  Object.assign(appliedFilter, filterDraft);
  void load();
}

function actionMeta(action: string) {
  return actions[action] ?? { label: action, icon: "info" as AppIconName };
}

function statusLabel(status: HistoryStatus) {
  return (
    { success: "已完成", failed: "失败", submitted: "已提交" } satisfies Record<
      HistoryStatus,
      string
    >
  )[status];
}

function detailLabel(entry: HistoryEntry) {
  if (entry.action === "file.rename" || entry.action === "file.copy")
    return `来源：${entry.detail}`;
  if (entry.action === "trash.restore" && entry.detail !== entry.target)
    return `原位置：${entry.detail}`;
  if (entry.action.startsWith("task.") || entry.action === "trash.clear")
    return `任务 ${entry.detail?.slice(-8)}`;
  return entry.detail;
}

onMounted(load);
</script>
