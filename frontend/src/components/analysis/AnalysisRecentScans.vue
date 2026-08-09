<template>
  <section class="analysis-recent" aria-labelledby="analysis-recent-title">
    <div class="analysis-recent__header">
      <span aria-hidden="true">最近</span>
      <div>
        <h2 id="analysis-recent-title">最近扫描</h2>
        <p>只显示你的扫描；范围、状态和关键结果集中在一行查看。</p>
      </div>
      <button v-if="error" type="button" @click="$emit('retry')">
        重新加载
      </button>
    </div>

    <div v-if="loading" class="analysis-recent__state" role="status">
      <AppIcon name="scan" :size="18" />
      正在读取最近扫描…
    </div>
    <div v-else-if="error" class="analysis-recent__state is-error" role="alert">
      <AppIcon name="info" :size="18" />
      {{ error }}
    </div>
    <div v-else-if="!items.length" class="analysis-recent__state">
      <AppIcon :name="toolIcon" :size="18" />
      还没有{{ toolLabel }}记录，完成一次扫描后会显示在这里。
    </div>

    <ul v-else class="analysis-recent__list">
      <li v-for="item in items" :key="item.id">
        <span class="analysis-recent__tool" aria-hidden="true">
          <AppIcon
            :name="
              item.tool === 'storage'
                ? 'analysis-storage'
                : 'analysis-duplicates'
            "
            :size="19"
          />
        </span>
        <div class="analysis-recent__content">
          <div class="analysis-recent__headline">
            <strong>{{ itemToolLabel(item) }}</strong>
            <span
              :class="[
                `is-${item.status}`,
                {
                  'is-result-unavailable':
                    item.status === 'completed' && !item.resultReady,
                },
              ]"
              >{{ statusLabel(item) }}</span
            >
            <time :datetime="new Date(item.createdAt).toISOString()">
              {{ formatTime(item.createdAt) }}
            </time>
          </div>
          <p class="analysis-recent__scope" :title="item.scopes.join('、')">
            <AppIcon name="folder" :size="15" />
            <b>{{ scopeLabel(item) }}</b>
          </p>
          <p class="analysis-recent__metrics">{{ metricsLabel(item) }}</p>
        </div>
        <router-link
          class="analysis-recent__action"
          :to="{
            path: '/analysis',
            query: { tool: item.tool, task: item.id },
          }"
          :aria-label="`${itemToolLabel(item)}：${actionLabel(item)}`"
        >
          {{ actionLabel(item) }}
          <AppIcon name="chevron-right" :size="17" />
        </router-link>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { AnalysisRecentItem } from "@/api/analysis";
import AppIcon from "@/components/ui/AppIcon.vue";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";
import type { AnalysisTool } from "@/utils/analysisTools";

const props = defineProps<{
  tool: AnalysisTool;
  items: AnalysisRecentItem[];
  loading: boolean;
  error: string;
}>();

defineEmits<{ retry: [] }>();

const toolLabel = computed(() =>
  props.tool === "storage" ? "空间分析" : "重复文件扫描"
);
const toolIcon = computed(() =>
  props.tool === "storage" ? "analysis-storage" : "analysis-duplicates"
);

function itemToolLabel(item: AnalysisRecentItem) {
  return item.tool === "storage" ? "空间分析" : "重复文件扫描";
}

function statusLabel(item: AnalysisRecentItem) {
  const labels: Record<AnalysisRecentItem["status"], string> = {
    queued: "排队中",
    running: "扫描中",
    completed: item.resultReady ? "已完成" : "结果不可用",
    failed: "失败",
    canceled: "已取消",
    interrupted: "已中断",
  };
  return labels[item.status];
}

function scopeLabel(item: AnalysisRecentItem) {
  if (!item.scopes.length) return "扫描范围不可用";
  const first = item.scopes[0];
  return item.scopes.length === 1
    ? first
    : `${first} 等 ${item.scopes.length} 个范围`;
}

function metricsLabel(item: AnalysisRecentItem) {
  if (item.metrics) {
    if (item.tool === "storage") {
      return `${item.metrics.scannedFiles} 个文件 · ${item.metrics.scannedDirectories} 个目录 · ${filesize(item.metrics.scannedBytes)}`;
    }
    return `扫描 ${item.metrics.scannedFiles} 个文件 · 重复 ${item.metrics.duplicateGroups} 组 · 可回收 ${filesize(item.metrics.reclaimableBytes)}`;
  }
  if (item.error) return item.error;
  if (item.status === "queued") return "正在等待低并发扫描队列";
  if (item.status === "running") {
    return item.totalItems > 0
      ? `已处理 ${item.processedItems} / ${item.totalItems} 项`
      : `已处理 ${item.processedItems} 项，正在继续扫描`;
  }
  if (item.status === "completed") return "扫描已完成，但报告暂时无法读取";
  return "任务未生成分析报告";
}

function actionLabel(item: AnalysisRecentItem) {
  return item.resultReady ? "查看结果" : "查看详情";
}

function formatTime(value: number) {
  return dayjs(value).format("YYYY-MM-DD HH:mm");
}
</script>

<style scoped>
.analysis-recent {
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--borderPrimary);
  border-radius: 14px;
  background: var(--surfacePrimary);
}

.analysis-recent__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--borderPrimary);
}

.analysis-recent__header > span {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border-radius: 8px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 9%, transparent);
  font-size: 10px;
  font-weight: 800;
}

.analysis-recent__header h2,
.analysis-recent__header p,
.analysis-recent__content p {
  margin: 0;
}

.analysis-recent__header h2 {
  color: var(--textSecondary);
  font-size: 15px;
}

.analysis-recent__header p {
  margin-top: 2px;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-recent__header button {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--borderPrimary);
  border-radius: 8px;
  color: var(--blue);
  background: transparent;
  cursor: pointer;
}

.analysis-recent__state {
  display: flex;
  min-height: 76px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  color: var(--textPrimary);
  font-size: 12px;
}

.analysis-recent__state.is-error {
  color: var(--red);
}

.analysis-recent__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.analysis-recent__list li {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  min-height: 88px;
  padding: 11px 16px;
}

.analysis-recent__list li + li {
  border-top: 1px solid var(--borderPrimary);
}

.analysis-recent__list li:hover {
  background: color-mix(in srgb, var(--hover) 65%, transparent);
}

.analysis-recent__tool {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 9px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 9%, transparent);
}

.analysis-recent__content {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.analysis-recent__headline {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.analysis-recent__headline strong {
  color: var(--textSecondary);
  font-size: 13px;
}

.analysis-recent__headline > span {
  padding: 2px 6px;
  border-radius: 5px;
  color: var(--textPrimary);
  background: var(--surfaceSecondary);
  font-size: 10px;
  font-weight: 700;
}

.analysis-recent__headline > span.is-completed {
  color: #16845d;
  background: color-mix(in srgb, #1ea672 10%, transparent);
}

.analysis-recent__headline > span.is-failed,
.analysis-recent__headline > span.is-interrupted,
.analysis-recent__headline > span.is-result-unavailable {
  color: var(--red);
  background: color-mix(in srgb, var(--red) 8%, transparent);
}

.analysis-recent__headline time {
  margin-left: auto;
  color: var(--textPrimary);
  font-size: 10px;
  white-space: nowrap;
}

.analysis-recent__scope {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-recent__scope b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-recent__metrics {
  overflow: hidden;
  color: var(--textPrimary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-recent__action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 4px;
  padding: 0 8px 0 11px;
  border-radius: 8px;
  color: var(--blue);
  font-size: 11px;
  font-weight: 700;
  text-decoration: none;
}

.analysis-recent__action:hover,
.analysis-recent__action:focus-visible,
.analysis-recent__header button:hover,
.analysis-recent__header button:focus-visible {
  outline: none;
  background: var(--hover);
}

.analysis-recent__action:focus-visible,
.analysis-recent__header button:focus-visible {
  box-shadow: inset 0 0 0 2px var(--focus-ring);
}

@media (max-width: 620px) {
  .analysis-recent__header {
    padding: 13px 14px;
  }

  .analysis-recent__header p {
    line-height: 1.4;
  }

  .analysis-recent__list li {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 9px;
    padding: 12px 14px;
  }

  .analysis-recent__tool {
    width: 34px;
    height: 34px;
  }

  .analysis-recent__headline {
    flex-wrap: wrap;
  }

  .analysis-recent__headline time {
    width: 100%;
    margin-left: 0;
  }

  .analysis-recent__action {
    grid-column: 2;
    justify-self: start;
    margin-left: -11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-recent__list li {
    transition: none;
  }
}
</style>
