<template>
  <div id="history-page" class="activity-page">
    <header-bar show-menu show-logo>
      <div class="activity-header-title">
        <i class="material-icons" aria-hidden="true">history</i>
        <div>
          <strong>操作历史</strong>
          <span>最近 {{ historyStore.items.length }} 条</span>
        </div>
      </div>
      <template #actions>
        <button
          type="button"
          class="activity-header-action"
          :disabled="historyStore.loading"
          @click="load"
        >
          <i class="material-icons" aria-hidden="true">refresh</i>
          刷新
        </button>
      </template>
    </header-bar>

    <main class="activity-workspace">
      <nav class="activity-switcher" aria-label="任务与历史">
        <router-link to="/tasks">
          <i class="material-icons" aria-hidden="true">pending_actions</i>
          任务中心
        </router-link>
        <router-link to="/history" aria-current="page">
          <i class="material-icons" aria-hidden="true">history</i>
          操作历史
        </router-link>
      </nav>

      <section class="activity-intro" aria-labelledby="history-title">
        <div
          class="activity-intro-mark activity-intro-mark--history"
          aria-hidden="true"
        >
          <span>500</span>
          <small>MAX</small>
        </div>
        <div>
          <h1 id="history-title">只属于你的操作轨迹</h1>
          <p>
            记录已提交或已完成的核心文件操作。管理员也不会看到其他用户的私有历史。
          </p>
        </div>
        <span class="activity-private-state">
          <i class="material-icons" aria-hidden="true">lock_outline</i>
          用户私有
        </span>
      </section>

      <section
        v-if="historyStore.error"
        class="activity-state activity-state--error"
      >
        <i class="material-icons" aria-hidden="true">cloud_off</i>
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
          <i class="material-icons">history_toggle_off</i>
        </div>
        <h2>还没有操作记录</h2>
        <p>移动、恢复、重命名、上传和任务操作会记录在这里。</p>
      </section>

      <section v-else class="history-ledger" aria-label="操作历史列表">
        <article
          v-for="entry in historyStore.items"
          :key="entry.id"
          class="history-entry"
        >
          <div class="history-entry-line" aria-hidden="true">
            <span :class="`history-entry-dot--${entry.status}`"></span>
          </div>
          <div class="history-entry-icon">
            <i class="material-icons" aria-hidden="true">{{
              actionMeta(entry.action).icon
            }}</i>
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
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { inject, onMounted } from "vue";
import dayjs from "dayjs";
import HeaderBar from "@/components/header/HeaderBar.vue";
import type { HistoryEntry, HistoryStatus } from "@/api/history";
import { useHistoryStore } from "@/stores/history";

const historyStore = useHistoryStore();
const $showError = inject<IToastError>("$showError")!;

const actions: Record<string, { label: string; icon: string }> = {
  "trash.move": { label: "移入回收站", icon: "delete_outline" },
  "trash.restore": { label: "从回收站恢复", icon: "restore" },
  "trash.delete": { label: "永久删除", icon: "delete_forever" },
  "trash.clear": { label: "清空回收站", icon: "delete_sweep" },
  "analysis.duplicates": { label: "查找重复文件", icon: "content_copy" },
  "analysis.storage": { label: "分析存储空间", icon: "donut_large" },
  "archive.extract": { label: "解压归档", icon: "folder_zip" },
  "task.cancel": { label: "取消任务", icon: "stop_circle" },
  "task.retry": { label: "重试任务", icon: "replay" },
  "file.mkdir": { label: "新建文件夹", icon: "create_new_folder" },
  "file.upload": { label: "上传文件", icon: "upload_file" },
  "file.save": { label: "保存文件", icon: "save" },
  "file.rename": { label: "移动或重命名", icon: "drive_file_rename_outline" },
  "file.copy": { label: "复制文件", icon: "content_copy" },
  "file.delete": { label: "永久删除文件", icon: "delete_forever" },
};

async function load() {
  try {
    await historyStore.load();
  } catch (error) {
    $showError(error as Error, false);
  }
}

function actionMeta(action: string) {
  return actions[action] ?? { label: action, icon: "bolt" };
}

function statusLabel(status: HistoryStatus) {
  const labels: Record<HistoryStatus, string> = {
    success: "已完成",
    failed: "失败",
    submitted: "已提交",
  };
  return labels[status];
}

function detailLabel(entry: HistoryEntry) {
  if (entry.action === "file.rename" || entry.action === "file.copy") {
    return `来源：${entry.detail}`;
  }
  if (entry.action === "trash.restore" && entry.detail !== entry.target) {
    return `原位置：${entry.detail}`;
  }
  if (entry.action.startsWith("task.") || entry.action === "trash.clear") {
    return `任务 ${entry.detail?.slice(-8)}`;
  }
  return entry.detail;
}

onMounted(load);
</script>
