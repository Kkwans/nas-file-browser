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

<script setup lang="ts">
import { computed } from "vue";
import { useLayoutStore } from "@/stores/layout";
import { storeToRefs } from "pinia";

const layoutStore = useLayoutStore();
const { currentPrompt } = storeToRefs(layoutStore);
const { closeHovers } = layoutStore;

const riskLevel = computed(() => currentPrompt.value?.props?.riskLevel || "high");
const targetPath = computed(() => currentPrompt.value?.props?.targetPath || "");
const actionType = computed(() => currentPrompt.value?.props?.actionType || "generic");
const riskLevelText = computed(() => {
  if (riskLevel.value === "high") return "高危";
  if (riskLevel.value === "medium") return "中危";
  return "低危";
});

const cancel = () => {
  closeHovers();
  currentPrompt.value?.props?.oncancel?.();
};

const confirm = () => {
  currentPrompt.value?.props?.onconfirm?.();
  closeHovers();
};
</script>
