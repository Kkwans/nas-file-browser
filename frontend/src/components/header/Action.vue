<template>
  <IconButton
    class="action"
    :icon="resolvedIconName"
    :icon-size="iconSize"
    :label="label"
    :counter="counter"
    :disabled="disabled"
    @click="action"
  >
    <span v-if="label">{{ label }}</span>
  </IconButton>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import IconButton from "@/components/ui/IconButton.vue";
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
