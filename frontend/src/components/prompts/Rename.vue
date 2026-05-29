<template>
  <div class="card floating">
    <div class="card-title">
      <h2>重命名</h2>
    </div>

    <div class="card-content">
      <p>
        请输入新名称，旧名称为： <code>{{ oldName }}</code
        >:
      </p>
      <input
        id="focus-prompt"
        class="input input--block"
        type="text"
        @keyup.enter="submit"
        v-model.trim="name"
      />
    </div>

    <div class="card-action">
      <button
        class="button button--flat button--grey"
        @click="closeHovers"
        :aria-label="取消"
        :title="取消"
      >
        取消
      </button>
      <button
        @click="submit"
        class="button button--flat"
        type="submit"
        :aria-label="重命名"
        :title="重命名"
        :disabled="name === '' || name === oldName"
      >
        重命名
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { useRouter } from "vue-router";
import { storeToRefs } from "pinia";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { useCategoriesStore } from "@/stores/categories";
import url from "@/utils/url";
import { files as api } from "@/api";
import { removePrefix } from "@/api/utils";

const $showError = inject<IToastError>("$showError")!;
const router = useRouter();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const { closeHovers, showHover } = layoutStore;

const { req, selected, selectedCount, isListing } = storeToRefs(fileStore);
const { reload, preselect } = storeToRefs(fileStore);

const oldName = computed(() => {
  if (!isListing.value) {
    return req.value!.name;
  }
  if (selectedCount.value === 0 || selectedCount.value > 1) {
    return "";
  }
  return req.value!.items[selected.value[0]].name;
});

const name = ref(oldName.value);

const submit = async () => {
  if (name.value === "" || name.value === oldName.value) {
    return;
  }

  // Check risk level before renaming
  const item = isListing.value
    ? req.value!.items[selected.value[0]]
    : req.value!;
  if (item?.isDir && item?.path) {
    const categoriesStore = useCategoriesStore();
    const risk = categoriesStore.getRiskLevel(item.path);
    if (risk === "high" || risk === "medium") {
      showHover({
        prompt: "risk-confirm",
        props: {
          riskLevel: risk,
          targetPath: item.path,
          actionType: "rename",
          onconfirm: () => {
            executeRename();
          },
        },
      });
      return;
    }
  }

  executeRename();
};

const executeRename = async () => {
  if (name.value === "" || name.value === oldName.value) {
    return;
  }
  let oldLink = "";
  let newLink = "";

  if (!isListing.value) {
    oldLink = req.value!.url;
  } else {
    oldLink = req.value!.items[selected.value[0]].url;
  }

  newLink = url.removeLastDir(oldLink) + "/" + encodeURIComponent(name.value);

  try {
    await api.move([{ from: oldLink, to: newLink }]);
    if (!isListing.value) {
      router.push({ path: newLink });
      return;
    }

    preselect.value = removePrefix(newLink);

    reload.value = true;
  } catch (e: any) {
    $showError(e);
  }

  closeHovers();
};
</script>
