<template>
  <select
    name="selectAceEditorTheme"
    v-on:change="change"
    :value="aceEditorTheme"
    :disabled="loading || Boolean(loadError)"
    :aria-busy="loading"
  >
    <option v-if="loading" value="">正在加载主题…</option>
    <option v-else-if="loadError" value="">主题列表加载失败</option>
    <option v-for="theme in themes" :value="theme.theme" :key="theme.theme">
      {{ theme.name }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { onMounted, ref, type SelectHTMLAttributes } from "vue";

type ThemeOption = {
  name: string;
  theme: string;
};

const themes = ref<ThemeOption[]>([]);
const loading = ref(true);
const loadError = ref(false);

defineProps<{
  aceEditorTheme: string;
}>();

const emit = defineEmits<{
  (e: "update:aceEditorTheme", val: string | null): void;
}>();

const change = (event: Event) => {
  emit("update:aceEditorTheme", (event.target as SelectHTMLAttributes)?.value);
};

onMounted(async () => {
  try {
    const { default: ace } = await import("ace-builds");
    const aceGlobal = globalThis as typeof globalThis & { ace: typeof ace };
    aceGlobal.ace = ace;
    const themeList = await import("ace-builds/src-noconflict/ext-themelist");
    themes.value = themeList.themes;
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
});
</script>
