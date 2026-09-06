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
        class="button button--flat button--blue"
        aria-label="移入回收站"
        title="移入回收站"
        tabindex="1"
      >
        移入回收站
      </button>
      <button
        @click="submitPermanent"
        class="button button--flat button--red"
        aria-label="永久删除"
        title="永久删除（5 秒内可撤回）"
        tabindex="1"
      >
        永久删除
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
import * as taskApi from "@/api/tasks";
const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<IToastSuccess>("$showSuccess")!;
const $showAction = inject<IToastAction>("$showAction")!;
const route = useRoute();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const { closeHovers, showHover } = layoutStore;

const { isListing, selectedCount, req, selectedItems } = storeToRefs(fileStore);
const { reload, preselect } = storeToRefs(fileStore);

function candidates() {
  return isListing.value && selectedCount.value > 0
    ? [...selectedItems.value]
    : !isListing.value && req.value
      ? [req.value]
      : [];
}

function checkRisk(onconfirm: () => void) {
  for (const item of candidates()) {
    const risk = item.riskLevel ?? "low";
    if (risk === "high" || risk === "medium") {
      showHover({
        prompt: "risk-confirm",
        props: {
          riskLevel: risk,
          targetPath: item.path,
          actionType: "delete",
          onconfirm,
        },
      });
      return true;
    }
  }
  return false;
}

const submit = async () => {
  buttons.loading("delete");
  await executeDelete("trash");
};

const submitPermanent = async () => {
  buttons.loading("delete");
  if (checkRisk(() => executeDelete("permanent"))) {
    buttons.done("delete");
    return;
  }
  await executeDelete("permanent");
};

const executeDelete = async (mode: "trash" | "permanent") => {
  try {
    const items = candidates();
    if (items.length === 0) return;
    if (mode === "permanent") {
      const task = await api.schedulePermanentDeletion(
        items.map((item) => item.path)
      );
      buttons.success("delete");
      closeHovers();
      $showAction("永久删除将在 5 秒后执行", "撤回", async () => {
        await taskApi.cancel(task.id);
        $showSuccess("已撤回永久删除", { importance: "minor" });
        reload.value = true;
      });
      reload.value = true;
      return;
    }
    if (!isListing.value) {
      await api.remove(route.path, "trash");
      buttons.success("delete");
      $showSuccess("已移入回收站", { importance: "minor" });
      layoutStore.currentPrompt?.confirm();
      closeHovers();
      return;
    }

    closeHovers();

    if (selectedCount.value === 0) {
      return;
    }

    const deletingItems = items;
    const failures: unknown[] = [];
    for (const item of deletingItems) {
      try {
        await api.remove(item.url, "trash");
      } catch (error) {
        failures.push(error);
      }
    }
    if (failures.length > 0) throw failures[0];

    buttons.success("delete");
    $showSuccess(
      deletingItems.length === 1
        ? "已移入回收站"
        : `${deletingItems.length} 项已移入回收站`,
      { importance: "minor" }
    );

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
</script>
