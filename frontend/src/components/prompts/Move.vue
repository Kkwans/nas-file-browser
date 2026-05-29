<template>
  <div class="card floating">
    <div class="card-title">
      <h2>{{ t("move.title") }}</h2>
    </div>

    <div class="card-content">
      <p>{{ t("copy.targetDirectory") }}</p>
      <file-list
        ref="fileListRef"
        @update:selected="(val) => (dest = val)"
        :exclude="excludedFolders"
        tabindex="1"
      />
    </div>

    <div
      class="card-action"
      style="display: flex; align-items: center; justify-content: space-between"
    >
      <template v-if="user?.perm.create">
        <button
          class="button button--flat"
          @click="fileListRef?.createDir()"
          :aria-label="t('buttons.createFolder')"
          :title="t('buttons.createFolder')"
          style="justify-self: left"
        >
          <span>{{ t("buttons.createFolder") }}</span>
        </button>
      </template>
      <div>
        <button
          class="button button--flat button--grey"
          @click="closeHovers"
          :aria-label="t('buttons.cancel')"
          :title="t('buttons.cancel')"
          tabindex="3"
        >
          {{ t("buttons.cancel") }}
        </button>
        <button
          id="focus-prompt"
          class="button button--flat"
          @click="move"
          :disabled="route.path === dest"
          :aria-label="t('buttons.move')"
          :title="t('buttons.move')"
          tabindex="2"
        >
          {{ t("buttons.move") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { t } from "@/utils/translations";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useAuthStore } from "@/stores/auth";
import { useCategoriesStore } from "@/stores/categories";
import FileList from "./FileList.vue";
import type { MoveCopyItem, ConflictResult } from "@/types/file";
import { files as api } from "@/api";
import buttons from "@/utils/buttons";
import * as upload from "@/utils/upload";
import { removePrefix } from "@/api/utils";
const $showError = inject<IToastError>("$showError")!;
const route = useRoute();
const router = useRouter();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const authStore = useAuthStore();
const { showHover, closeHovers } = layoutStore;

const { req, selected } = storeToRefs(fileStore);
const { reload, preselect } = storeToRefs(fileStore);
const { user } = storeToRefs(authStore);

const fileListRef = ref<InstanceType<typeof FileList> | null>(null);
const dest = ref<string | null>(null);

const excludedFolders = computed(() =>
  selected.value
    .filter((idx) => req.value!.items[idx].isDir)
    .map((idx) => req.value!.items[idx].url)
);

const move = async (event: Event) => {
  event.preventDefault();

  // Check risk level before moving
  const categoriesStore = useCategoriesStore();
  for (const itemIdx of selected.value) {
    const item = req.value!.items[itemIdx];
    if (item.isDir && item.path) {
      const risk = categoriesStore.getRiskLevel(item.path);
      if (risk === "high" || risk === "medium") {
        showHover({
          prompt: "risk-confirm",
          props: {
            riskLevel: risk,
            targetPath: item.path,
            actionType: "move",
            onconfirm: () => {
              executeMove();
            },
          },
        });
        return;
      }
    }
  }

  executeMove();
};

const executeMove = async () => {
  const items: MoveCopyItem[] = [];

  for (const item of selected.value) {
    items.push({
      from: req.value!.items[item].url,
      to: dest.value + encodeURIComponent(req.value!.items[item].name),
      name: req.value!.items[item].name,
      size: req.value!.items[item].size,
      modified: req.value!.items[item].modified,
      isDir: req.value!.items[item].isDir,
      overwrite: false,
      rename: false,
    });
  }

  const action = async (overwrite?: boolean, rename?: boolean) => {
    buttons.loading("move");

    await api
      .move(items, overwrite, rename)
      .then(() => {
        buttons.success("move");
        preselect.value = removePrefix(items[0].to);
        if (user.value?.redirectAfterCopyMove)
          router.push({ path: dest.value! });
        else reload.value = true;
      })
      .catch((e: any) => {
        buttons.done("move");
        $showError(e);
      });
  };

  const conflict = await upload.checkConflict(items, dest.value!);

  if (conflict.length > 0) {
    showHover({
      prompt: "resolve-conflict",
      props: {
        conflict: conflict,
        files: items,
      },
      confirm: (event: Event, result: ConflictResult[]) => {
        event.preventDefault();
        closeHovers();
        for (let i = result.length - 1; i >= 0; i--) {
          const item = result[i];
          if (item.checked.length == 2) {
            items[item.index].rename = true;
          } else if (item.checked.length == 1 && item.checked[0] == "origin") {
            items[item.index].overwrite = true;
          } else {
            items.splice(item.index, 1);
          }
        }
        if (items.length > 0) {
          action();
        }
      },
    });

    return;
  }

  action(false, false);
};
</script>
