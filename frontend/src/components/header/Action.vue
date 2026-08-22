<template>
  <button
    @click="action"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    class="action"
  >
    <AppIcon :name="resolvedIconName" :size="iconSize" :stroke-width="1.9" />
    <span>{{ label }}</span>
    <span v-if="counter && counter > 0" class="counter">{{ counter }}</span>
  </button>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import AppIcon from "@/components/ui/AppIcon.vue";
import {
  resolveLegacyAppIcon,
  type AppIconName,
} from "@/components/ui/iconRegistry";
import { computed } from "vue";

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
const resolvedIconName = computed(
  () => props.appIcon ?? resolveLegacyAppIcon(props.icon)
);

const action = () => {
  if (props.disabled) return;
  if (props.show) {
    layoutStore.showHover(props.show);
  }

  emit("action");
};
</script>
