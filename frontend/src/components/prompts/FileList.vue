<template>
  <div>
    <ul class="file-list">
      <li
        @click="itemClick"
        @touchstart="touchstart"
        @dblclick="next"
        role="button"
        tabindex="0"
        :aria-label="item.name"
        :aria-selected="selected == item.url"
        :key="item.name"
        v-for="item in items"
        :data-url="item.url"
      >
        {{ item.name }}
      </li>
    </ul>

    <p>
      当前目录： <code>{{ nav }}</code
      >.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { storeToRefs } from "pinia";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import url from "@/utils/url";
import { files } from "@/api";
import { StatusError } from "@/api/utils.js";
import { t } from "@/utils/translations";

interface FileItem {
  name: string;
  url: string;
  isDir?: boolean;
}

const props = withDefaults(
  defineProps<{
    exclude?: string[];
  }>(),
  {
    exclude: () => [],
  }
);

const emit = defineEmits<{
  "update:selected": [value: string];
}>();

const $showError = inject<IToastError>("$showError")!;
const route = useRoute();

const authStore = useAuthStore();
const fileStore = useFileStore();
const layoutStore = useLayoutStore();

const { user } = storeToRefs(authStore);
const { req } = storeToRefs(fileStore);

const items = ref<FileItem[]>([]);
const touches = ref({ id: "", count: 0 });
const selected = ref<string | null>(null);
const current = ref(window.location.pathname);
let nextAbortController = new AbortController();

const nav = computed(() => decodeURIComponent(current.value));

onMounted(() => {
  fillOptions(req.value);
});

onUnmounted(() => {
  nextAbortController.abort();
});

const fillOptions = (reqData: any) => {
  current.value = reqData.url;
  items.value = [];

  emit("update:selected", current.value);

  // Show parent directory navigation
  if (reqData.url !== "/files/") {
    items.value.push({
      name: "..",
      url: url.removeLastDir(reqData.url) + "/",
    });
  }

  if (reqData.items === null) return;

  for (const item of reqData.items) {
    if (!item.isDir) continue;
    if (props.exclude?.includes(item.url)) continue;

    items.value.push({
      name: item.name,
      url: item.url,
    });
  }
};

const next = (event: Event) => {
  const target = (event as MouseEvent).currentTarget as HTMLElement;
  const uri = target.dataset.url!;
  nextAbortController.abort();
  nextAbortController = new AbortController();
  files
    .fetch(uri, nextAbortController.signal)
    .then(fillOptions)
    .catch((e: any) => {
      if (e instanceof StatusError && e.is_canceled) {
        return;
      }
      $showError(e);
    });
};

const touchstart = (event: TouchEvent) => {
  const target = event.currentTarget as HTMLElement;
  const touchUrl = target.dataset.url!;

  setTimeout(() => {
    touches.value.count = 0;
  }, 300);

  if (touches.value.id !== touchUrl) {
    touches.value.id = touchUrl;
    touches.value.count = 1;
    return;
  }

  touches.value.count++;

  if (touches.value.count > 1) {
    next(event);
  }
};

const itemClick = (event: Event) => {
  if (user.value?.singleClick) next(event);
  else select(event);
};

const select = (event: Event) => {
  const target = (event as MouseEvent).currentTarget as HTMLElement;
  const itemUrl = target.dataset.url!;

  if (selected.value === itemUrl) {
    selected.value = null;
    emit("update:selected", current.value);
    return;
  }

  selected.value = itemUrl;
  emit("update:selected", selected.value);
};

const createDir = async () => {
  layoutStore.showHover({
    prompt: "newDir",
    action: undefined,
    confirm: (dirUrl: string) => {
      const paths = dirUrl.split("/");
      items.value.push({
        name: paths[paths.length - 2],
        url: dirUrl,
      });
    },
    props: {
      redirect: false,
      base: current.value === route.path ? null : current.value,
    },
  });
};

defineExpose({ createDir });
</script>
