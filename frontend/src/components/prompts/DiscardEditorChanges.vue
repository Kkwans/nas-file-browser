<template>
  <div class="card floating">
    <div class="card-content">
      <p>{{ t("discardEditorChanges.confirm") }}</p>
    </div>
    <div class="card-action">
      <button
        class="button button--flat button--grey"
        @click="closeHovers"
        aria-label="取消"
        title="取消"
        tabindex="3"
      >
        {{ t("buttons.cancel") }}
      </button>
      <button
        class="button button--flat button--blue"
        @click="currentPrompt?.saveAction"
        aria-label="保存更改"
        title="保存更改"
        tabindex="1"
      >
        {{ t("buttons.saveChanges") }}
      </button>
      <button
        id="focus-prompt"
        @click="currentPrompt?.confirm"
        class="button button--flat button--red"
        aria-label="放弃更改"
        title="放弃更改"
        tabindex="2"
      >
        {{ t("buttons.discardEditorChanges") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import { storeToRefs } from "pinia";
import { t } from "@/utils/translations";

const layoutStore = useLayoutStore();
const { currentPrompt } = storeToRefs(layoutStore);
const { closeHovers } = layoutStore;
</script>
