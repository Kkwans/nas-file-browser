<template>
  <div class="card floating">
    <div class="card-content">
      <p v-if="!isListing || selectedCount === 1">
        你确定要将这个文件/文件夹移入回收站吗？
      </p>
      <p v-else>你确定要将这 {{ selectedCount }} 项移入回收站吗？</p>
    </div>
    <div class="card-action">
      <button
        @click="closeHovers"
        class="button button--flat button--grey"
        aria-label="取消"
        title="取消"
        tabindex="2"
      >
        取消
      </button>
      <button
        id="focus-prompt"
        @click="submit"
        class="button button--flat button--red"
        aria-label="移入回收站"
        title="移入回收站"
        tabindex="1"
      >
        移入回收站
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
import { useTrashStore } from "@/stores/trash";
import type { TrashItem } from "@/api/trash";
const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<IToastSuccess>("$showSuccess")!;
const $showAction = inject<IToastAction>("$showAction")!;
const route = useRoute();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const trashStore = useTrashStore();
const { closeHovers, showHover } = layoutStore;

const { isListing, selectedCount, req, selectedItems } = storeToRefs(fileStore);
const { reload, preselect } = storeToRefs(fileStore);

const submit = async () => {
  buttons.loading("delete");

  const candidates =
    isListing.value && selectedCount.value > 0
      ? selectedItems.value
      : !isListing.value && req.value
        ? [req.value]
        : [];
  for (const item of candidates) {
    const risk = item.riskLevel ?? "low";
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

  executeDelete();
};

const executeDelete = async () => {
  try {
    if (!isListing.value) {
      const moved = await api.remove(route.path, "trash");
      buttons.success("delete");

      if (moved) showUndo([moved]);

      layoutStore.currentPrompt?.confirm();
      closeHovers();
      return;
    }

    closeHovers();

    if (selectedCount.value === 0) {
      return;
    }

    const deletingItems = [...selectedItems.value];
    const movedItems: TrashItem[] = [];
    const failures: unknown[] = [];
    for (const item of deletingItems) {
      try {
        const moved = await api.remove(item.url, "trash");
        if (moved) movedItems.push(moved);
      } catch (error) {
        failures.push(error);
      }
    }
    if (movedItems.length > 0) showUndo(movedItems);
    if (failures.length > 0) throw failures[0];

    buttons.success("delete");

    const firstSelectedIndex = Math.min(
      ...deletingItems.map((item) => item.index)
    );
    const nearbyItem = req.value!.items[Math.max(0, firstSelectedIndex - 1)];

    preselect.value = nearbyItem?.path;

    reload.value = true;
  } catch (e: any) {
    buttons.done("delete");
    $showError(e);
    if (isListing.value) reload.value = true;
  }
};

const showUndo = (items: TrashItem[]) => {
  for (const item of items) trashStore.recordMoved(item);
  const countLabel =
    items.length === 1 ? `“${items[0].name}”` : `${items.length} 项`;
  $showAction(`${countLabel}已移入回收站`, "撤销", async () => {
    try {
      await trashStore.restoreMany(items);
      reload.value = true;
      $showSuccess(
        items.length === 1 ? "文件已恢复" : `${items.length} 项已恢复`
      );
    } catch (error) {
      reload.value = true;
      $showError(error as Error, false);
    }
  });
};
</script>
