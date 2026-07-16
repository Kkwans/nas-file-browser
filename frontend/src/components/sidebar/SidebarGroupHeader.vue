<template>
  <div
    class="sidebar-group-header sidebar-level-two"
    role="button"
    tabindex="0"
    :aria-expanded="expanded"
    :aria-label="expanded ? `收起${label}` : `展开${label}`"
    @click="$emit('toggle')"
    @keydown.enter.prevent="$emit('toggle')"
    @keydown.space.prevent="$emit('toggle')"
  >
    <i
      class="material-icons favorite-group-icon"
      :style="{ color }"
      aria-hidden="true"
      >{{ icon }}</i
    >
    <span class="group-name">{{ label }}</span>
    <span class="category-count">{{ count }}</span>
    <span class="sidebar-group-actions">
      <slot name="actions"></slot>
    </span>
    <i
      class="material-icons category-arrow"
      :class="{ expanded }"
      aria-hidden="true"
      >expand_more</i
    >
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string;
    label: string;
    count: number;
    expanded: boolean;
    color?: string;
  }>(),
  { color: "var(--blue, #1677ff)" }
);

defineEmits<{ toggle: [] }>();
</script>
