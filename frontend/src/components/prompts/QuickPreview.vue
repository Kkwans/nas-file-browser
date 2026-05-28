<template>
  <div class="card floating quick-preview-card">
    <div class="quick-preview-header">
      <div class="quick-preview-info">
        <i class="material-icons file-type-icon" :class="fileTypeClass">{{ fileIcon }}</i>
        <span class="quick-preview-name">{{ item.name }}</span>
        <span class="quick-preview-meta">{{ humanSize }} · {{ humanTime }}</span>
      </div>
      <div class="quick-preview-actions">
        <button class="quick-preview-btn" @click="navigateFile(-1)" :title="$t('buttons.previous')">
          <i class="material-icons">chevron_left</i>
        </button>
        <button class="quick-preview-btn" @click="navigateFile(1)" :title="$t('buttons.next')">
          <i class="material-icons">chevron_right</i>
        </button>
        <button class="quick-preview-btn" @click="downloadFile" :title="$t('buttons.download')">
          <i class="material-icons">file_download</i>
        </button>
        <button class="quick-preview-btn" @click="openFull" :title="$t('buttons.openFile')">
          <i class="material-icons">open_in_new</i>
        </button>
        <button class="quick-preview-btn close-btn" @click="close" :title="$t('buttons.close')">
          <i class="material-icons">close</i>
        </button>
      </div>
    </div>
    <div class="quick-preview-body">
      <!-- Image -->
      <img
        v-if="item.type === 'image'"
        :src="previewUrl"
        :alt="item.name"
        class="quick-preview-image"
      />
      <!-- Video -->
      <video
        v-else-if="item.type === 'video'"
        :src="directUrl"
        controls
        autoplay
        class="quick-preview-video"
      />
      <!-- Audio -->
      <div v-else-if="item.type === 'audio'" class="quick-preview-audio-wrap">
        <i class="material-icons audio-icon">audiotrack</i>
        <audio :src="directUrl" controls autoplay class="quick-preview-audio" />
      </div>
      <!-- PDF -->
      <iframe
        v-else-if="isPdf"
        :src="directUrl"
        class="quick-preview-pdf"
      />
      <!-- Markdown (rendered) -->
      <div
        v-else-if="isMarkdown"
        class="quick-preview-markdown md_preview"
        ref="markdownBody"
      ></div>
      <!-- Text / Code -->
      <pre v-else-if="isText" class="quick-preview-text"><code>{{ textContent }}</code></pre>
      <!-- Blob (no preview) -->
      <div v-else class="quick-preview-no-preview">
        <i class="material-icons">feedback</i>
        <span>{{ $t('files.noPreview') }}</span>
      </div>
    </div>
    <div v-if="loading" class="quick-preview-loading">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState, mapActions } from "pinia";
import { useLayoutStore } from "@/stores/layout";
import { useFileStore } from "@/stores/file";
import { files as api } from "@/api";
import { filesize } from "@/utils";
import { getFileIcon, isTextFile, isPreviewable } from "@/utils/fileIcons";
import { loadMarkdownResources, highlightAndAnnotateCodeBlocks } from "@/utils/externalResources";
import dayjs from "dayjs";
import { useRouter, useRoute } from "vue-router";

export default {
  name: "quick-preview",
  data() {
    return {
      loading: true,
      textContent: "",
      markdownHtml: "",
      fileStoreRef: null,
      routerRef: null,
      routeRef: null,
    };
  },
  created() {
    this.fileStoreRef = useFileStore();
    this.routerRef = useRouter();
    this.routeRef = useRoute();
  },
  computed: {
    ...mapState(useLayoutStore, ["currentPrompt"]),
    item() {
      return this.currentPrompt?.props?.item || {};
    },
    humanSize() {
      return filesize(this.item.size || 0);
    },
    humanTime() {
      return dayjs(this.item.modified).fromNow();
    },
    isPdf() {
      return this.item.extension?.toLowerCase() === ".pdf";
    },
    isMarkdown() {
      const ext = this.item.extension?.toLowerCase() || "";
      return ext === ".md" || ext === ".markdown";
    },
    isText() {
      return isTextFile(this.item.type || "", this.item.extension);
    },
    fileIcon() {
      const typeIcons = {
        image: "image",
        video: "movie",
        audio: "volume_up",
        pdf: "description",
        text: "description",
        textImmutable: "description",
        blob: "insert_drive_file",
        invalid_link: "link_off",
      };
      // Prefer type-based icon, fall back to extension-based
      return typeIcons[this.item.type] || getFileIcon(this.item.name || "");
    },
    fileTypeClass() {
      const classes = {
        image: "type-image",
        video: "type-video",
        audio: "type-audio",
        pdf: "type-pdf",
        text: "type-text",
        textImmutable: "type-text",
      };
      return classes[this.item.type] || "type-blob";
    },
    previewUrl() {
      if (this.item.type === "image") {
        return api.getPreviewURL(this.item, "big");
      }
      return api.getDownloadURL(this.item, true);
    },
    directUrl() {
      return api.getDownloadURL(this.item, true);
    },
  },
  mounted() {
    window.addEventListener("keydown", this.handleKeydown);
    if (this.isMarkdown) {
      this.loadMarkdownContent();
    } else if (this.isText) {
      this.loadTextContent();
    } else if (this.item.type === "blob" || this.item.type === "invalid_link") {
      this.loading = false;
    }
  },
  beforeUnmount() {
    window.removeEventListener("keydown", this.handleKeydown);
  },
  methods: {
    ...mapActions(useLayoutStore, ["closeHovers"]),
    handleKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        this.closeHovers();
        return;
      }
      // Left/Right arrow to navigate between files
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        this.navigateFile(event.key === "ArrowRight" ? 1 : -1);
      }
    },
    navigateFile(direction) {
      const listing = this.fileStoreRef?.oldReq?.items;
      if (!listing || listing.length === 0) return;

      const currentName = this.item.name;
      const currentIndex = listing.findIndex((it) => it.name === currentName);
      if (currentIndex === -1) return;

      // Find next/previous previewable file
      let idx = currentIndex;
      do {
        idx += direction;
        if (idx < 0) idx = listing.length - 1;
        if (idx >= listing.length) idx = 0;
        if (idx === currentIndex) return; // wrapped around, no other file
      } while (!isPreviewable(listing[idx].type, listing[idx].extension));

      const target = listing[idx];
      this.closeHovers();
      this.routerRef?.push({ path: target.url });
    },
    close() {
      this.closeHovers();
    },
    downloadFile() {
      const a = document.createElement('a');
      a.href = this.directUrl;
      a.download = this.item.name || '';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    },
    openFull() {
      window.open(this.directUrl, "_blank");
    },
    async loadTextContent() {
      try {
        const resp = await fetch(this.directUrl, { credentials: "include" });
        const text = await resp.text();
        this.textContent =
          text.length > 51200
            ? text.substring(0, 51200) + "\n\n... " + this.$t('files.fileTooLarge')
            : text;
      } catch {
        this.textContent = this.$t('files.cannotLoadContent');
      } finally {
        this.loading = false;
      }
    },
    async loadMarkdownContent() {
      try {
        const resp = await fetch(this.directUrl, { credentials: "include" });
        const text = await resp.text();
        const truncated =
          text.length > 51200
            ? text.substring(0, 51200) + "\n\n... " + this.$t('files.fileTooLarge')
            : text;
        await this.renderMarkdown(truncated);
      } catch {
        this.textContent = this.$t('files.cannotLoadContent');
        // Fallback to plain text display
        this.$nextTick(() => {
          if (this.$refs.markdownBody) {
            this.$refs.markdownBody.textContent = this.textContent;
          }
        });
      } finally {
        this.loading = false;
      }
    },
    async renderMarkdown(content) {
      await loadMarkdownResources();

      // Render markdown to HTML
      const VditorClass = (window).Vditor;
      const isDark = document.documentElement.className === 'dark';
      const htmlResult = VditorClass.md2html(content, { theme: isDark ? 'dark' : 'light' });
      const html = await Promise.resolve(htmlResult);

      if (typeof html === 'string' && this.$refs.markdownBody) {
        this.$refs.markdownBody.innerHTML = html;
        this.highlightCodeBlocks(this.$refs.markdownBody);
      }
    },
    highlightCodeBlocks(container) {
      highlightAndAnnotateCodeBlocks(container);
    },
  },
};
</script>
