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

import { logoURL, name } from "@/utils/constants";

import Action from "@/components/header/Action.vue";
import { computed, onMounted, onUnmounted, ref, useSlots } from "vue";
defineProps<{
  showLogo?: boolean;
  showMenu?: boolean;
}>();

const layoutStore = useLayoutStore();
const slots = useSlots();

// The desktop header must not render the transient sidebar toggle at all.
// Keeping this contract in the component (instead of relying on a cascade of
// media-query overrides) prevents the button from becoming visible when an
// older page stylesheet wins the cascade.
const isMobileViewport = ref(
  typeof window !== "undefined" &&
    window.matchMedia("(max-width: 736px)").matches
);
let mobileMediaQuery: MediaQueryList | undefined;
const updateMobileViewport = (event?: MediaQueryListEvent) => {
  isMobileViewport.value =
    event?.matches ?? mobileMediaQuery?.matches ?? isMobileViewport.value;
};

onMounted(() => {
  mobileMediaQuery = window.matchMedia("(max-width: 736px)");
  updateMobileViewport();
  if (mobileMediaQuery.addEventListener) {
    mobileMediaQuery.addEventListener("change", updateMobileViewport);
  } else {
    mobileMediaQuery.addListener(updateMobileViewport);
  }
});

onUnmounted(() => {
  if (!mobileMediaQuery) return;
  if (mobileMediaQuery.removeEventListener) {
    mobileMediaQuery.removeEventListener("change", updateMobileViewport);
  } else {
    mobileMediaQuery.removeListener(updateMobileViewport);
  }
});

const ifActionsSlot = computed(() =>
  Boolean(slots.actions || slots["mobile-actions"] || slots["primary-actions"])
);
</script>
