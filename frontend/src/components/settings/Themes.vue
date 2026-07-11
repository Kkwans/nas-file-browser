<template>
  <select v-on:change="change" :value="theme">
    <option value="">默认</option>
    <option value="light">亮色</option>
    <option value="dark">暗色</option>
  </select>
</template>

<script setup lang="ts">
import type { SelectHTMLAttributes } from "vue";
import type { UserTheme } from "@/types/user";
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

defineProps<{
  theme: UserTheme;
}>();

const emit = defineEmits<{
  (e: "update:theme", val: string | null): void;
}>();

const change = (event: Event) => {
  emit("update:theme", (event.target as SelectHTMLAttributes)?.value);
};
</script>
