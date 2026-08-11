<template>
  <button
    @click="action"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    class="action"
  >
    <AppIcon
      v-if="appIcon"
      :name="appIcon"
      :size="iconSize"
      :stroke-width="1.9"
    />
    <i v-else class="material-icons" aria-hidden="true">{{ icon }}</i>
    <span>{{ label }}</span>
    <span v-if="counter && counter > 0" class="counter">{{ counter }}</span>
  </button>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import AppIcon from "@/components/ui/AppIcon.vue";
import type { AppIconName } from "@/components/ui/iconRegistry";

const props = withDefaults(
  defineProps<{
    icon?: string;
    appIcon?: AppIconName;
    iconSize?: number;
    label?: string;
    counter?: number;
    show?: string;
    disabled?: boolean;
  }>(),
  { iconSize: 20 }
);

const emit = defineEmits<{
  (e: "action"): void;
}>();

const layoutStore = useLayoutStore();

const action = () => {
  if (props.disabled) return;
  if (props.show) {
    layoutStore.showHover(props.show);
  }

  emit("action");
};
</script>
