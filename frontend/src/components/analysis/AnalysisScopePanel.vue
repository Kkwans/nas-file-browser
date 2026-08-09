<template>
  <section class="analysis-run-panel" aria-labelledby="analysis-title">
    <div class="analysis-run-panel__header">
      <span class="analysis-run-panel__mark" aria-hidden="true">
        <AppIcon :name="content.icon" :size="24" />
      </span>
      <div>
        <h1 id="analysis-title">{{ content.title }}</h1>
        <p>{{ content.description }}</p>
      </div>
      <span class="analysis-run-panel__safety">
        <AppIcon name="shield-check" :size="16" />
        只读 · 并发 1
      </span>
    </div>

    <div class="analysis-run-panel__body">
      <div class="analysis-run-panel__step">
        <span>步骤 1</span>
        <div>
          <h2>选择扫描范围</h2>
          <p>支持文件或目录；父目录已包含的子路径会自动合并。</p>
        </div>
        <small aria-live="polite">{{ scopes.length }} / 32</small>
      </div>

      <form class="analysis-run-panel__input" @submit.prevent="$emit('add')">
        <AppIcon name="folder" :size="19" />
        <input
          :value="scopeInput"
          type="text"
          autocomplete="off"
          placeholder="例如 /照片/2026"
          aria-label="添加扫描路径"
          @input="updateScopeInput"
        />
        <button type="submit" :disabled="!scopeInput.trim()">添加范围</button>
      </form>

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
      <div v-else class="analysis-run-panel__empty">
        <AppIcon name="info" :size="18" />
        <span>从文件列表选中项目后点击“分析”，或在这里输入路径。</span>
      </div>

      <label v-if="includesRoot" class="analysis-run-panel__root-confirm">
        <input
          :checked="rootConfirmed"
          type="checkbox"
          @change="updateRootConfirmed"
        />
        <span>
          <strong>确认扫描整个可访问范围</strong>
          根目录可能唤醒更多磁盘并持续较长时间，可随时在任务中心取消。
        </span>
      </label>
    </div>

    <footer class="analysis-run-panel__footer">
      <div class="analysis-run-panel__step analysis-run-panel__step--confirm">
        <span>步骤 2</span>
        <div>
          <h2>确认并运行</h2>
          <p>不会后台定时扫描；每次都需要你主动开始。</p>
        </div>
      </div>
      <button
        type="button"
        class="analysis-run-panel__start"
        :disabled="!canStart"
        @click="$emit('start')"
      >
        <AppIcon :name="starting ? 'scan' : 'play'" :size="18" />
        {{ starting ? "正在提交…" : content.action }}
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import {
  getAnalysisToolContent,
  type AnalysisTool,
} from "@/utils/analysisTools";

const props = defineProps<{
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
}>();

const content = computed(() => getAnalysisToolContent(props.tool));

function updateScopeInput(event: Event) {
  emit("update:scopeInput", (event.target as HTMLInputElement).value);
}

function updateRootConfirmed(event: Event) {
  emit("update:rootConfirmed", (event.target as HTMLInputElement).checked);
}
</script>

<style scoped>
.analysis-run-panel {
  margin-top: 12px;
  overflow: hidden;
  border: 1px solid var(--borderPrimary);
  border-radius: 14px;
  background: var(--surfacePrimary);
  box-shadow: 0 8px 24px
    color-mix(in srgb, var(--textSecondary) 5%, transparent);
}

.analysis-run-panel__header {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--borderPrimary);
}

.analysis-run-panel__mark {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 12px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 10%, transparent);
}

.analysis-run-panel__header h1,
.analysis-run-panel__header p,
.analysis-run-panel__step h2,
.analysis-run-panel__step p {
  margin: 0;
}

.analysis-run-panel__header h1 {
  color: var(--textSecondary);
  font-size: 18px;
  line-height: 1.35;
  letter-spacing: -0.01em;
}

.analysis-run-panel__header p {
  max-width: 68ch;
  margin-top: 4px;
  color: var(--textPrimary);
  font-size: 12px;
  line-height: 1.6;
}

.analysis-run-panel__safety {
  display: inline-flex;
  min-height: 32px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border: 1px solid color-mix(in srgb, #16845d 22%, var(--borderPrimary));
  border-radius: 8px;
  color: #16845d;
  background: color-mix(in srgb, #1ea672 7%, transparent);
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.analysis-run-panel__body {
  padding: 18px 20px 16px;
}

.analysis-run-panel__step {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.analysis-run-panel__step > span {
  display: inline-flex;
  min-height: 24px;
  align-items: center;
  padding: 0 7px;
  border-radius: 6px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 9%, transparent);
  font-size: 10px;
  font-weight: 800;
}

.analysis-run-panel__step h2 {
  color: var(--textSecondary);
  font-size: 14px;
}

.analysis-run-panel__step p,
.analysis-run-panel__step small {
  margin-top: 2px;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-run-panel__input {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 4px 4px 4px 11px;
  border: 1px solid var(--borderPrimary);
  border-radius: 10px;
  color: var(--textPrimary);
  background: var(--surfaceSecondary);
}

.analysis-run-panel__input input {
  min-width: 0;
  min-height: 40px;
  border: 0;
  outline: 0;
  color: var(--textSecondary);
  background: transparent;
}

.analysis-run-panel__input button,
.analysis-run-panel__start {
  min-height: 40px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
}

.analysis-run-panel__input button {
  padding: 0 14px;
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 9%, var(--surfacePrimary));
}

.analysis-run-panel__input button:disabled,
.analysis-run-panel__start:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.analysis-run-panel__scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 10px;
}

.analysis-run-panel__scopes > span {
  display: grid;
  grid-template-columns: auto minmax(0, auto) auto;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 40px;
  padding-left: 10px;
  border: 1px solid color-mix(in srgb, var(--blue) 18%, var(--borderPrimary));
  border-radius: 8px;
  color: var(--textSecondary);
  background: color-mix(in srgb, var(--blue) 4%, var(--surfacePrimary));
  font-size: 11px;
}

.analysis-run-panel__scopes b {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analysis-run-panel__scopes button {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 7px;
  color: var(--textPrimary);
  background: transparent;
  cursor: pointer;
}

.analysis-run-panel__scopes button:hover,
.analysis-run-panel__scopes button:focus-visible {
  color: var(--red);
  background: var(--hover);
}

.analysis-run-panel__scopes button:focus-visible,
.analysis-run-panel__input button:focus-visible,
.analysis-run-panel__start:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 1px;
}

.analysis-run-panel__empty {
  display: flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding: 0 11px;
  border: 1px dashed var(--borderPrimary);
  border-radius: 8px;
  color: var(--textPrimary);
  font-size: 11px;
}

.analysis-run-panel__root-confirm {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 11px;
  padding: 10px 11px;
  border: 1px solid
    color-mix(in srgb, var(--icon-orange) 26%, var(--borderPrimary));
  border-radius: 8px;
  background: color-mix(in srgb, var(--icon-orange) 6%, transparent);
  font-size: 11px;
  line-height: 1.5;
}

.analysis-run-panel__root-confirm input {
  width: 18px;
  height: 18px;
  margin-top: 1px;
}

.analysis-run-panel__root-confirm span {
  display: grid;
  gap: 1px;
}

.analysis-run-panel__root-confirm strong {
  color: var(--textSecondary);
}

.analysis-run-panel__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 20px;
  border-top: 1px solid var(--borderPrimary);
  background: color-mix(in srgb, var(--surfaceSecondary) 72%, transparent);
}

.analysis-run-panel__step--confirm {
  grid-template-columns: auto minmax(0, 1fr);
}

.analysis-run-panel__start {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 15px;
  color: #fff;
  background: var(--blue);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--blue) 22%, transparent);
}

.analysis-run-panel__start:not(:disabled):active {
  transform: translateY(1px);
}

@media (max-width: 680px) {
  .analysis-run-panel__header {
    grid-template-columns: 42px minmax(0, 1fr);
    padding: 15px;
  }

  .analysis-run-panel__mark {
    width: 42px;
    height: 42px;
  }

  .analysis-run-panel__safety {
    grid-column: 2;
    justify-self: start;
  }

  .analysis-run-panel__body {
    padding: 15px;
  }

  .analysis-run-panel__input input,
  .analysis-run-panel__input button {
    min-height: 44px;
  }

  .analysis-run-panel__footer {
    align-items: stretch;
    flex-direction: column;
    padding: 12px 15px 15px;
  }

  .analysis-run-panel__start {
    width: 100%;
    min-height: 44px;
  }
}

@media (max-width: 460px) {
  .analysis-run-panel__input {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .analysis-run-panel__input button {
    grid-column: 1 / -1;
    min-height: 44px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-run-panel__start {
    transition: none;
  }
}
</style>
