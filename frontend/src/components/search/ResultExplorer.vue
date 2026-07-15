<template>
  <section class="result-explorer" :aria-labelledby="headingId">
    <div class="result-explorer-header">
      <div class="result-explorer-heading">
        <i
          class="material-icons"
          :style="{ color: iconColor }"
          aria-hidden="true"
          >{{ icon }}</i
        >
        <div>
          <span class="result-explorer-kicker">{{ scopeKicker }}</span>
          <h1 :id="headingId">{{ title }}</h1>
        </div>
      </div>

      <div
        class="result-explorer-scope"
        role="group"
        :aria-label="`${noun}范围`"
      >
        <button
          type="button"
          :class="{ active: scope === 'current' }"
          @click="$emit('scope-change', 'current')"
        >
          当前目录
        </button>
        <button
          type="button"
          :class="{ active: scope === 'global' }"
          @click="$emit('scope-change', 'global')"
        >
          全局
        </button>
      </div>

      <router-link
        class="result-explorer-back"
        :to="returnRoute"
        replace
        @click="$emit('return')"
      >
        <i class="material-icons" aria-hidden="true">arrow_back</i>
        返回文件列表
      </router-link>
    </div>

    <div v-if="loading" class="result-state" aria-live="polite">
      <i class="material-icons spin" aria-hidden="true">autorenew</i>
      <span>正在加载{{ noun }}结果…</span>
    </div>
    <div v-else-if="results.length === 0" class="result-state">
      <i class="material-icons" aria-hidden="true">{{ emptyIcon }}</i>
      <span>{{ emptyText }}</span>
    </div>
    <div v-else class="result-explorer-list">
      <router-link
        v-for="result in results"
        :key="result.path"
        :to="result.url"
        class="result-explorer-item"
        @contextmenu.prevent.stop="openContextMenu($event, result)"
      >
        <span class="result-icon" aria-hidden="true">
          <i class="material-icons">{{
            getFileIcon(result.name, result.dir)
          }}</i>
        </span>
        <span class="result-copy">
          <strong :title="result.name">{{ result.name }}</strong>
          <span :title="getResultParentPath(result.path, basePath)">
            <i class="material-icons" aria-hidden="true">folder_open</i>
            {{ getResultParentPath(result.path, basePath) }}
          </span>
        </span>
        <span class="result-meta">
          <span v-if="!result.dir">{{ formatSize(result.size) }}</span>
          <span>{{ formatTime(result.modified) }}</span>
        </span>
      </router-link>
    </div>

    <context-menu
      :show="contextMenuVisible"
      :pos="contextMenuPosition"
      @hide="closeContextMenu"
    >
      <button type="button" @click="emitAction('open-location')">
        <i class="material-icons" aria-hidden="true">folder_open</i>
        打开文件所在位置
      </button>
      <button
        v-if="authStore.user?.perm.create"
        type="button"
        @click="emitAction('copy')"
      >
        <i class="material-icons" aria-hidden="true">content_copy</i>
        复制
      </button>
      <button
        v-if="authStore.user?.perm.rename"
        type="button"
        @click="emitAction('move')"
      >
        <i class="material-icons" aria-hidden="true">drive_file_move</i>
        移动
      </button>
      <button
        v-if="authStore.user?.perm.download"
        type="button"
        @click="emitAction('download')"
      >
        <i class="material-icons" aria-hidden="true">download</i>
        下载
      </button>
      <button type="button" @click="emitAction('info')">
        <i class="material-icons" aria-hidden="true">info</i>
        详细信息
      </button>
    </context-menu>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import ContextMenu from "@/components/ContextMenu.vue";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";
import { getFileIcon } from "@/utils/fileIcons";
import { getResultParentPath } from "@/utils/tagResults";
import { useAuthStore } from "@/stores/auth";

export type ExplorerResult = {
  path: string;
  name: string;
  dir: boolean;
  size: number;
  modified: string;
  url: string;
};

export type ExplorerResultAction =
  | "open-location"
  | "copy"
  | "move"
  | "download"
  | "info";

const props = withDefaults(
  defineProps<{
    kind: "search" | "tag";
    scope: "current" | "global";
    title: string;
    results: ExplorerResult[];
    loading?: boolean;
    basePath?: string;
    returnRoute: string;
    iconColor?: string;
  }>(),
  {
    loading: false,
    basePath: "/",
    iconColor: "var(--blue, #1677ff)",
  }
);

const emit = defineEmits<{
  "scope-change": [scope: "current" | "global"];
  return: [];
  action: [action: ExplorerResultAction, result: ExplorerResult];
}>();

const authStore = useAuthStore();

const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextResult = ref<ExplorerResult | null>(null);

const headingId = computed(() => `${props.kind}-results-title`);
const noun = computed(() => (props.kind === "tag" ? "标签筛选" : "搜索"));
const icon = computed(() => (props.kind === "tag" ? "label" : "search"));
const scopeKicker = computed(
  () => `${props.scope === "global" ? "全局" : "当前目录"}${noun.value}`
);
const emptyIcon = computed(() =>
  props.kind === "tag" ? "label_off" : "search_off"
);
const emptyText = computed(() =>
  props.kind === "tag"
    ? "该标签下暂无可访问的文件或文件夹"
    : "没有找到匹配的文件或文件夹"
);

function formatSize(size: number) {
  return filesize(size);
}

function formatTime(time: string) {
  return time ? dayjs(time).fromNow() : "时间未知";
}

function openContextMenu(event: MouseEvent, result: ExplorerResult) {
  contextResult.value = result;
  contextMenuPosition.value = {
    x: event.clientX + 8,
    y: event.clientY + window.scrollY,
  };
  contextMenuVisible.value = true;
}

function closeContextMenu() {
  contextMenuVisible.value = false;
}

function emitAction(action: ExplorerResultAction) {
  if (contextResult.value) emit("action", action, contextResult.value);
  closeContextMenu();
}
</script>

<style scoped>
.result-explorer {
  width: min(76rem, 100%);
  margin: 0 auto;
}

.result-explorer-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.875rem;
}

.result-explorer-heading {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 0.75rem;
}

.result-explorer-heading > .material-icons {
  flex: 0 0 auto;
  font-size: 1.75rem;
}

.result-explorer-kicker {
  display: block;
  color: var(--textSecondary, #64748b);
  font-size: 0.75rem;
}

.result-explorer-heading h1 {
  margin: 0.125rem 0 0;
  overflow: hidden;
  font-size: 1.125rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-explorer-scope {
  display: inline-flex;
  gap: 0.125rem;
  padding: 0.1875rem;
  background: var(--surfaceSecondary, #f8fafc);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.625rem;
}

.result-explorer-scope button {
  min-height: 2rem;
  padding: 0 0.75rem;
  color: var(--textSecondary, #64748b);
  background: transparent;
  border: 0;
  border-radius: 0.4375rem;
  cursor: pointer;
}

.result-explorer-scope button:hover,
.result-explorer-scope button.active {
  color: var(--blue, #1677ff);
  background: var(--surfacePrimary, #fff);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.result-explorer-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  justify-self: end;
  gap: 0.375rem;
  min-height: 2.5rem;
  padding: 0 0.875rem;
  color: var(--textSecondary, #475569);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.5rem;
  text-decoration: none;
}

.result-explorer-back:hover {
  color: var(--blue, #1677ff);
  border-color: rgba(22, 119, 255, 0.4);
}

.result-explorer-back .material-icons {
  font-size: 1.125rem;
}

.result-explorer-list {
  display: grid;
  gap: 0.25rem;
  padding: 0.5rem;
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.875rem;
}

.result-explorer-item {
  display: grid;
  grid-template-columns: 2.5rem minmax(0, 1fr) auto;
  align-items: center;
  min-height: 4.25rem;
  gap: 0.875rem;
  padding: 0.625rem 0.875rem;
  color: var(--textPrimary, #1e293b);
  border-radius: 0.625rem;
  text-decoration: none;
}

.result-explorer-item:hover,
.result-explorer-item:focus-visible {
  background: var(--hover, #f4f7fb);
  outline: none;
}

.result-icon {
  display: inline-grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  color: var(--blue, #1677ff);
  background: rgba(22, 119, 255, 0.08);
  border-radius: 0.625rem;
}

.result-icon .material-icons {
  font-size: 1.5rem;
}

.result-copy {
  display: grid;
  min-width: 0;
  gap: 0.375rem;
}

.result-copy strong,
.result-copy > span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-copy strong {
  font-size: 0.9375rem;
  font-weight: 650;
}

.result-copy > span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--textSecondary, #64748b);
  font-size: 0.75rem;
}

.result-copy > span .material-icons {
  font-size: 0.875rem;
}

.result-meta {
  display: grid;
  min-width: 6rem;
  gap: 0.375rem;
  color: var(--textSecondary, #64748b);
  font-size: 0.75rem;
  text-align: right;
  white-space: nowrap;
}

.result-state {
  display: grid;
  min-height: 13rem;
  place-content: center;
  justify-items: center;
  gap: 0.75rem;
  color: var(--textSecondary, #64748b);
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--borderPrimary, #e2e8f0);
  border-radius: 0.875rem;
}

.result-state .material-icons {
  font-size: 2rem;
  opacity: 0.6;
}

:deep(.context-menu) {
  min-width: 13.5rem;
  padding: 0.375rem;
}

:deep(.context-menu button) {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 2.5rem;
  gap: 0.625rem;
  padding: 0 0.75rem;
  color: var(--textPrimary, #1e293b);
  background: transparent;
  border: 0;
  border-radius: 0.4375rem;
  cursor: pointer;
  text-align: left;
}

:deep(.context-menu button:hover) {
  background: var(--hover, #f1f5f9);
}

:deep(.context-menu button .material-icons) {
  color: var(--textSecondary, #64748b);
  font-size: 1.125rem;
}

@media (max-width: 736px) {
  .result-explorer-header {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .result-explorer-scope {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .result-explorer-scope button {
    flex: 1;
  }

  .result-explorer-back {
    padding-inline: 0.625rem;
  }

  .result-explorer-back span {
    display: none;
  }

  .result-explorer-item {
    grid-template-columns: 2.25rem minmax(0, 1fr);
  }

  .result-meta {
    grid-column: 2;
    grid-auto-flow: column;
    justify-content: start;
    text-align: left;
  }
}
</style>
