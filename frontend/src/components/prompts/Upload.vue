<template>
  <div class="card floating">
    <div class="card-title">
      <h2>上传</h2>
    </div>

    <div class="card-content">
      <p>选择上传方式</p>
    </div>

    <div class="card-action full">
      <div
        @click="uploadFile"
        @keypress.enter="uploadFile"
        class="action"
        id="focus-prompt"
        tabindex="1"
      >
        <i class="material-icons">insert_drive_file</i>
        <div class="title">文件</div>
      </div>
      <div
        @click="uploadFolder"
        @keypress.enter="uploadFolder"
        class="action"
        tabindex="2"
      >
        <i class="material-icons">folder</i>
        <div class="title">文件夹</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import { useLayoutStore } from "@/stores/layout";
import * as upload from "@/utils/upload";
const route = useRoute();

const layoutStore = useLayoutStore();

const openUpload = (isFolder: boolean) => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  input.webkitdirectory = isFolder;
  input.onchange = (event: Event) => {
    upload.processFileInput(event, route.path, layoutStore);
  };
  input.click();
};

const uploadFile = () => {
  openUpload(false);
};
const uploadFolder = () => {
  openUpload(true);
};
</script>
