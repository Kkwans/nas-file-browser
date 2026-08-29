<template>
  <div class="path-picker-backdrop" @click.self="close">
    <section
      ref="dialog"
      class="path-picker"
      role="dialog"
      aria-modal="true"
      aria-labelledby="path-picker-title"
      tabindex="-1"
    >
      <header class="path-picker__header">
        <div>
          <p>选择位置</p>
          <h2 id="path-picker-title">{{ title }}</h2>
        </div>
        <button type="button" aria-label="关闭路径选择器" @click="close">
          <AppIcon name="x" :size="19" />
        </button>
      </header>

      <div class="path-picker__location" aria-live="polite">
        <AppIcon name="folder" :size="18" />
        <code>{{ currentPath }}</code>
      </div>

      <div v-if="error" class="path-picker__error" role="alert">
        <AppIcon name="circle-alert" :size="18" />
        <span>{{ error }}</span>
        <button type="button" @click="load(currentPath)">重试</button>
      </div>
      <div v-else-if="loading" class="path-picker__loading" aria-live="polite">
        <AppIcon name="loader" :size="20" />正在读取目录…
      </div>
      <ul v-else class="path-picker__list" aria-label="目录列表">
        <li v-for="item in directories" :key="item.path">
          <button
            type="button"
            :class="{ selected: selectedPath === item.path }"
            @click="selectedPath = item.path"
            @dblclick="open(item.path)"
            @keydown.enter="open(item.path)"
          >
            <AppIcon
              :name="item.path === '..' ? 'arrow-left' : 'folder'"
              :size="19"
            />
            <span>{{ item.name }}</span>
            <AppIcon
              v-if="selectedPath === item.path"
              name="circle-check"
              :size="17"
            />
          </button>
        </li>
        <li v-if="directories.length === 0" class="path-picker__empty">
          当前目录没有子目录
        </li>
      </ul>

      <footer class="path-picker__footer">
        <p>双击进入目录，单击选择当前目录。</p>
        <div>
          <button type="button" @click="close">取消</button>
          <button
            type="button"
            class="primary"
            :disabled="!selectedPath"
            @click="confirm"
          >
            <AppIcon name="circle-check" :size="17" />选择此目录
          </button>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import { files } from "@/api";
import { canonicalResourcePath, encodeResourceRoute } from "@/utils/url";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    title?: string;
  }>(),
  { modelValue: "/", title: "选择目录" }
);

const emit = defineEmits<{
  close: [];
  select: [path: string];
  "update:modelValue": [path: string];
}>();

const currentPath = ref(normalizePath(props.modelValue));
const selectedPath = ref(currentPath.value);
const dialog = ref<HTMLElement | null>(null);
const loading = ref(false);
const error = ref("");
const directories = ref<Array<{ name: string; path: string }>>([]);

const parentPath = computed(() => {
  if (currentPath.value === "/") return null;
  const trimmed = currentPath.value.replace(/\/+$/, "");
  const index = trimmed.lastIndexOf("/");
  return index <= 0 ? "/" : `${trimmed.slice(0, index)}/`;
});

async function load(path: string) {
  currentPath.value = normalizePath(path);
  loading.value = true;
  error.value = "";
  try {
    const resource = await files.fetch(encodeResourceRoute(currentPath.value));
    const next = resource.items
      .filter((item) => item.isDir)
      .map((item) => ({
        name: item.name,
        path: normalizePath(canonicalResourcePath(item.path || item.url)),
      }));
    directories.value = parentPath.value
      ? [{ name: "上一级", path: parentPath.value }, ...next]
      : next;
    selectedPath.value = currentPath.value;
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause);
  } finally {
    loading.value = false;
  }
}

function open(path: string) {
  void load(path);
}

function confirm() {
  if (!selectedPath.value) return;
  const path = normalizePath(selectedPath.value);
  emit("update:modelValue", path);
  emit("select", path);
  emit("close");
}

function close() {
  emit("close");
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
let previouslyFocused: HTMLElement | null = null;
let previousBodyOverflow = "";

function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }
  if (event.key !== "Tab") return;
  const root = dialog.value;
  if (!root) return;
  const controls = Array.from(
    root.querySelectorAll<HTMLElement>(focusableSelector)
  ).filter((element) => element.getClientRects().length > 0);
  if (controls.length === 0) {
    event.preventDefault();
    root.focus();
    return;
  }
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function normalizePath(value: string) {
  const canonical = canonicalResourcePath(value || "/");
  return canonical === "/" ? "/" : `${canonical.replace(/\/+$/, "")}/`;
}

onMounted(() => {
  previouslyFocused =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  document.addEventListener("keydown", handleKeydown);
  void nextTick(() => {
    const closeButton = dialog.value?.querySelector<HTMLElement>(
      'button[aria-label="关闭路径选择器"]'
    );
    (closeButton ?? dialog.value)?.focus();
  });
  void load(currentPath.value);
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  document.body.style.overflow = previousBodyOverflow;
  if (previouslyFocused && document.contains(previouslyFocused)) {
    previouslyFocused.focus({ preventScroll: true });
  }
});
</script>

<style scoped>
.path-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 10001;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgb(15 23 42 / 38%);
}
.path-picker {
  display: grid;
  width: min(560px, 100%);
  max-height: min(720px, calc(100dvh - 36px));
  grid-template-rows: auto auto minmax(180px, 1fr) auto;
  overflow: hidden;
  border: 1px solid var(--borderPrimary);
  border-radius: 16px;
  background: var(--surfacePrimary);
  color: var(--textSecondary);
  box-shadow: 0 22px 64px rgb(15 23 42 / 22%);
}
.path-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--borderPrimary);
}
.path-picker__header p,
.path-picker__header h2 {
  margin: 0;
}
.path-picker__header p {
  color: var(--blue);
  font-size: 11px;
  font-weight: 700;
}
.path-picker__header h2 {
  margin-top: 3px;
  font-size: 18px;
}
.path-picker__header button {
  display: grid;
  width: 44px;
  min-width: 44px;
  height: 44px;
  min-height: 44px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  color: var(--textPrimary);
  background: transparent;
  cursor: pointer;
}
.path-picker__header button:hover,
.path-picker__header button:focus-visible {
  color: var(--blue);
  background: var(--hover);
}
.path-picker__location {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  padding: 0 20px;
  color: var(--blue);
  background: var(--surfaceSecondary);
}
.path-picker__location code {
  overflow: hidden;
  color: var(--textSecondary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.path-picker__list {
  min-height: 180px;
  margin: 0;
  overflow: auto;
  padding: 8px;
  list-style: none;
}
.path-picker__list li + li {
  margin-top: 2px;
}
.path-picker__list button {
  display: grid;
  width: 100%;
  min-height: 44px;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--textSecondary);
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.path-picker__list button:hover,
.path-picker__list button:focus-visible,
.path-picker__list button.selected {
  border-color: color-mix(in srgb, var(--blue) 25%, transparent);
  color: var(--blue);
  background: color-mix(in srgb, var(--blue) 8%, transparent);
}
.path-picker__list button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.path-picker__empty,
.path-picker__loading,
.path-picker__error {
  display: flex;
  min-height: 160px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--textPrimary);
  font-size: 12px;
}
.path-picker__error {
  min-height: 90px;
  padding: 0 20px;
  color: var(--icon-red);
}
.path-picker__error button {
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid var(--borderPrimary);
  border-radius: 7px;
  color: var(--textSecondary);
  background: var(--surfacePrimary);
  cursor: pointer;
}
.path-picker__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 20px;
  border-top: 1px solid var(--borderPrimary);
}
.path-picker__footer p {
  margin: 0;
  color: var(--textPrimary);
  font-size: 11px;
}
.path-picker__footer > div {
  display: inline-flex;
  gap: 8px;
}
.path-picker__footer button {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--borderPrimary);
  border-radius: 8px;
  color: var(--textSecondary);
  background: var(--surfacePrimary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
}
.path-picker__footer button.primary {
  color: var(--iconSecondary);
  border-color: var(--blue);
  background: var(--blue);
}
.path-picker__footer button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
@media (max-width: 560px) {
  .path-picker-backdrop {
    padding: 0;
    place-items: end center;
  }
  .path-picker {
    max-height: 88dvh;
    border-radius: 16px 16px 0 0;
  }
  .path-picker__footer {
    align-items: stretch;
    flex-direction: column;
  }
  .path-picker__footer > div {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .path-picker__footer button {
    justify-content: center;
  }
}
</style>
