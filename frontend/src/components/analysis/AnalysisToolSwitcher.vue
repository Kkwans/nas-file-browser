<template>
  <nav class="analysis-tool-switcher" aria-label="选择存储工具">
    <button
      v-for="tool in tools"
      :key="tool.id"
      type="button"
      :class="{ 'is-active': tool.id === activeTool }"
      :aria-pressed="tool.id === activeTool"
      @click="$emit('select', tool.id)"
    >
      <span class="analysis-tool-switcher__icon">
        <AppIcon :name="tool.content.icon" :size="20" />
      </span>
      <span>
        <strong>{{ tool.content.label }}</strong>
        <small>{{ tool.content.summary }}</small>
      </span>
    </button>
  </nav>
</template>

<script setup lang="ts">
import AppIcon from "@/components/ui/AppIcon.vue";
import { analysisToolContent, type AnalysisTool } from "@/utils/analysisTools";

defineProps<{ activeTool: AnalysisTool }>();

defineEmits<{
  select: [tool: AnalysisTool];
}>();

const tools = (Object.keys(analysisToolContent) as AnalysisTool[]).map(
  (id) => ({
    id,
    content: analysisToolContent[id],
  })
);
</script>

<style scoped>
.analysis-tool-switcher {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 0;
}

.analysis-tool-switcher button {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  min-height: 72px;
  align-items: center;
  gap: 13px;
  padding: 10px 16px;
  border: 1px solid var(--borderPrimary);
  border-radius: 12px;
  color: var(--textPrimary);
  background: var(--surfacePrimary);
  cursor: pointer;
  text-align: left;
  transition:
    color 120ms ease,
    background-color 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease;
}

.analysis-tool-switcher button:hover {
  border-color: color-mix(in srgb, var(--blue) 28%, var(--borderPrimary));
  background: color-mix(in srgb, var(--blue) 3%, var(--surfacePrimary));
}

.analysis-tool-switcher button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 1px;
}

.analysis-tool-switcher button.is-active {
  color: var(--blue);
  border-color: color-mix(in srgb, var(--blue) 42%, var(--borderPrimary));
  background: color-mix(in srgb, var(--blue) 7%, var(--surfacePrimary));
  box-shadow: 0 5px 16px color-mix(in srgb, var(--blue) 8%, transparent);
}

.analysis-tool-switcher__icon {
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid color-mix(in srgb, currentColor 16%, transparent);
  border-radius: 11px;
  color: currentColor;
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.analysis-tool-switcher button > span:last-child {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.analysis-tool-switcher strong {
  color: var(--textSecondary);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.25;
}

.analysis-tool-switcher small {
  overflow: hidden;
  color: var(--textPrimary);
  font-size: 12px;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .analysis-tool-switcher {
    width: 100%;
  }

  .analysis-tool-switcher button {
    grid-template-columns: 34px minmax(0, 1fr);
    min-height: 60px;
    gap: 10px;
    padding-inline: 12px;
  }

  .analysis-tool-switcher__icon {
    width: 34px;
    height: 34px;
  }

  .analysis-tool-switcher strong {
    font-size: 14px;
  }

  .analysis-tool-switcher small {
    font-size: 11px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-tool-switcher button {
    transition: none;
  }
}
</style>
