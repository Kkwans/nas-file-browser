<template>
  <form
    class="analysis-run-panel"
    aria-labelledby="analysis-scope-title"
    @submit.prevent="$emit('start')"
  >
    <div class="analysis-run-panel__heading">
      <h2 id="analysis-scope-title">扫描范围</h2>
      <small aria-live="polite">{{ scopes.length }} / 32</small>
    </div>
    <div
      v-if="scopes.length"
      class="analysis-run-panel__scopes"
      aria-label="已选扫描范围"
    >
      <span v-for="scope in scopes" :key="scope">
        <AppIcon name="folder" :size="16" />
        <b :title="scope">{{ scope }}</b>
        <button
          type="button"
          :aria-label="`移除 ${scope}`"
          @click="$emit('remove', scope)"
        >
          <AppIcon name="x" :size="16" />
        </button>
      </span>
    </div>
    <p v-else class="analysis-run-panel__empty">添加要扫描的文件或目录。</p>
    <div class="analysis-run-panel__controls">
      <button
        type="button"
        class="analysis-run-panel__browse"
        :disabled="scopes.length >= 32"
        @click="$emit('browse')"
      >
        <AppIcon name="folder-new" :size="18" />添加范围
      </button>
      <details class="analysis-run-panel__advanced">
        <summary>高级：粘贴路径</summary>
        <div class="analysis-run-panel__input">
          <input
            :value="scopeInput"
            type="text"
            autocomplete="off"
            placeholder="例如 /照片/2026"
            aria-label="添加扫描路径"
            @input="updateScopeInput"
            @keydown.enter.prevent="$emit('add')"
          />
          <button
            type="button"
            :disabled="!scopeInput.trim() || scopes.length >= 32"
            @click="$emit('add')"
          >
            添加
          </button>
        </div>
        <p>父目录已包含的子路径会自动合并。</p>
      </details>
    </div>
    <label v-if="includesRoot" class="analysis-run-panel__root-confirm">
      <input
        :checked="rootConfirmed"
        type="checkbox"
        @change="updateRootConfirmed"
      />
      <span
        ><strong>确认扫描整个可访问范围</strong
        >根目录扫描可能唤醒更多磁盘并持续较长时间，可在任务中心取消。</span
      >
    </label>
    <div class="analysis-run-panel__footer">
      <span>扫描只读，不会删除文件。</span>
      <button
        type="submit"
        class="analysis-run-panel__start"
        :disabled="!canStart"
      >
        <AppIcon :name="starting ? 'scan' : 'play'" :size="18" />{{
          starting ? "正在提交…" : "开始扫描"
        }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import AppIcon from "@/components/ui/AppIcon.vue";
import type { AnalysisTool } from "@/utils/analysisTools";

defineProps<{
  tool: AnalysisTool;
  scopes: string[];
  scopeInput: string;
  includesRoot: boolean;
  rootConfirmed: boolean;
  canStart: boolean;
  starting: boolean;
}>();

const emit = defineEmits<{
  "update:scopeInput": [value: string];
  "update:rootConfirmed": [value: boolean];
  add: [];
  remove: [scope: string];
  start: [];
  browse: [];
}>();

function updateScopeInput(event: Event) {
  emit("update:scopeInput", (event.target as HTMLInputElement).value);
}

function updateRootConfirmed(event: Event) {
  emit("update:rootConfirmed", (event.target as HTMLInputElement).checked);
}
</script>

<style scoped>
.analysis-run-panel {
  display: grid;
  min-width: 0;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--borderPrimary);
  border-radius: 10px;
  background: var(--surfacePrimary);
}
.analysis-run-panel__heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.analysis-run-panel__heading h2 {
  margin: 0;
  color: var(--textSecondary);
  font-size: 14px;
  font-weight: 600;
}
.analysis-run-panel__heading small,
.analysis-run-panel__empty,
.analysis-run-panel__footer > span,
.analysis-run-panel__advanced p {
  margin: 0;
  color: var(--textPrimary);
  font-size: 12px;
  line-height: 1.5;
}
.analysis-run-panel__scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.analysis-run-panel__scopes > span {
  display: grid;
  grid-template-columns: auto minmax(0, auto) auto;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  padding-inline-start: 10px;
  border: 1px solid var(--borderPrimary);
  border-radius: 8px;
  background: var(--surfaceSecondary);
  font-size: 12px;
}
.analysis-run-panel__scopes b {
  overflow: hidden;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.analysis-run-panel__scopes button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 7px;
  color: var(--textPrimary);
  background: transparent;
  cursor: pointer;
}
.analysis-run-panel__scopes button:hover {
  color: var(--red);
  background: var(--hover);
}
.analysis-run-panel__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 8px 16px;
}
.analysis-run-panel__browse,
.analysis-run-panel__input button,
.analysis-run-panel__start {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 12px;
  border: 1px solid var(--borderPrimary);
  border-radius: 7px;
  color: var(--textSecondary);
  background: var(--surfacePrimary);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}
.analysis-run-panel__browse:hover,
.analysis-run-panel__input button:hover {
  background: var(--hover);
}
.analysis-run-panel button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.analysis-run-panel button:focus-visible,
.analysis-run-panel summary:focus-visible,
.analysis-run-panel input:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}
.analysis-run-panel__advanced {
  flex: 1 1 240px;
  min-width: 0;
}
.analysis-run-panel__advanced summary {
  display: flex;
  min-height: 40px;
  align-items: center;
  width: fit-content;
  color: var(--textPrimary);
  font-size: 12px;
  cursor: pointer;
}
.analysis-run-panel__advanced p {
  margin-top: 6px;
}
.analysis-run-panel__input {
  display: flex;
  gap: 8px;
  max-width: 640px;
}
.analysis-run-panel__input input {
  min-width: 0;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--borderPrimary);
  border-radius: 7px;
  color: var(--textSecondary);
  background: var(--surfacePrimary);
}
.analysis-run-panel__input button {
  flex: 0 0 auto;
}
.analysis-run-panel__root-confirm {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border: 1px solid
    color-mix(in srgb, var(--icon-orange) 30%, var(--borderPrimary));
  border-radius: 8px;
  background: color-mix(in srgb, var(--icon-orange) 6%, transparent);
  font-size: 12px;
  line-height: 1.5;
}
.analysis-run-panel__root-confirm input {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
}
.analysis-run-panel__root-confirm span {
  display: grid;
  gap: 2px;
}
.analysis-run-panel__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.analysis-run-panel__start {
  color: white;
  border-color: var(--blue);
  background: var(--blue);
}
@media (max-width: 680px) {
  .analysis-run-panel {
    padding: 12px;
  }
  .analysis-run-panel__browse,
  .analysis-run-panel__input button,
  .analysis-run-panel__advanced summary,
  .analysis-run-panel__start {
    min-height: 44px;
  }
  .analysis-run-panel__footer {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
