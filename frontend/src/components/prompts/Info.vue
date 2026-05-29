<template>
  <div class="card floating">
    <div class="card-title">
      <h2>{{ t("info.title") }}</h2>
    </div>

    <div class="card-content">
      <p v-if="selected.length > 1">
        {{ t("info.selectedCount", { count: selected.length }) }}
      </p>

      <p class="break-word" v-if="selected.length < 2">
        <strong>{{ t("share.name") }}：</strong> {{ name }}
      </p>

      <p v-if="!dir || selected.length > 1">
        <strong>{{ t("share.size") }}:</strong>
        <span id="content_length"></span> {{ humanSize }}
      </p>

      <div v-if="resolution">
        <strong>{{ t("info.resolution") }}:</strong>
        {{ resolution.width }} x {{ resolution.height }}
      </div>

      <p v-if="selected.length < 2" title="modTime">
        <strong>{{ t("share.lastModified") }}:</strong> {{ humanTime }}
      </p>

      <template v-if="dir && selected.length === 0">
        <p>
          <strong>{{ t("info.fileCount") }}:</strong> {{ req?.numFiles }}
        </p>
        <p>
          <strong>{{ t("info.folderCount") }}:</strong> {{ req?.numDirs }}
        </p>
      </template>

      <template v-if="!dir">
        <p>
          <strong>MD5: </strong
          ><code
            ><a
              @click="checksum($event, 'md5')"
              @keypress.enter="checksum($event, 'md5')"
              tabindex="2"
              >{{ t("viewer.clickToDownload") }}</a
            ></code
          >
        </p>
        <p>
          <strong>SHA1: </strong
          ><code
            ><a
              @click="checksum($event, 'sha1')"
              @keypress.enter="checksum($event, 'sha1')"
              tabindex="3"
              >点击以显示</a
            ></code
          >
        </p>
        <p>
          <strong>SHA256: </strong
          ><code
            ><a
              @click="checksum($event, 'sha256')"
              @keypress.enter="checksum($event, 'sha256')"
              tabindex="4"
              >点击以显示</a
            ></code
          >
        </p>
        <p>
          <strong>SHA512: </strong
          ><code
            ><a
              @click="checksum($event, 'sha512')"
              @keypress.enter="checksum($event, 'sha512')"
              tabindex="5"
              >点击以显示</a
            ></code
          >
        </p>
      </template>
    </div>

    <div class="card-action">
      <button
        id="focus-prompt"
        type="submit"
        @click="closeHovers"
        class="button button--flat"
        :aria-label="t('buttons.confirm')"
        :title="t('buttons.confirm')"
      >
        {{ t("buttons.confirm") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { filesize } from "@/utils";
import dayjs from "dayjs";
import { files as api } from "@/api";
import { t } from "@/utils/translations";

const $showError = inject<IToastError>("$showError")!;
const route = useRoute();

const fileStore = useFileStore();
const layoutStore = useLayoutStore();
const { closeHovers } = layoutStore;

const { req, selected, selectedCount, isListing } = storeToRefs(fileStore);

const humanSize = computed(() => {
  if (selectedCount.value === 0 || !isListing.value) {
    return filesize(req.value!.size);
  }
  let sum = 0;
  for (const idx of selected.value) {
    sum += req.value!.items[idx].size;
  }
  return filesize(sum);
});

const humanTime = computed(() => {
  if (selectedCount.value === 0) {
    return dayjs(req.value!.modified).fromNow();
  }
  return dayjs(req.value!.items[selected.value[0]].modified).fromNow();
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const modTime = computed(() => {
  if (selectedCount.value === 0) {
    return new Date(Date.parse(req.value!.modified)).toLocaleString();
  }
  return new Date(
    Date.parse(req.value!.items[selected.value[0]].modified)
  ).toLocaleString();
});

const name = computed(() => {
  return selectedCount.value === 0
    ? req.value!.name
    : req.value!.items[selected.value[0]].name;
});

const dir = computed(() => {
  return (
    selectedCount.value > 1 ||
    (selectedCount.value === 0
      ? req.value!.isDir
      : req.value!.items[selected.value[0]].isDir)
  );
});

const resolution = computed(() => {
  if (selectedCount.value === 1) {
    const selectedItem = req.value!.items[selected.value[0]] as any;
    if (selectedItem && selectedItem.type === "image") {
      return selectedItem.resolution;
    }
  } else if (req.value && (req.value as any).type === "image") {
    return (req.value as any).resolution;
  }
  return null;
});

const checksum = async (
  event: Event,
  algo: "md5" | "sha1" | "sha256" | "sha512"
) => {
  event.preventDefault();
  const target = event.target as HTMLElement;

  let link: string;
  if (selectedCount.value) {
    link = req.value!.items[selected.value[0]].url;
  } else {
    link = route.path;
  }

  try {
    const hash = await api.checksum(link, algo);
    target.textContent = hash;
  } catch (e: any) {
    $showError(e);
  }
};
</script>
