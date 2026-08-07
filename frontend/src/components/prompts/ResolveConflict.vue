<template>
  <div class="card floating">
    <div class="card-title">
      <h2>
        {{ personalized ? "解决冲突" : "替换或跳过" }}
      </h2>
    </div>

    <div class="card-content">
      <template v-if="personalized">
        <p v-if="isUploadAction != true">
          如果选择保留两个版本，副本文件名将添加数字后缀。
        </p>
        <div class="conflict-list-container">
          <div>
            <p>
              <input
                @change="toogleCheckAll"
                type="checkbox"
                :checked="originAllChecked"
                value="origin"
              />
              {{ isUploadAction != true ? "源位置文件" : "上传文件" }}
            </p>
            <p>
              <input
                @change="toogleCheckAll"
                type="checkbox"
                :checked="destAllChecked"
                value="dest"
              />
              目标位置文件
            </p>
          </div>
          <div>
            <template v-for="(item, index) in conflict" :key="index">
              <div class="conflict-file-name">
                <span>{{ item.name }}</span>

                <template v-if="item.checked.length == 2">
                  <span v-if="isUploadAction != true" class="result-rename">
                    重命名
                  </span>
                  <span v-else class="result-error"> 权限错误 </span>
                </template>
                <span
                  v-else-if="
                    item.checked.length == 1 && item.checked[0] == 'origin'
                  "
                  class="result-override"
                >
                  覆盖
                </span>
                <span v-else class="result-skip"> 跳过 </span>
              </div>
              <div>
                <input v-model="item.checked" type="checkbox" value="origin" />
                <div>
                  <p class="conflict-file-value">
                    {{ humanTime(item.origin.lastModified) }}
                  </p>
                  <p class="conflict-file-value">
                    {{ humanSize(item.origin.size) }}
                  </p>
                </div>
              </div>
              <div>
                <input v-model="item.checked" type="checkbox" value="dest" />
                <div>
                  <p class="conflict-file-value">
                    {{ humanTime(item.dest.lastModified) }}
                  </p>
                  <p class="conflict-file-value">
                    {{ humanSize(item.dest.size) }}
                  </p>
                </div>
              </div>
            </template>
          </div>
        </div>
      </template>
      <template v-else>
        <p>
          {{ "目标文件夹中有 " + conflict.length + " 个同名文件" }}
        </p>

        <div class="result-buttons">
          <button @click="(e) => resolve(e, ['origin'])">
            <i class="material-icons">done_all</i>
            替换目标文件夹中的所有文件
          </button>
          <button
            v-if="isUploadAction != true"
            @click="(e) => resolve(e, ['origin', 'dest'])"
          >
            <i class="material-icons">folder_copy</i>
            重命名所有文件（创建副本）
          </button>
          <button @click="(e) => resolve(e, ['dest'])">
            <i class="material-icons">undo</i>
            跳过所有冲突文件
          </button>
          <button @click="(e) => resume(e)">
            <i class="material-icons">replay</i>
            恢复传输
            <span class="info-tooltip" @click.stop="() => {}">
              <i class="material-icons info-icon">info_outline</i>
              <span class="info-tooltip-text">
                跳过所有冲突文件，除了服务器上较小的文件（可能传输中断）。
              </span>
            </span>
          </button>
          <button @click="personalized = true">
            <i class="material-icons">checklist</i>
            逐个处理冲突文件
          </button>
        </div>
      </template>
    </div>

    <div class="card-action" style="display: flex; justify-content: end">
      <div>
        <button
          class="button button--flat button--grey"
          @click="close"
          aria-label="取消"
          title="取消"
          tabindex="4"
        >
          取消
        </button>
        <button
          v-if="personalized"
          id="focus-prompt"
          class="button button--flat"
          @click="(event) => currentPrompt?.confirm(event, conflict)"
          aria-label="确定"
          title="确定"
          tabindex="1"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useLayoutStore } from "@/stores/layout";
import { filesize } from "@/utils";
import dayjs from "@/utils/date";
import type { ConflictingResource } from "@/types/file";

const layoutStore = useLayoutStore();
const { currentPrompt } = layoutStore;

const conflict = ref<ConflictingResource[]>(currentPrompt?.props.conflict);

const isUploadAction = ref<boolean | undefined>(
  currentPrompt?.props.isUploadAction
);

const personalized = ref(false);

const originAllChecked = computed(() => {
  for (const item of conflict.value) {
    if (!item.checked.includes("origin")) return false;
  }

  return true;
});

const destAllChecked = computed(() => {
  for (const item of conflict.value) {
    if (!item.checked.includes("dest")) return false;
  }

  return true;
});

const close = () => {
  layoutStore.closeHovers();
};

const humanSize = (size: number | undefined) => {
  return size == undefined ? "Unknown size" : filesize(size);
};

const humanTime = (modified: string | number | undefined) => {
  if (modified == undefined) return "Unknown date";

  return dayjs(modified).format("L LT");
};

const resume = (event: Event) => {
  conflict.value.forEach((item) => {
    if (item.isSmallerOnServer) {
      item.checked = ["origin"];
    } else {
      item.checked = ["dest"];
    }
  });
  currentPrompt?.confirm(event, conflict.value);
};

const resolve = (event: Event, result: Array<"origin" | "dest">) => {
  for (const item of conflict.value) {
    item.checked = result;
  }
  currentPrompt?.confirm(event, conflict.value);
};

const toogleCheckAll = (e: Event) => {
  const target = e.currentTarget as HTMLInputElement;
  const value = target.value as "origin" | "dest" | "both";
  const checked = target.checked;

  for (const item of conflict.value) {
    if (value == "both") {
      item.checked = ["origin", "dest"];
    } else {
      if (!item.checked.includes(value)) {
        if (checked) {
          item.checked.push(value);
        }
      } else {
        if (!checked) {
          item.checked = value == "dest" ? ["origin"] : ["dest"];
        }
      }
    }
  }
};
</script>
<style scoped>
.conflict-list-container {
  max-height: 300px;
  overflow: auto;
}

.conflict-list-container > div {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: solid 1px var(--textPrimary);
  gap: 0.5rem 0.25rem;
}

.conflict-list-container > div:last-child {
  border-bottom: none;
}

.conflict-list-container > div > div {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.conflict-file-name {
  grid-column: 1 / -1;
  color: var(--textPrimary);
  font-size: 0.8rem;
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.25rem;
}

.conflict-file-value {
  color: var(--textPrimary);
  font-size: 0.9rem;
  margin: 0;
}

.result-rename,
.result-override,
.result-error,
.result-skip {
  font-size: 0.75rem;
  line-height: 0.75rem;
  border-radius: 0.75rem;
  padding: 0.15rem 0.5rem;
}

.result-override {
  background-color: var(--input-green);
}

.result-error {
  background-color: var(--icon-red);
}
.result-rename {
  background-color: var(--icon-orange);
}
.result-skip {
  background-color: var(--icon-blue);
}

.result-buttons > button {
  padding: 0.75rem;
  color: var(--textPrimary);
  margin: 0.25rem 0;
  display: flex;
  justify-content: start;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  border: solid 1px transparent;
  width: 100%;
  transition: all ease-in-out 200ms;
  cursor: pointer;
  border-radius: 0.25rem;
}

.result-buttons > button:hover {
  border: solid 1px var(--icon-blue);
}

.info-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.info-icon {
  font-size: 1rem;
  color: var(--icon-blue);
  cursor: help;
}

.info-tooltip-text {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--surfacePrimary, #333);
  color: var(--textPrimary, #fff);
  font-size: 0.75rem;
  line-height: 1.3;
  padding: 0.5rem 0.75rem;
  border-radius: 0.25rem;
  width: 220px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: opacity 200ms ease-in-out;
  z-index: 10;
  pointer-events: none;
}

.info-tooltip:hover .info-tooltip-text {
  visibility: visible;
  opacity: 1;
}
</style>
