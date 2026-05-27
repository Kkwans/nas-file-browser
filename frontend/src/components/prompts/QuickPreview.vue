<template>
  <div class="card floating quick-preview-card">
    <div class="quick-preview-header">
      <div class="quick-preview-info">
        <i class="material-icons file-type-icon" :class="fileTypeClass">{{ fileIcon }}</i>
        <span class="quick-preview-name">{{ item.name }}</span>
        <span class="quick-preview-meta">{{ humanSize }} · {{ humanTime }}</span>
      </div>
      <div class="quick-preview-actions">
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
import { files as api } from "@/api";
import { filesize } from "@/utils";
import dayjs from "dayjs";

export default {
  name: "quick-preview",
  data() {
    return {
      loading: true,
      textContent: "",
      markdownHtml: "",
    };
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
      // Markdown files are handled separately by isMarkdown
      if (this.isMarkdown) return false;
      const textTypes = ["text", "textImmutable"];
      const textExts = [
        ".txt", ".md", ".json", ".xml", ".yml", ".yaml", ".csv", ".log",
        ".ini", ".conf", ".cfg", ".sh", ".bash", ".py", ".js", ".ts",
        ".go", ".java", ".c", ".cpp", ".h", ".css", ".html", ".vue",
        ".rs", ".rb", ".php", ".sql", ".toml", ".env", ".gitignore",
        ".dockerfile", ".makefile", ".srt", ".vtt", ".ass",
      ];
      if (textTypes.includes(this.item.type)) return true;
      const ext = this.item.extension?.toLowerCase() || "";
      return textExts.includes(ext);
    },
    fileIcon() {
      const icons = {
        image: "image",
        video: "movie",
        audio: "volume_up",
        pdf: "description",
        text: "description",
        textImmutable: "description",
        blob: "insert_drive_file",
        invalid_link: "link_off",
      };
      return icons[this.item.type] || "insert_drive_file";
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
      }
    },
    close() {
      this.closeHovers();
    },
    downloadFile() {
      window.open(this.directUrl, "_blank");
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
            ? text.substring(0, 51200) + "\n\n... (文件过大，仅显示前 50KB)"
            : text;
      } catch {
        this.textContent = "无法加载文件内容";
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
            ? text.substring(0, 51200) + "\n\n... (文件过大，仅显示前 50KB)"
            : text;
        await this.renderMarkdown(truncated);
      } catch {
        this.textContent = "无法加载文件内容";
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
      // Load Vditor CSS
      if (!document.querySelector('link[href*="vditor"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/vditor@3.10.9/dist/index.css';
        document.head.appendChild(link);
      }

      // Load highlight.js CSS
      const isDark = document.documentElement.className === 'dark';
      const themeCSS = isDark ? 'github-dark' : 'github';
      if (!document.querySelector('link[href*="highlight.js"]')) {
        const hlLink = document.createElement('link');
        hlLink.rel = 'stylesheet';
        hlLink.href = `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/${themeCSS}.min.css`;
        hlLink.id = 'hljs-theme';
        document.head.appendChild(hlLink);
      }

      // Load Vditor JS
      if (!(window).Vditor) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/vditor@3.10.9/dist/index.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Load highlight.js JS
      if (!(window).hljs) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Render markdown to HTML
      const VditorClass = (window).Vditor;
      const htmlResult = VditorClass.md2html(content, { theme: isDark ? 'dark' : 'light' });
      const html = await Promise.resolve(htmlResult);

      if (typeof html === 'string' && this.$refs.markdownBody) {
        this.$refs.markdownBody.innerHTML = html;
        this.highlightCodeBlocks(this.$refs.markdownBody);
      }
    },
    highlightCodeBlocks(container) {
      const codeBlocks = container.querySelectorAll('pre > code');
      const hljs = (window).hljs;

      codeBlocks.forEach((codeEl) => {
        // Extract language from class
        let lang = '';
        const langMatch = codeEl.className.match(/language-(\w+)/);
        if (langMatch) {
          lang = langMatch[1];
        }
        if (lang && !codeEl.getAttribute('data-lang')) {
          codeEl.setAttribute('data-lang', lang);
        }

        // Apply syntax highlighting
        if (hljs && lang) {
          try {
            const rawText = codeEl.textContent || '';
            const result = hljs.highlight(rawText, { language: lang, ignoreIllegals: true });
            codeEl.innerHTML = result.value;
            codeEl.classList.add('hljs');
          } catch (e) {
            // Language not supported, skip
          }
        }

        // Wrap lines for line numbers
        const html = codeEl.innerHTML;
        const lines = html.split('\n');
        if (lines.length > 1 && lines[lines.length - 1].trim() === '') {
          lines.pop();
        }
        const wrappedHtml = lines
          .map((line) => `<span class="code-line">${line}</span>`)
          .join('\n');
        codeEl.innerHTML = wrappedHtml;
        codeEl.classList.add('has-line-numbers');
      });
    },
  },
};
</script>
