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
  gap: 3px;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  padding: 3px;
  border: 1px solid var(--borderPrimary);
  border-radius: 10px;
  background: color-mix(
    in srgb,
    var(--surfaceSecondary) 72%,
    var(--surfacePrimary)
  );
}

.analysis-tool-switcher button {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  min-height: 50px;
  align-items: center;
  gap: 10px;
  padding: 5px 12px;
  border: 0;
  border-radius: 7px;
  color: var(--textPrimary);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition:
    color 120ms ease,
    background-color 120ms ease,
    box-shadow 120ms ease;
}

.analysis-tool-switcher button:hover {
  background: var(--hover);
}

.analysis-tool-switcher button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 1px;
}

.analysis-tool-switcher button.is-active {
  color: var(--blue);
  background: var(--surfacePrimary);
  box-shadow: 0 1px 4px color-mix(in srgb, var(--textSecondary) 8%, transparent);
}

.analysis-tool-switcher__icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  color: currentColor;
  background: color-mix(in srgb, currentColor 8%, transparent);
}

.analysis-tool-switcher button > span:last-child {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.analysis-tool-switcher strong {
  color: var(--textSecondary);
  font-size: 13px;
  font-weight: 700;
}

.analysis-tool-switcher small {
  overflow: hidden;
  color: var(--textPrimary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .analysis-tool-switcher {
    width: 100%;
  }

  .analysis-tool-switcher button {
    grid-template-columns: 30px minmax(0, 1fr);
    min-height: 46px;
    padding-inline: 8px;
  }

  .analysis-tool-switcher__icon {
    width: 30px;
    height: 30px;
  }

  .analysis-tool-switcher small {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-tool-switcher button {
    transition: none;
  }
}
</style>
