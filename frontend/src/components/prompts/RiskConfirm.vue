<template>
  <div class="card floating risk-confirm-card">
    <div class="card-content">
      <div class="risk-confirm-header">
        <i class="material-icons risk-confirm-icon" :class="'risk-' + riskLevel">warning</i>
        <span class="risk-confirm-title">{{ $t("prompts.riskConfirmTitle") }}</span>
      </div>
      <div class="risk-confirm-body">
        <p class="risk-confirm-level">
          <span class="risk-tag" :class="'risk-' + riskLevel">{{ riskLevelText }}</span>
          <span class="risk-path">{{ targetPath }}</span>
        </p>
        <p class="risk-confirm-message">{{ $t("prompts.riskConfirmMessage") }}</p>
        <div class="risk-confirm-details">
          <p v-if="actionType === 'delete'">{{ $t("prompts.riskConfirmDelete") }}</p>
          <p v-else-if="actionType === 'rename'">{{ $t("prompts.riskConfirmRename") }}</p>
          <p v-else-if="actionType === 'move'">{{ $t("prompts.riskConfirmMove") }}</p>
          <p v-else>{{ $t("prompts.riskConfirmGeneric") }}</p>
        </div>
      </div>
    </div>
    <div class="card-action">
      <button
        @click="cancel"
        class="button button--flat button--grey"
        :aria-label="$t('buttons.cancel')"
        :title="$t('buttons.cancel')"
        tabindex="2"
      >
        {{ $t("buttons.cancel") }}
      </button>
      <button
        id="focus-prompt"
        @click="confirm"
        class="button button--flat button--orange"
        :aria-label="$t('buttons.riskConfirm')"
        :title="$t('buttons.riskConfirm')"
        tabindex="1"
      >
        {{ $t("buttons.riskConfirm") }}
      </button>
    </div>
  </div>
</template>

<script>
import { mapActions, mapState } from "pinia";
import { useLayoutStore } from "@/stores/layout";

export default {
  name: "risk-confirm",
  computed: {
    ...mapState(useLayoutStore, ["currentPrompt"]),
    riskLevel() {
      return this.currentPrompt?.props?.riskLevel || "high";
    },
    targetPath() {
      return this.currentPrompt?.props?.targetPath || "";
    },
    actionType() {
      return this.currentPrompt?.props?.actionType || "generic";
    },
    riskLevelText() {
      if (this.riskLevel === "high") return "高危";
      if (this.riskLevel === "medium") return "中危";
      return "低危";
    },
  },
  methods: {
    ...mapActions(useLayoutStore, ["closeHovers"]),
    cancel() {
      this.closeHovers();
      // Call the oncancel callback if provided
      this.currentPrompt?.props?.oncancel?.();
    },
    confirm() {
      // Call the onconfirm callback to proceed with the original action
      this.currentPrompt?.props?.onconfirm?.();
      this.closeHovers();
    },
  },
};
</script>
