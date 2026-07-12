<template>
  <div class="pdf-viewer" :class="{ 'pdf-fullscreen': isFullscreen }">
    <!-- PDF Toolbar -->
    <div class="pdf-toolbar">
      <div class="pdf-toolbar-left">
        <button class="pdf-btn" title="下载" @click="download">
          <i class="material-icons">file_download</i>
        </button>
        <button class="pdf-btn" title="打印" @click="print">
          <i class="material-icons">print</i>
        </button>
      </div>

      <div class="pdf-toolbar-center">
        <button class="pdf-btn" title="缩小" @click="zoomOut">
          <i class="material-icons">remove</i>
        </button>
        <span class="pdf-zoom-label">{{ zoomPercent }}%</span>
        <button class="pdf-btn" title="放大" @click="zoomIn">
          <i class="material-icons">add</i>
        </button>
        <span class="pdf-divider"></span>
        <button class="pdf-btn" title="适应页面" @click="zoomFit">
          <i class="material-icons">fit_screen</i>
        </button>
        <button class="pdf-btn" title="适应宽度" @click="zoomWidth">
          <i class="material-icons">swap_horiz</i>
        </button>
      </div>

      <div class="pdf-toolbar-right">
        <button
          class="pdf-btn"
          :title="isFullscreen ? '退出全屏' : '全屏'"
          @click="toggleFullscreen"
        >
          <i class="material-icons">{{
            isFullscreen ? "fullscreen_exit" : "fullscreen"
          }}</i>
        </button>
      </div>
    </div>

    <!-- PDF Content -->
    <div class="pdf-container" ref="containerRef">
      <div v-if="loading" class="pdf-loading">
        <div class="spinner">
          <div class="bounce1"></div>
          <div class="bounce2"></div>
          <div class="bounce3"></div>
        </div>
        <span>加载中...</span>
      </div>
      <iframe
        ref="iframeRef"
        :src="pdfSrc"
        class="pdf-iframe"
        :style="iframeStyle"
        @load="onLoad"
        @error="onError"
      ></iframe>
      <div v-if="error" class="pdf-error">
        <i class="material-icons">error_outline</i>
        <span>加载失败</span>
        <button class="pdf-btn-text" @click="download">下载文件</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
interface Props {
  src: string;
  name?: string;
}

const props = withDefaults(defineProps<Props>(), {
  name: "document.pdf",
});

const iframeRef = ref<HTMLIFrameElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const loading = ref(true);
const error = ref(false);
const isFullscreen = ref(false);
const zoom = ref(100);

const pdfSrc = computed(() => {
  // Append zoom parameter for Chrome/Edge PDF viewer
  if (props.src.includes("?")) {
    return `${props.src}&zoom=${zoom.value}`;
  }
  return `${props.src}#zoom=${zoom.value}`;
});

const zoomPercent = computed(() => zoom.value);

const iframeStyle = computed(() => ({
  transform: `scale(${zoom.value / 100})`,
  transformOrigin: "top center",
  width: `${10000 / zoom.value}%`,
  height: `${10000 / zoom.value}%`,
}));

const onLoad = () => {
  loading.value = false;
  error.value = false;
};

const onError = () => {
  loading.value = false;
  error.value = true;
};

const zoomIn = () => {
  zoom.value = Math.min(500, zoom.value + 25);
};

const zoomOut = () => {
  zoom.value = Math.max(25, zoom.value - 25);
};

const zoomFit = () => {
  zoom.value = 100;
};

const zoomWidth = () => {
  zoom.value = 150;
};

const toggleFullscreen = () => {
  if (!containerRef.value) return;

  if (!document.fullscreenElement) {
    containerRef.value.closest(".pdf-viewer")?.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};

const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

const download = () => {
  const link = document.createElement("a");
  link.href = props.src;
  link.download = props.name;
  link.click();
};

const print = () => {
  if (iframeRef.value?.contentWindow) {
    iframeRef.value.contentWindow.print();
  }
};

onMounted(() => {
  document.addEventListener("fullscreenchange", onFullscreenChange);
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", onFullscreenChange);
});
</script>
