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
      <span class="analysis-tool-switcher__icon" aria-hidden="true">
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
  gap: 0;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
  border: 1px solid var(--borderPrimary);
  border-radius: 12px;
  background: var(--surfacePrimary);
}

.analysis-tool-switcher button {
  display: grid;
  position: relative;
  grid-template-columns: 34px minmax(0, 1fr);
  min-height: 64px;
  align-items: center;
  gap: 11px;
  padding: 10px 18px;
  border: 0;
  border-right: 1px solid var(--borderPrimary);
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
  background: color-mix(in srgb, var(--blue) 3%, var(--surfacePrimary));
}

.analysis-tool-switcher button:last-child {
  border-right: 0;
}

.analysis-tool-switcher button:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 1px;
}

.analysis-tool-switcher button.is-active {
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 6%, var(--surfacePrimary));
}

.analysis-tool-switcher button.is-active::after {
  position: absolute;
  right: 18px;
  bottom: 0;
  left: 18px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--blue);
  content: "";
}

.analysis-tool-switcher__icon {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 0;
  border-radius: 9px;
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
  font-size: 14px;
  font-weight: 700;
  line-height: 1.25;
}

.analysis-tool-switcher small {
  overflow: hidden;
  color: var(--textPrimary);
  font-size: 11px;
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
    min-height: 58px;
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
    font-size: 10px;
  }

  .analysis-tool-switcher button.is-active::after {
    right: 12px;
    left: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .analysis-tool-switcher button {
    transition: none;
  }
}
</style>
