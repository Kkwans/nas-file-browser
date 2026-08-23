<template>
  <div class="card floating">
    <div class="card-title">
      <h2>复制</h2>
    </div>

    <div class="card-content">
      <p>请选择目标目录：</p>
      <file-list
        ref="fileListRef"
        @update:selected="(val) => (dest = val)"
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
          aria-label="新建文件夹"
          title="新建文件夹"
          style="justify-self: left"
        >
          <span>新建文件夹</span>
        </button>
      </template>
      <div>
        <button
          class="button button--flat button--grey"
          @click="closeHovers"
          aria-label="取消"
          title="取消"
          tabindex="3"
        >
          取消
        </button>
        <button
          id="focus-prompt"
          class="button button--flat"
          @click="copy"
          aria-label="复制"
          title="复制"
          tabindex="2"
        >
          复制
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useAuthStore } from "@/stores/auth";
import FileList from "./FileList.vue";
import type { MoveCopyItem, ConflictResult } from "@/types/file";
import { files as api } from "@/api";
import buttons from "@/utils/buttons";
import * as upload from "@/utils/upload";
import { appendResourceRouteSegment, canonicalResourcePath } from "@/utils/url";
const $showError = inject<IToastError>("$showError")!;
const route = useRoute();
const router = useRouter();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const authStore = useAuthStore();
const { showHover, closeHovers } = layoutStore;

const { selectedItems } = storeToRefs(fileStore);
const { reload, preselect } = storeToRefs(fileStore);
const { user } = storeToRefs(authStore);

const fileListRef = ref<InstanceType<typeof FileList> | null>(null);
const dest = ref<string | null>(null);

const copy = async (event: Event) => {
  event.preventDefault();
  const items: MoveCopyItem[] = [];

  for (const item of selectedItems.value) {
    items.push({
      from: item.url,
      to: appendResourceRouteSegment(dest.value!, item.name),
      name: item.name,
      size: item.size,
      modified: item.modified,
      isDir: item.isDir,
      overwrite: false,
      rename: route.path === dest.value,
    });
  }

  const action = async (overwrite?: boolean, rename?: boolean) => {
    buttons.loading("copy");

    await api
      .copy(items, overwrite, rename)
      .then(() => {
        buttons.success("copy");
        preselect.value = canonicalResourcePath(items[0].to);

        if (route.path === dest.value) {
          reload.value = true;
          return;
        }

        if (user.value?.redirectAfterCopyMove)
          router.push({ path: dest.value! });
      })
      .catch((e: any) => {
        buttons.done("copy");
        $showError(e);
      });
  };

  const conflict = await upload.checkConflict(items, dest.value!);

  if (conflict.length > 0) {
    showHover({
      prompt: "resolve-conflict",
      props: {
        conflict: conflict,
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
