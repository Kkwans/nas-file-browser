<template>
  <div class="sidebar-section-header sidebar-level-one" :class="toneClass">
    <button
      class="section-toggle"
      type="button"
      :aria-expanded="expanded"
      @click="$emit('toggle')"
    >
      <i class="material-icons">{{ icon }}</i>
      <span>{{ label }}</span>
    </button>
    <div class="section-tools">
      <slot name="tools"></slot>
      <button
        class="section-action-btn section-collapse-btn"
        type="button"
        :aria-label="expanded ? `收起${label}` : `展开${label}`"
        @click="$emit('toggle')"
      >
        <i class="material-icons section-arrow" :class="{ expanded }"
          >expand_more</i
        >
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    icon: string;
    label: string;
    expanded: boolean;
    tone?: "default" | "favorite";
  }>(),
  { tone: "default" }
);

defineEmits<{ toggle: [] }>();

const toneClass = computed(() => `sidebar-section-header--${props.tone}`);
</script>
