<template>
  <header>
    <div class="header-leading">
      <img v-if="showLogo" :src="logoURL" :alt="name" />
      <Action
        v-if="showMenu"
        class="menu-button"
        icon="menu"
        label="切换侧边栏"
        @action="layoutStore.toggleTransient('sidebar')"
      />
    </div>

    <div class="header-center">
      <slot />
    </div>

    <div class="header-trailing">
      <div class="header-mobile-actions">
        <slot name="mobile-actions" />
      </div>
      <div
        id="dropdown"
        :class="{ active: layoutStore.currentPromptName === 'more' }"
      >
        <slot name="actions" />
      </div>

      <Action
        v-if="ifActionsSlot"
        id="more"
        icon="more_vert"
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
import { computed, useSlots } from "vue";
defineProps<{
  showLogo?: boolean;
  showMenu?: boolean;
}>();

const layoutStore = useLayoutStore();
const slots = useSlots();

const ifActionsSlot = computed(() =>
  Boolean(slots.actions || slots["mobile-actions"])
);
</script>
