<template>
  <div class="sidebar-group-header sidebar-level-two">
    <button
      class="sidebar-group-primary"
      type="button"
      @click="$emit('primary')"
    >
      <i class="material-icons" :style="{ color }">{{ icon }}</i>
      <span class="sidebar-group-name">{{ label }}</span>
      <span class="category-count">{{ count }}</span>
    </button>
    <div class="sidebar-group-tools">
      <slot name="actions"></slot>
      <button
        class="section-action-btn sidebar-group-toggle"
        type="button"
        :aria-label="expanded ? `收起${label}` : `展开${label}`"
        @click="$emit('toggle')"
      >
        <i class="material-icons category-arrow" :class="{ expanded }"
          >expand_more</i
        >
      </button>
    </div>
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

defineEmits<{ primary: []; toggle: [] }>();
</script>
