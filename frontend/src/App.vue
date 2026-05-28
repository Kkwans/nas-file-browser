<template>
  <div>
    <router-view></router-view>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { setHtmlLocale } from "./i18n";
import { getMediaPreference, getTheme, setTheme } from "./utils/theme";
import type { UserTheme } from "@/types/user";

const userTheme = ref<UserTheme>(getTheme() || getMediaPreference());

onMounted(() => {
  setTheme(userTheme.value);
  setHtmlLocale();
  // this might be null during HMR
  const loading = document.getElementById("loading");
  loading?.classList.add("done");

  setTimeout(function () {
    loading?.parentNode?.removeChild(loading);
  }, 200);
});
</script>
