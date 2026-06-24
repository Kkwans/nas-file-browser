<template>
  <div
    class="context-menu"
    ref="contextMenu"
    v-show="show"
    :style="{
      top: `${top}px`,
      left: `${left}px`,
    }"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from "vue";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const emit = defineEmits(["hide"]);
const props = defineProps<{ show: boolean; pos: { x: number; y: number } }>();
const contextMenu = ref<HTMLElement | null>(null);

const left = computed(() => {
  const menuWidth = contextMenu.value?.clientWidth ?? 0;
  const x = Math.min(props.pos.x, window.innerWidth - menuWidth - 8);
  return Math.max(8, x);
});

const top = computed(() => {
  const menuHeight = contextMenu.value?.clientHeight ?? 0;
  const maxY = window.innerHeight + window.scrollY - menuHeight - 8;
  return Math.max(8, Math.min(props.pos.y, maxY));
});

const hideContextMenu = () => {
  emit("hide");
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    hideContextMenu();
  }
};

watch(
  () => props.show,
  (val) => {
    if (val) {
      // Use setTimeout to avoid the current click event immediately closing the menu
      setTimeout(() => {
        document.addEventListener("click", hideContextMenu);
        document.addEventListener("keydown", handleKeydown);
      }, 0);
    } else {
      document.removeEventListener("click", hideContextMenu);
      document.removeEventListener("keydown", handleKeydown);
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("click", hideContextMenu);
  document.removeEventListener("keydown", handleKeydown);
});
</script>
