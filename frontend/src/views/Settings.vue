<template>
  <div class="dashboard">
    <header-bar showMenu showLogo />

    <div id="nav">
      <div class="wrapper">
        <ul>
          <router-link to="/settings/profile"
            ><li :class="{ active: $route.path === '/settings/profile' }">
              '账户设置'
            </li></router-link
          >
          <router-link to="/settings/shares" v-if="user?.perm.share"
            ><li :class="{ active: $route.path === '/settings/shares' }">
              '分享管理'
            </li></router-link
          >
          <router-link to="/settings/global" v-if="user?.perm.admin"
            ><li :class="{ active: $route.path === '/settings/global' }">
              '全局设置'
            </li></router-link
          >
          <router-link to="/settings/users" v-if="user?.perm.admin"
            ><li
              :class="{
                active:
                  $route.path === '/settings/users' || $route.name === 'User',
              }"
            >
              '用户管理'
            </li></router-link
          >
        </ul>
      </div>
    </div>

    <div v-if="loading">
      <h2 class="message delayed">
        <div class="spinner">
          <div class="bounce1"></div>
          <div class="bounce2"></div>
          <div class="bounce3"></div>
        </div>
        <span>'加载中...'</span>
      </h2>
    </div>

    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/auth";
import { useLayoutStore } from "@/stores/layout";
import HeaderBar from "@/components/header/HeaderBar.vue";
import { computed } from "vue";
import { T } from "@/utils/translations";

const t = (key: string, opts?: Record<string, any>): string => {
  let result = (T as any)[key] ?? key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      result = result.replace(new RegExp(`{\\s*${k}\\s*}`, "g"), String(v));
    }
  }
  return result;
};

const authStore = useAuthStore();
const layoutStore = useLayoutStore();

const user = computed(() => authStore.user);
const loading = computed(() => layoutStore.loading);
</script>
