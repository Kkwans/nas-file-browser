<template>
  <div class="dashboard">
    <header-bar showMenu showLogo />

    <div id="nav">
      <div class="wrapper">
        <ul>
          <li :class="{ active: $route.path === '/settings/profile' }">
            <router-link to="/settings/profile">账户设置</router-link>
          </li>
          <li
            v-if="user?.perm.share"
            :class="{ active: $route.path === '/settings/shares' }"
          >
            <router-link to="/settings/shares">分享管理</router-link>
          </li>
          <li
            v-if="user?.perm.admin"
            :class="{ active: $route.path === '/settings/global' }"
          >
            <router-link to="/settings/global">全局设置</router-link>
          </li>
          <li
            v-if="user?.perm.admin"
            :class="{
              active:
                $route.path === '/settings/users' || $route.name === 'User',
            }"
          >
            <router-link to="/settings/users">用户管理</router-link>
          </li>
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
        <span>加载中...</span>
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
const authStore = useAuthStore();
const layoutStore = useLayoutStore();

const user = computed(() => authStore.user);
const loading = computed(() => layoutStore.loading);
</script>
