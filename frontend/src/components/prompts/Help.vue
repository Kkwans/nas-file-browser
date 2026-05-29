<template>
  <div class="card floating help">
    <div class="card-title">
      <h2>{{ t("help.title") }}</h2>
    </div>

    <div class="card-content">
      <ul>
        <li><strong>F1</strong> - {{ t("help.f1") }}</li>
        <li><strong>F2</strong> - {{ t("help.f2") }}</li>
        <li><strong>DEL</strong> - {{ t("help.del") }}</li>
        <li><strong>ESC</strong> - {{ t("help.esc") }}</li>
        <li><strong>↑ ↓</strong> - {{ t("help.arrowKeys") }}</li>
        <li><strong>Shift + ↑ ↓</strong> - {{ t("help.shiftArrow") }}</li>
        <li><strong>Enter</strong> - {{ t("help.enter") }}</li>
        <li><strong>Home / End</strong> - {{ t("help.homeEnd") }}</li>
        <li><strong>PageUp / PageDown</strong> - {{ t("help.pageUpDown") }}</li>
        <li><strong>CTRL + S</strong> - {{ t("help.ctrlS") }}</li>
        <li><strong>CTRL + C</strong> - {{ t("help.ctrlC") }}</li>
        <li><strong>CTRL + X</strong> - {{ t("help.ctrlX") }}</li>
        <li><strong>CTRL + V</strong> - {{ t("help.ctrlV") }}</li>
        <li><strong>CTRL + A</strong> - {{ t("help.ctrlA") }}</li>
        <li><strong>CTRL + SHIFT + F</strong> - {{ t("help.ctrlShiftF") }}</li>
        <li><strong>CTRL + Click</strong> - {{ t("help.ctrlClick") }}</li>
        <li><strong>Click</strong> - {{ t("help.click") }}</li>
        <li><strong>Double click</strong> - {{ t("help.doubleClick") }}</li>
        <li><strong>Space</strong> - {{ t("help.space") }}</li>
      </ul>
    </div>

    <div class="card-action">
      <button
        id="focus-prompt"
        type="submit"
        @click="closeHovers"
        class="button button--flat"
        :aria-label="t('help.ok')"
        :title="t('help.ok')"
        tabindex="1"
      >
        {{ t("help.ok") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import { t } from "@/utils/translations";
const layoutStore = useLayoutStore();
const closeHovers = () => layoutStore.closeHovers();
</script>
