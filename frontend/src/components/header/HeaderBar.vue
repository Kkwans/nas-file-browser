<template>
  <header>
    <div class="header-leading">
      <img v-if="showLogo" :src="logoURL" :alt="name" />
      <Action
        v-if="showMenu && isMobileViewport"
        class="menu-button"
        app-icon="menu"
        :icon-size="22"
        label="切换侧边栏"
        @action="layoutStore.toggleTransient('sidebar')"
      />
      <div v-if="showLogo" class="header-instance" aria-label="当前实例">
        <strong class="header-instance__name">{{ name }}</strong>
        <span
          v-if="authStore.isLoggedIn && authStore.instanceHostname"
          class="header-instance__host"
        >
          {{ authStore.instanceHostname }}
        </span>
      </div>
    </div>

    <div class="header-center">
      <slot />
    </div>

    <div class="header-trailing">
      <div v-if="slots['primary-actions']" class="header-primary-actions">
        <slot name="primary-actions" />
      </div>
      <div class="header-mobile-actions">
        <slot name="mobile-actions" />
      </div>
      <router-link
        v-if="authStore.isLoggedIn"
        class="header-task-center"
        to="/tasks"
        aria-label="任务中心"
        title="任务中心"
      >
        <AppIcon name="tasks" :size="20" :stroke-width="1.9" />
        <span
          v-if="taskCenterBadgeCount > 0"
          class="header-task-center__badge"
          aria-label="有进行中或需处理的任务"
          >{{ taskCenterBadgeCount }}</span
        >
      </router-link>
      <div
        id="dropdown"
        :class="{
          active: layoutStore.currentPromptName === 'more',
          'has-primary-actions': Boolean(slots['primary-actions']),
        }"
      >
        <slot name="actions" />
      </div>

      <Action
        v-if="ifActionsSlot"
        id="more"
        app-icon="more"
        :icon-size="22"
        label="更多"
        @action="layoutStore.toggleTransient('more')"
      />
    </div>

    <div
      class="overlay"
      v-show="layoutStore.currentPromptName == 'more'"
      @click="layoutStore.closeHovers"
    />
  </header>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
import { useAuthStore } from "@/stores/auth";
import { useTasksStore } from "@/stores/tasks";
import { useTransfersStore } from "@/stores/transfers";
import { useHistoryStore } from "@/stores/history";
import {
  connectTaskCenterEvents,
  type TaskCenterEvent,
} from "@/utils/taskCenterEvents";
import type { TaskItem } from "@/api/tasks";
import type { TransferItem } from "@/api/transfers";
import type { HistoryEntry } from "@/api/history";

import { logoURL, name } from "@/utils/constants";

import Action from "@/components/header/Action.vue";
import AppIcon from "@/components/ui/AppIcon.vue";
import { computed, onMounted, onUnmounted, ref, useSlots } from "vue";
defineProps<{
  showLogo?: boolean;
  showMenu?: boolean;
}>();

const layoutStore = useLayoutStore();
const authStore = useAuthStore();
const tasksStore = useTasksStore();
const transfersStore = useTransfersStore();
const historyStore = useHistoryStore();
const slots = useSlots();
const taskCenterBadgeCount = computed(
  () => tasksStore.counts.active + transfersStore.active.length
);

// The desktop header must not render the transient sidebar toggle at all.
// Keeping this contract in the component (instead of relying on a cascade of
// media-query overrides) prevents the button from becoming visible when an
// older page stylesheet wins the cascade.
const isMobileViewport = ref(
  typeof window !== "undefined" &&
    window.matchMedia("(max-width: 899px)").matches
);
let mobileMediaQuery: MediaQueryList | undefined;
let sharedEventConsumers = 0;
let sharedEventStop: (() => void) | undefined;

function isTask(value: unknown): value is TaskItem {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "status" in value &&
    "type" in value
  );
}

function isTransfer(value: unknown): value is TransferItem {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "kind" in value &&
    "status" in value
  );
}

function isHistory(value: unknown): value is HistoryEntry {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "action" in value &&
    "createdAt" in value
  );
}

function handleTaskCenterEvent(event: TaskCenterEvent) {
  if (event.type === "task.changed" && isTask(event.data)) {
    tasksStore.record(event.data);
  } else if (event.type === "transfer.changed" && isTransfer(event.data)) {
    transfersStore.record(event.data);
  } else if (event.type === "history.created" && isHistory(event.data)) {
    historyStore.record(event.data);
  }
}

async function reloadTaskCenterSnapshot() {
  await Promise.allSettled([
    tasksStore.loadSummary(),
    transfersStore.load(),
    historyStore.loaded
      ? historyStore.load(historyStore.currentFilter)
      : Promise.resolve(),
  ]);
}

function startSharedEvents() {
  sharedEventConsumers++;
  if (sharedEventConsumers !== 1 || !authStore.isLoggedIn) return;
  void tasksStore.loadSummary();
  void transfersStore.load();
  sharedEventStop = connectTaskCenterEvents(handleTaskCenterEvent, () => {
    void reloadTaskCenterSnapshot();
  });
}

function stopSharedEvents() {
  sharedEventConsumers = Math.max(0, sharedEventConsumers - 1);
  if (sharedEventConsumers === 0) {
    sharedEventStop?.();
    sharedEventStop = undefined;
  }
}
const updateMobileViewport = (event?: MediaQueryListEvent) => {
  isMobileViewport.value =
    event?.matches ?? mobileMediaQuery?.matches ?? isMobileViewport.value;
};

onMounted(() => {
  mobileMediaQuery = window.matchMedia("(max-width: 899px)");
  updateMobileViewport();
  if (mobileMediaQuery.addEventListener) {
    mobileMediaQuery.addEventListener("change", updateMobileViewport);
  } else {
    mobileMediaQuery.addListener(updateMobileViewport);
  }
  if (authStore.isLoggedIn) startSharedEvents();
});

onUnmounted(() => {
  if (mobileMediaQuery) {
    if (mobileMediaQuery.removeEventListener) {
      mobileMediaQuery.removeEventListener("change", updateMobileViewport);
    } else {
      mobileMediaQuery.removeListener(updateMobileViewport);
    }
  }
  stopSharedEvents();
});

const ifActionsSlot = computed(() =>
  Boolean(slots.actions || slots["mobile-actions"] || slots["primary-actions"])
);
</script>
