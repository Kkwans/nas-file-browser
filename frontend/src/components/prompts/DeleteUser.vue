<template>
  <div class="card floating">
    <div class="card-content">
      <p>确认删除此用户？</p>
    </div>

    <div class="card-action">
      <button
        id="focus-prompt"
        class="button button--flat button--grey"
        @click="layoutStore.closeHovers"
        aria-label="取消"
        title="取消"
        tabindex="1"
      >
        {{ "取消" }}
      </button>
      <button
        class="button button--flat"
        @click="layoutStore.currentPrompt?.confirm"
        tabindex="2"
      >
        {{ "删除" }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import { T } from "@/utils/translations";

const t = (key: string, opts?: Record<string, any>): string => {
  let result = (T as any)[key] ?? key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      result = result.replace(new RegExp(`{\\s*${k}\\s*}`, "g"), String(v));
    }
  }
  return result;
};

const layoutStore = useLayoutStore();

// const emit = defineEmits<{
//   (e: "confirm"): void;
// }>();
</script>
