<template>
  <section class="analysis-recent" aria-labelledby="analysis-recent-title">
    <div class="analysis-recent__header">
      <span class="analysis-recent__header-icon" aria-hidden="true">
        <AppIcon name="history" :size="18" />
      </span>
      <div>
        <h2 id="analysis-recent-title">最近扫描</h2>
        <p>只显示你的扫描记录，范围、状态和结果一目了然。</p>
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

    <div
      v-if="!loading && !error && items.length"
      class="analysis-recent__columns"
      aria-hidden="true"
    >
      <span></span>
      <span>扫描记录</span>
      <span>执行时间</span>
      <span>结果</span>
    </div>

    <ul v-if="!loading && !error && items.length" class="analysis-recent__list">
      <li v-for="item in items" :key="item.id">
        <span
          :class="[
            'analysis-recent__tool',
            item.tool === 'storage' ? 'is-storage' : 'is-duplicates',
          ]"
          aria-hidden="true"
        >
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
          </div>
          <p class="analysis-recent__scope" :title="item.scopes.join('、')">
            <AppIcon name="folder" :size="15" />
            <b>{{ scopeLabel(item) }}</b>
          </p>
          <p class="analysis-recent__metrics">{{ metricsLabel(item) }}</p>
        </div>
        <div class="analysis-recent__side">
          <div class="analysis-recent__time-block">
            <span class="analysis-recent__time-label" aria-hidden="true">
              <AppIcon name="clock" :size="13" />
              执行时间
            </span>
            <time
              class="analysis-recent__time"
              :datetime="new Date(item.createdAt).toISOString()"
            >
              {{ formatTime(item.createdAt) }}
            </time>
          </div>
          <router-link
            class="analysis-recent__action"
            :to="{
              path: '/analysis',
              query: { tool: item.tool, task: item.id },
            }"
            :aria-label="`${itemToolLabel(item)}：${actionLabel(item)}`"
          >
            <span>{{ actionLabel(item) }}</span>
            <AppIcon name="arrow-right" :size="16" />
          </router-link>
        </div>
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
  margin-top: 30px;
  overflow: hidden;
  border-top: 1px solid var(--borderPrimary);
  border-bottom: 1px solid var(--borderPrimary);
  background: transparent;
  box-shadow: none;
}

.analysis-recent__header {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 17px 14px 13px;
  border-bottom: 1px solid var(--borderPrimary);
  background: transparent;
}

.analysis-recent__header-icon {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 8%, transparent);
}

.analysis-recent__header h2,
.analysis-recent__header p,
.analysis-recent__content p {
  margin: 0;
}

.analysis-recent__header h2 {
  color: var(--textSecondary);
  font-size: 17px;
  line-height: 1.25;
  letter-spacing: -0.01em;
}

.analysis-recent__header p {
  margin-top: 2px;
  color: var(--textPrimary);
  font-size: 12px;
  line-height: 1.4;
}

.analysis-recent__header button {
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid var(--borderPrimary);
  border-radius: 8px;
  color: var(--blue);
  background: var(--surfacePrimary);
  cursor: pointer;
  font-size: 12px;
}

.analysis-recent__state {
  display: flex;
  min-height: 96px;
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

.analysis-recent__columns {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 174px 110px;
  align-items: center;
  gap: 16px;
  min-height: 34px;
  padding: 0 14px;
  border-bottom: 1px solid var(--borderPrimary);
  color: var(--textPrimary);
  background: color-mix(in srgb, var(--surfaceSecondary) 42%, transparent);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.analysis-recent__columns span:nth-child(3),
.analysis-recent__columns span:nth-child(4) {
  text-align: right;
}

.analysis-recent__list li {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) 174px 110px;
  align-items: center;
  gap: 16px;
  min-height: 76px;
  padding: 12px 14px;
  transition: background-color 120ms ease;
}

.analysis-recent__list li + li {
  border-top: 1px solid var(--borderPrimary);
}

.analysis-recent__list li:hover {
  background: color-mix(in srgb, var(--hover) 65%, transparent);
}

.analysis-recent__tool {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  color: var(--blue);
  background: color-mix(in srgb, currentColor 9%, transparent);
}

.analysis-recent__tool.is-duplicates {
  color: #327bdc;
}

.analysis-recent__tool.is-storage {
  color: #7a5bd6;
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
  font-size: 14px;
  line-height: 1.3;
}

.analysis-recent__headline > span {
  position: relative;
  padding: 0 0 0 11px;
  border-radius: 0;
  color: var(--textPrimary);
  background: transparent;
  font-size: 12px;
  font-weight: 700;
}

.analysis-recent__headline > span::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  content: "";
  transform: translateY(-50%);
}

.analysis-recent__headline > span.is-completed {
  color: #16845d;
}

.analysis-recent__headline > span.is-failed,
.analysis-recent__headline > span.is-interrupted,
.analysis-recent__headline > span.is-result-unavailable {
  color: var(--red);
}

.analysis-recent__time {
  display: inline-flex;
  align-items: center;
  color: var(--textSecondary);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.analysis-recent__time-block {
  display: grid;
  min-width: 0;
  justify-items: start;
  gap: 3px;
  text-align: left;
}

.analysis-recent__time-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--textPrimary);
  font-size: 10px;
  line-height: 1.2;
  letter-spacing: 0.03em;
}

.analysis-recent__time-label .app-icon {
  color: currentColor;
}

.analysis-recent__scope {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 5px;
  color: var(--textSecondary);
  font-size: 12px;
  line-height: 1.35;
}

.analysis-recent__scope b {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-recent__metrics {
  overflow: hidden;
  color: var(--textPrimary);
  font-size: 10px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-recent__side {
  display: contents;
}

.analysis-recent__action {
  display: inline-flex;
  justify-self: end;
  width: 110px;
  box-sizing: border-box;
  min-height: 36px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid color-mix(in srgb, var(--blue) 28%, var(--borderPrimary));
  border-radius: 8px;
  color: var(--blue);
  background: var(--surfacePrimary);
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  white-space: nowrap;
}

.analysis-recent__action:hover,
.analysis-recent__action:focus-visible,
.analysis-recent__header button:hover,
.analysis-recent__header button:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--blue) 7%, var(--surfacePrimary));
}

.analysis-recent__action:focus-visible,
.analysis-recent__header button:focus-visible {
  box-shadow: inset 0 0 0 2px var(--focus-ring);
}

@media (max-width: 620px) {
  .analysis-recent__header {
    padding: 16px 4px 12px;
  }

  .analysis-recent__columns {
    display: none;
  }

  .analysis-recent__header p {
    line-height: 1.4;
  }

  .analysis-recent__list li {
    grid-template-columns: 34px minmax(0, 1fr);
    gap: 10px;
    min-height: 0;
    padding: 14px 4px;
  }

  .analysis-recent__tool {
    width: 34px;
    height: 34px;
  }

  .analysis-recent__side {
    grid-column: 2;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    min-width: 0;
    align-items: center;
    gap: 10px;
    padding: 10px 0 0;
    border-top: 1px solid var(--borderPrimary);
  }

  .analysis-recent__time-block {
    min-width: 0;
    justify-items: start;
    text-align: left;
  }

  .analysis-recent__time-label {
    display: inline-flex;
  }

  .analysis-recent__action {
    justify-self: auto;
    width: auto;
    min-width: 110px;
    min-height: 44px;
  }

  .analysis-recent__time {
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-recent__list li {
    transition: none;
  }
}
</style>
