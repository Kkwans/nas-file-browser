<template>
  <div class="card floating help">
    <div class="card-title">
      <h2>{{ $t("help.help") }}</h2>
    </div>

    <div class="card-content">
      <ul>
        <li><strong>F1</strong> - {{ $t("help.f1") }}</li>
        <li><strong>F2</strong> - {{ $t("help.f2") }}</li>
        <li><strong>DEL</strong> - {{ $t("help.del") }}</li>
        <li><strong>ESC</strong> - {{ $t("help.esc") }}</li>
        <li><strong>↑ ↓</strong> - {{ $t("help.arrowNav") }}</li>
        <li><strong>Shift + ↑ ↓</strong> - {{ $t("help.arrowSelect") }}</li>
        <li><strong>Enter</strong> - {{ $t("help.enterOpen") }}</li>
        <li><strong>Home / End</strong> - {{ $t("help.homeEnd") }}</li>
        <li><strong>CTRL + S</strong> - {{ $t("help.ctrl.s") }}</li>
        <li><strong>CTRL + SHIFT + F</strong> - {{ $t("help.ctrl.f") }}</li>
        <li><strong>CTRL + Click</strong> - {{ $t("help.ctrl.click") }}</li>
        <li><strong>Click</strong> - {{ $t("help.click") }}</li>
        <li><strong>Double click</strong> - {{ $t("help.doubleClick") }}</li>
        <li><strong>Space</strong> - {{ $t("help.space") }}</li>
      </ul>
    </div>

    <div class="card-action">
      <button
        id="focus-prompt"
        type="submit"
        @click="closeHovers"
        class="button button--flat"
        :aria-label="$t('buttons.ok')"
        :title="$t('buttons.ok')"
        tabindex="1"
      >
        {{ $t("buttons.ok") }}
      </button>
    </div>
  </div>
</template>

<script>
import { mapActions } from "pinia";
import { useLayoutStore } from "@/stores/layout";

export default {
  name: "help",
  methods: {
    ...mapActions(useLayoutStore, ["closeHovers"]),
  },
};
</script>
