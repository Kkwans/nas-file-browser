<template>
  <div id="editor-container">
    <header-bar>
      <action icon="close" :label="t('buttons.close')" @action="close()" />
      <title>{{ fileStore.req?.name ?? "" }}</title>

      <action
        v-if="authStore.user?.perm.modify"
        id="save-button"
        icon="save"
        :label="t('buttons.save')"
        @action="save()"
      />

      <!-- Markdown 模式切换 -->
      <template v-if="isMarkdownFile">
        <action
          icon="edit"
          :label="t('buttons.vditorIR')"
          @action="switchMode('ir')"
          :class="{ active: currentMode === 'ir' }"
        />
        <action
          icon="vertical_split"
          :label="t('buttons.vditorSV')"
          @action="switchMode('sv')"
          :class="{ active: currentMode === 'sv' }"
        />
        <action
          icon="visibility"
          :label="t('buttons.vditorPreview')"
          @action="switchMode('preview')"
          :class="{ active: currentMode === 'preview' }"
        />
      </template>
    </header-bar>

    <div class="loading delayed" v-if="layoutStore.loading">
      <div class="spinner">
        <div class="bounce1"></div>
        <div class="bounce2"></div>
        <div class="bounce3"></div>
      </div>
    </div>
    <template v-else>
      <!-- Vditor 容器（Markdown 文件） -->
      <div v-if="isMarkdownFile" id="vditor-mount" class="vditor-mount markdown-editor-active"></div>
      <!-- Ace 编辑器（非 Markdown 文件） -->
      <form v-else id="editor"></form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { files as api } from "@/api";
import buttons from "@/utils/buttons";
import url from "@/utils/url";
import ace, { Ace, version as ace_version } from "ace-builds";
import "ace-builds/src-noconflict/ext-language_tools";
import modelist from "ace-builds/src-noconflict/ext-modelist";

import Action from "@/components/header/Action.vue";
import HeaderBar from "@/components/header/HeaderBar.vue";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { getEditorTheme, getTheme } from "@/utils/theme";
import { inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";

const $showError = inject<IToastError>("$showError")!;

const fileStore = useFileStore();
const authStore = useAuthStore();
const layoutStore = useLayoutStore();

const { t } = useI18n();

const route = useRoute();
const router = useRouter();

const editor = ref<Ace.Editor | null>(null);
const isMarkdownFile =
  fileStore.req?.name.endsWith(".md") ||
  fileStore.req?.name.endsWith(".markdown");

const currentMode = ref<"ir" | "sv" | "preview">("ir");
let vditorInstance: any = null;
let aceEditor: Ace.Editor | null = null;
let savedContent = ""; // 保存一份内容用于模式切换时重建
let initialMdContent = ""; // 记录 Markdown 初始内容用于 dirty 检测

onMounted(() => {
  window.addEventListener("keydown", keyEvent);
  window.addEventListener("beforeunload", handlePageChange);

  const fileContent = fileStore.req?.content || "";

  const initEditor = () => {
    setTimeout(() => {
      if (isMarkdownFile) {
        initVditor(fileContent);
      } else {
        initAceEditor(fileContent);
      }
    }, 50);
  };

  if (!layoutStore.loading) {
    initEditor();
  } else {
    // 等待 loading 结束后再初始化编辑器
    const stop = watch(
      () => layoutStore.loading,
      (loading) => {
        if (!loading) {
          stop();
          initEditor();
        }
      }
    );
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", keyEvent);
  window.removeEventListener("beforeunload", handlePageChange);
  if (vditorInstance) {
    try { vditorInstance.destroy(); } catch {}
    vditorInstance = null;
  }
  if (aceEditor) {
    aceEditor.destroy();
    aceEditor = null;
  }
});

onBeforeRouteUpdate((to, from, next) => {
  const isDirty = isMarkdownFile
    ? (vditorInstance && vditorInstance.getValue() !== savedContent)
    : !aceEditor?.session.getUndoManager().isClean();

  if (!isDirty) {
    next();
    return;
  }

  layoutStore.showHover({
    prompt: "discardEditorChanges",
    confirm: (event: Event) => {
      event.preventDefault();
      next();
    },
    saveAction: async () => {
      await save();
      next();
    },
  });
});

const initVditor = async (content: string) => {
  savedContent = content;
  initialMdContent = content;
  await initVditorWithMode(content, 'ir');
};

const loadVditorResources = async () => {
  // 动态加载 Vditor CSS
  if (!document.querySelector('link[href*="vditor"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/vditor@3.10.9/dist/index.css';
    document.head.appendChild(link);
  }

  // 动态加载 Vditor JS
  if (!(window as any).Vditor) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/vditor@3.10.9/dist/index.min.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
};

const isDarkTheme = () => {
  // FileBrowser 在 <html> 元素上设置 className="dark"
  return document.documentElement.className === 'dark';
};

const initVditorWithMode = async (content: string, mode: 'ir' | 'sv') => {
  await loadVditorResources();

  const VditorClass = (window as any).Vditor;
  const mountEl = document.getElementById('vditor-mount');
  if (!mountEl) return;

  const isDark = isDarkTheme();

  vditorInstance = new VditorClass('vditor-mount', {
    value: content,
    lang: 'zh_CN',
    theme: isDark ? 'dark' : 'classic',
    mode: mode,
    toolbar: [
      'emoji', 'headings', 'bold', 'italic', 'strike', '|',
      'line', 'quote', 'list', 'ordered-list', 'check', '|',
      'code', 'inline-code', 'table', '|',
      'link', 'upload', '|',
      'undo', 'redo', '|',
      'edit-mode', 'preview', 'fullscreen', '|',
      {
        name: 'source-mode',
        tipPosition: 's',
        tip: '源码模式',
        icon: '<svg viewBox="0 0 1024 1024"><path d="M586.185 280.418l44.206-44.206L816 421.812l-185.609 185.61-44.206-44.207L727.588 421.812zM437.815 743.582l-44.206 44.206L208 602.188l185.609-185.61 44.206 44.207L296.412 602.188z"/></svg>',
        click: () => switchMode('sv'),
      },
    ],
    toolbarConfig: {
      hide: false,
    },
    outline: {
      enable: true,
      position: 'right',
    },
    counter: {
      enable: true,
    },
    typewriterMode: true,
    undoDelay: 200,
    tab: '\t',
    preview: {
      theme: {
        current: isDark ? 'dark' : 'light',
      },
      markdown: {
        sanitize: true,
        toc: true,
      },
    },
    after: () => {
      // 加载完成后聚焦
      // 确保大纲目录点击可以跳转
      setupOutlineClickHandler();
    },
  });
};

// 确保大纲目录点击可以跳转到对应标题
const setupOutlineClickHandler = () => {
  const mountEl = document.getElementById('vditor-mount');
  if (!mountEl) return;

  const bindOutlineClicks = () => {
    const outlineEl = mountEl.querySelector('.vditor-outline');
    if (!outlineEl) return;

    // 移除旧监听器（避免重复绑定）
    outlineEl.removeEventListener('click', handleOutlineClick);
    outlineEl.addEventListener('click', handleOutlineClick);
  };

  // 使用 MutationObserver 确保大纲 DOM 渲染完成后绑定
  const observer = new MutationObserver(() => {
    const outlineEl = mountEl.querySelector('.vditor-outline');
    if (outlineEl && outlineEl.children.length > 0) {
      bindOutlineClicks();
      observer.disconnect();
    }
  });

  observer.observe(mountEl, { childList: true, subtree: true });

  // 也立即尝试绑定（大纲可能已存在）
  bindOutlineClicks();
};

const handleOutlineClick = (e: Event) => {
  const target = e.target as HTMLElement;
  const mountEl = document.getElementById('vditor-mount');
  if (!mountEl) return;

  // 尝试多种选择器匹配大纲项
  const spanEl = target.closest('span[data-target-id]') as HTMLElement
    || target.closest('[data-target-id]') as HTMLElement
    || target.closest('span[data-id]') as HTMLElement;

  if (!spanEl) return;

  const targetId = spanEl.getAttribute('data-target-id') || spanEl.getAttribute('data-id');
  if (!targetId) return;

  // 查找目标标题元素并滚动
  const selectors = [
    `#${CSS.escape(targetId)}`,
    `[data-id="${targetId}"]`,
    `h1[id="${targetId}"], h2[id="${targetId}"], h3[id="${targetId}"], h4[id="${targetId}"], h5[id="${targetId}"], h6[id="${targetId}"]`,
  ];

  for (const sel of selectors) {
    try {
      const headingEl = mountEl.querySelector(sel);
      if (headingEl) {
        headingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    } catch {}
  }
};

const initVditorPreview = async (content: string) => {
  await loadVditorResources();

  const VditorClass = (window as any).Vditor;
  const mountEl = document.getElementById('vditor-mount');
  if (!mountEl) return;

  const isDark = isDarkTheme();

  // 阅读模式：用 Vditor 的预览方法渲染为纯 HTML
  // md2html 可能返回 Promise 或 string，统一用 Promise.resolve 包裹确保 await
  const htmlResult = VditorClass.md2html(content, { theme: isDark ? 'dark' : 'light' });
  const html = await Promise.resolve(htmlResult);
  if (typeof html !== 'string') {
    console.error('[Vditor] md2html returned non-string:', html);
    return;
  }

  const previewElement = document.createElement('div');
  previewElement.className = 'vditor-reset vditor-preview--content';
  previewElement.innerHTML = html;
  mountEl.appendChild(previewElement);

  // 保存一个伪实例，getValue 时返回原始内容
  vditorInstance = {
    getValue: () => content,
    destroy: () => { previewElement.remove(); },
  };
};

const initAceEditor = (content: string) => {
  ace.config.set(
    "basePath",
    `https://cdn.jsdelivr.net/npm/ace-builds@${ace_version}/src-min-noconflict/`
  );

  const isDark = getTheme() === "dark";

  aceEditor = ace.edit("editor", {
    value: content,
    showPrintMargin: false,
    readOnly: fileStore.req?.type === "textImmutable",
    theme: getEditorTheme(authStore.user?.aceEditorTheme ?? ""),
    mode: modelist.getModeForPath(fileStore.req!.name).mode,
    wrap: true,
    enableBasicAutocompletion: true,
    enableLiveAutocompletion: true,
    enableSnippets: true,
    // 代码可读性增强
    displayIndentGuides: true,
    highlightActiveLine: true,
    highlightSelectedWord: true,
    highlightGutterLine: true,
    showGutter: true,
    showLineNumbers: true,
    // 括号匹配
    behavioursEnabled: true,
    wrapBehavioursEnabled: true,
    // 滚动与导航
    animatedScroll: true,
    cursorStyle: "smooth",
    fadeFoldWidgets: false,
    // 字体渲染
    fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
    fontSize: parseInt(localStorage.getItem("editorFontSize") || "14"),
    // 偏好设置
    tabSize: 2,
    useSoftTabs: true,
    navigateWithinSoftTabs: true,
  });

  // 暗色模式下覆盖选区和活动行颜色，确保可读性
  if (isDark) {
    aceEditor.setOptions({
      selectionStyle: "text",
    });
  }

  aceEditor.focus();
};

const switchMode = async (mode: "ir" | "sv" | "preview") => {
  if (!vditorInstance) return;
  if (currentMode.value === mode) return;

  // 保存当前内容
  const content = vditorInstance.getValue();
  savedContent = content;
  currentMode.value = mode;

  // 销毁旧实例，按新模式重建（Vditor 不支持运行时切换模式）
  try { vditorInstance.destroy(); } catch {}
  vditorInstance = null;

  // 等待 DOM 更新
  await new Promise(r => setTimeout(r, 50));

  if (mode === 'preview') {
    // 阅读模式：用 Vditor 的预览模式（只有预览面板）
    await initVditorPreview(content);
  } else {
    // ir 或 sv 模式
    initVditorWithMode(content, mode);
  }
};

const keyEvent = (event: KeyboardEvent) => {
  if (event.code === "Escape") {
    close();
  }

  if (!event.ctrlKey && !event.metaKey) return;
  if (event.key !== "s") return;

  event.preventDefault();
  save();
};

const handlePageChange = (event: BeforeUnloadEvent) => {
  if (isMarkdownFile && vditorInstance) {
    // Vditor dirty 检测：比较当前内容与初始内容
    const currentContent = vditorInstance.getValue();
    if (currentContent !== initialMdContent) {
      event.preventDefault();
      event.returnValue = true;
    }
    return;
  }
  if (!aceEditor?.session.getUndoManager().isClean()) {
    event.preventDefault();
    event.returnValue = true;
  }
};

const save = async (throwError?: boolean) => {
  const button = "save";
  buttons.loading("save");

  try {
    let content = '';
    if (isMarkdownFile && vditorInstance) {
      content = vditorInstance.getValue();
    } else if (aceEditor) {
      content = aceEditor.getValue();
    }
    await api.put(route.path, content);
    if (isMarkdownFile) {
      initialMdContent = content;
    }
    if (aceEditor) {
      aceEditor.session.getUndoManager().markClean();
    }
    buttons.success(button);
  } catch (e: any) {
    buttons.done(button);
    $showError(e);
    if (throwError) throw e;
  }
};

const close = () => {
  const isDirty = isMarkdownFile
    ? false // Vditor handles this
    : !aceEditor?.session.getUndoManager().isClean();

  if (!isDirty) {
    finishClose();
    return;
  }

  layoutStore.showHover({
    prompt: "discardEditorChanges",
    confirm: (event: Event) => {
      event.preventDefault();
      if (aceEditor) aceEditor.session.getUndoManager().reset();
      finishClose();
    },
    saveAction: async () => {
      try {
        await save(true);
        finishClose();
      } catch {}
    },
  });
};

const finishClose = () => {
  const uri = url.removeLastDir(route.path) + "/";
  router.push({ path: uri });
};
</script>

<style scoped>
.vditor-mount {
  flex: 1;
  overflow: auto;
}

/* Vditor 容器全屏 */
#vditor-mount :deep(.vditor) {
  border: none !important;
  height: 100% !important;
  border-radius: 0 !important;
}

/* 隐藏 Vditor 自带的标题栏（我们用自己的 header-bar） */
#vditor-mount :deep(.vditor-toolbar) {
  border-radius: 0 !important;
  border-bottom: 1px solid var(--borderSecondary) !important;
  background: var(--background) !important;
  padding: 4px 8px !important;
}

#vditor-mount :deep(.vditor-content) {
  background: var(--background) !important;
}

/* 活跃的模式按钮 */
.active :deep(i) {
  color: var(--blue) !important;
}
</style>
