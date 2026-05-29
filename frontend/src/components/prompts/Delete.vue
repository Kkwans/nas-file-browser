<template>
  <div class="card floating">
    <div class="card-content">
      <p v-if="!isListing || selectedCount === 1">
        {{ t("confirm.deleteConfirm") }}
      </p>
      <p v-else>
        {{ t("confirm.deleteCountConfirm", { count: selectedCount }) }}
      </p>
    </div>
    <div class="card-action">
      <button
        @click="closeHovers"
        class="button button--flat button--grey"
        :aria-label="t('buttons.cancel')"
        :title="t('buttons.cancel')"
        tabindex="2"
      >
        {{ t("buttons.cancel") }}
      </button>
      <button
        id="focus-prompt"
        @click="submit"
        class="button button--flat button--red"
        :aria-label="t('buttons.delete')"
        :title="t('buttons.delete')"
        tabindex="1"
      >
        {{ t("buttons.delete") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { files as api } from "@/api";
import buttons from "@/utils/buttons";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useCategoriesStore } from "@/stores/categories";
import { t } from "@/utils/translations";

const $showError = inject<IToastError>("$showError")!;
const route = useRoute();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const { closeHovers, showHover } = layoutStore;

const { isListing, selectedCount, req, selected } = storeToRefs(fileStore);
const { reload, preselect } = storeToRefs(fileStore);

const submit = async () => {
  buttons.loading("delete");

  // Check risk level for selected items before deleting
  if (isListing.value && selectedCount.value > 0) {
    const categoriesStore = useCategoriesStore();
    for (const index of selected.value) {
      const item = req.value!.items[index];
      if (item.isDir && item.path) {
        const risk = categoriesStore.getRiskLevel(item.path);
        if (risk === "high" || risk === "medium") {
          buttons.done("delete");
          showHover({
            prompt: "risk-confirm",
            props: {
              riskLevel: risk,
              targetPath: item.path,
              actionType: "delete",
              onconfirm: () => {
                executeDelete();
              },
            },
          });
          return;
        }
      }
    }
  }

  executeDelete();
};

const executeDelete = async () => {
  try {
    if (!isListing.value) {
      await api.remove(route.path);
      buttons.success("delete");

      layoutStore.currentPrompt?.confirm();
      closeHovers();
      return;
    }

    closeHovers();

    if (selectedCount.value === 0) {
      return;
    }

    const promises = [];
    for (const index of selected.value) {
      promises.push(api.remove(req.value!.items[index].url));
    }

    await Promise.all(promises);
    buttons.success("delete");

    const nearbyItem =
      req.value!.items[Math.max(0, Math.min(...selected.value) - 1)];

    preselect.value = nearbyItem?.path;

    reload.value = true;
  } catch (e: any) {
    buttons.done("delete");
    $showError(e);
    if (isListing.value) reload.value = true;
  }
};
</script>
