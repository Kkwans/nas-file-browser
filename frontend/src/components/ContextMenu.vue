<template>
  <div
    class="context-menu"
    ref="contextMenu"
    role="menu"
    tabindex="-1"
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

const emit = defineEmits(["hide"]);
const props = defineProps<{ show: boolean; pos: { x: number; y: number } }>();
const contextMenu = ref<HTMLElement | null>(null);
let previouslyFocused: HTMLElement | null = null;

const left = computed(() => {
  const menuWidth = contextMenu.value?.clientWidth ?? 0;
  const x = Math.min(props.pos.x, window.innerWidth - menuWidth - 8);
  return Math.max(8, x);
});

const top = computed(() => {
  const menuHeight = contextMenu.value?.clientHeight ?? 0;
  // The menu is viewport anchored. Adding scrollY here makes it drift down
  // on a scrolled listing and can push it below the visible viewport.
  const maxY = window.innerHeight - menuHeight - 8;
  return Math.max(8, Math.min(props.pos.y, maxY));
});

const hideContextMenu = () => {
  emit("hide");
};

const menuItems = () =>
  Array.from(
    contextMenu.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [role="menuitem"]:not([aria-disabled="true"])'
    ) ?? []
  ).filter((item) => item.getClientRects().length > 0);

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape") {
    e.preventDefault();
    hideContextMenu();
    return;
  }
  if (
    e.key !== "ArrowDown" &&
    e.key !== "ArrowUp" &&
    e.key !== "Home" &&
    e.key !== "End"
  )
    return;
  const items = menuItems();
  if (items.length === 0) return;
  e.preventDefault();
  const current = items.indexOf(document.activeElement as HTMLElement);
  const index =
    e.key === "Home"
      ? 0
      : e.key === "End"
        ? items.length - 1
        : (current + (e.key === "ArrowDown" ? 1 : -1) + items.length) %
          items.length;
  items[index].focus();
};

watch(
  () => props.show,
  (val) => {
    if (val) {
      previouslyFocused =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      // Use setTimeout to avoid the current click event immediately closing the menu
      setTimeout(() => {
        const items = menuItems();
        (items[0] ?? contextMenu.value)?.focus();
        document.addEventListener("click", hideContextMenu);
        document.addEventListener("keydown", handleKeydown);
      }, 0);
    } else {
      document.removeEventListener("click", hideContextMenu);
      document.removeEventListener("keydown", handleKeydown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus({ preventScroll: true });
      }
      previouslyFocused = null;
    }
  }
);

onUnmounted(() => {
  document.removeEventListener("click", hideContextMenu);
  document.removeEventListener("keydown", handleKeydown);
});
</script>
