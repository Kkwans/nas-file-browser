<template>
  <div class="card floating result-action-dialog">
    <div class="card-title">
      <h2>{{ title }}</h2>
    </div>

    <div v-if="mode === 'info'" class="card-content result-info">
      <div class="result-info-name">
        <i class="material-icons" aria-hidden="true">{{
          result.dir ? "folder" : "insert_drive_file"
        }}</i>
        <strong>{{ result.name }}</strong>
      </div>
      <dl>
        <div>
          <dt>类型</dt>
          <dd>{{ fileType }}</dd>
        </div>
        <div v-if="!result.dir">
          <dt>大小</dt>
          <dd>
            {{ result.size === null ? "无法读取" : filesize(result.size) }}
          </dd>
        </div>
        <div>
          <dt>修改时间</dt>
          <dd>{{ modifiedTime }}</dd>
        </div>
        <div class="path-row">
          <dt>完整路径</dt>
          <dd>
            <code>{{ result.path }}</code>
          </dd>
          <button type="button" title="复制完整路径" @click="copyPath">
            <i class="material-icons" aria-hidden="true">{{
              copied ? "check" : "content_copy"
            }}</i>
          </button>
        </div>
      </dl>
    </div>

    <div v-else class="card-content">
      <p>选择“{{ result.name }}”的目标目录：</p>
      <file-list
        ref="fileListRef"
        :exclude="result.dir && mode === 'move' ? [result.url] : []"
        @update:selected="destination = $event"
      />
    </div>

    <div class="card-action result-action-buttons">
      <button
        class="button button--flat button--grey"
        type="button"
        @click="close"
      >
        取消
      </button>
      <button
        v-if="mode !== 'info'"
        id="focus-prompt"
        class="button button--flat"
        type="button"
        :disabled="!destination || working"
        @click="transfer"
      >
        {{ working ? "处理中…" : title }}
      </button>
      <button
        v-else
        id="focus-prompt"
        class="button button--flat"
        type="button"
        @click="close"
      >
        确定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { files as api } from "@/api";
import { useLayoutStore } from "@/stores/layout";
import { getFileTypeLabel } from "@/utils/fileListing";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";
import type { ConflictResult, MoveCopyItem } from "@/types/file";
import * as upload from "@/utils/upload";
import FileList from "./FileList.vue";
import type { ExplorerResult } from "@/components/search/ResultExplorer.vue";

const props = defineProps<{
  mode: "copy" | "move" | "info";
  result: ExplorerResult;
}>();

const layoutStore = useLayoutStore();
const $showError = inject<IToastError>("$showError")!;
const destination = ref<string | null>(null);
const working = ref(false);
const copied = ref(false);

const title = computed(
  () => ({ copy: "复制", move: "移动", info: "详细信息" })[props.mode]
);
const fileType = computed(() => {
  const dot = props.result.name.lastIndexOf(".");
  return getFileTypeLabel({
    isDir: props.result.dir,
    extension: dot >= 0 ? props.result.name.slice(dot) : undefined,
  });
});
const modifiedTime = computed(() =>
  props.result.modified
    ? dayjs(props.result.modified).format("YYYY年M月D日 HH:mm:ss")
    : "未知"
);

function close() {
  layoutStore.closeHovers();
}

async function copyPath() {
  await navigator.clipboard.writeText(props.result.path);
  copied.value = true;
  window.setTimeout(() => (copied.value = false), 1500);
}

async function executeTransfer(item: MoveCopyItem) {
  working.value = true;
  try {
    if (props.mode === "copy") await api.copy([item], false, false);
    else await api.move([item], false, false);
    const action = layoutStore.currentPrompt?.action;
    close();
    action?.(new Event("result-action"));
  } catch (error: any) {
    $showError(error);
  } finally {
    working.value = false;
  }
}

async function transfer() {
  if (!destination.value || props.mode === "info") return;
  const item: MoveCopyItem = {
    from: props.result.url,
    to: `${destination.value}${encodeURIComponent(props.result.name)}`,
    name: props.result.name,
    size: props.result.size ?? undefined,
    modified: props.result.modified ?? undefined,
    isDir: props.result.dir,
    overwrite: false,
    rename: false,
  };

  const conflicts = await upload.checkConflict([item], destination.value);
  if (conflicts.length === 0) {
    await executeTransfer(item);
    return;
  }

  layoutStore.showHover({
    prompt: "resolve-conflict",
    props: { conflict: conflicts },
    confirm: (_event: Event, result: ConflictResult[]) => {
      layoutStore.closeHovers();
      const decision = result[0];
      if (!decision || decision.checked.length === 0) return;
      item.rename = decision.checked.length === 2;
      item.overwrite =
        decision.checked.length === 1 && decision.checked[0] === "origin";
      executeTransfer(item);
    },
  });
}
</script>

<style scoped>
.result-action-dialog {
  width: min(42rem, calc(100vw - 2rem));
}

.result-info-name {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.result-info-name .material-icons {
  color: var(--blue, #1677ff);
  font-size: 2rem;
}

.result-info dl,
.result-info dd {
  margin: 0;
}

.result-info dl > div {
  display: grid;
  grid-template-columns: 6rem minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.625rem 0;
  border-bottom: 1px solid var(--divider, #e2e8f0);
}

.result-info dt {
  color: var(--textSecondary, #64748b);
}

.path-row {
  position: relative;
}

.path-row dd {
  padding-right: 2.5rem;
  overflow-wrap: anywhere;
}

.path-row button {
  position: absolute;
  right: 0;
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  color: var(--blue, #1677ff);
  background: rgba(22, 119, 255, 0.08);
  border: 0;
  border-radius: 0.375rem;
  cursor: pointer;
}

.path-row button .material-icons {
  font-size: 1rem;
}

.result-action-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
