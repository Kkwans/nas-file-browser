<template>
  <button @click="action" :aria-label="computedLabel" :title="computedLabel" class="action">
    <i class="material-icons">{{ icon }}</i>
    <span>{{ computedLabel }}</span>
    <span v-if="counter && counter > 0" class="counter">{{ counter }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useLayoutStore } from "@/stores/layout";
import { T } from "@/utils/translations";

const props = defineProps<{
  icon?: string;
  label?: string;
  counter?: number;
  show?: string;
}>();

const emit = defineEmits<{
  (e: "action"): void;
}>();

const layoutStore = useLayoutStore();

// 解析 label 中的翻译键字符串
// 处理两种模式：
// 1. t('buttons.search') -> 直接翻译键
// 2. t('buttons.xxx').split('|')[0] -> 带 split 后处理的翻译键
function resolveLabel(raw: string | undefined): string {
  if (!raw) return "";

  // 模式2: t('xxx').split('|')[0]
  const splitMatch = raw.match(/^t\(['"]([^'"]+)['"]\)\.split\(['"](.+)['"]\)\[0\]$/);
  if (splitMatch) {
    const translated = (T as Record<string, string>)[splitMatch[1]] ?? splitMatch[1];
    return translated.split(splitMatch[2])[0];
  }

  // 模式1: t('xxx')
  const directMatch = raw.match(/^t\(['"]([^'"]+)['"]\)$/);
  if (directMatch) {
    return (T as Record<string, string>)[directMatch[1]] ?? raw;
  }

  // 已是非翻译键字符串，直接返回
  return raw;
}

const computedLabel = computed(() => resolveLabel(props.label));

const action = () => {
  if (props.show) {
    layoutStore.showHover(props.show);
  }

  emit("action");
};
</script>
