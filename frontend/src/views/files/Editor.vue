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
let mdInitialized = false; // Vditor 是否已完成初始化
let userEdited = false; // 用户是否实际修改过内容

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
  const mountEl = document.getElementById('vditor-mount');
  if (mountEl) {
    mountEl.removeEventListener('click', handleOutlineCapture, true);
  }
  _outlineHandlerBound = false;
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
    ? (vditorInstance && userEdited && mdInitialized)
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
  mdInitialized = false;
  userEdited = false;
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

// 动态加载 highlight.js（代码块语法高亮）
const loadHighlightJS = async () => {
  const isDark = isDarkTheme();
  const themeCSS = isDark ? 'github-dark' : 'github';

  // 加载 highlight.js 主题 CSS
  if (!document.querySelector('link[href*="highlight.js"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/${themeCSS}.min.css`;
    link.id = 'hljs-theme';
    document.head.appendChild(link);
  }

  // 加载 highlight.js JS
  if (!(window as any).hljs) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js';
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
      // 编辑器初始化完成后，捕获 Vditor 规范化后的内容作为基线
      // 这样即使 Vditor 对内容做了微调（如尾部换行），也不会误判为 dirty
      try {
        const normalized = vditorInstance.getValue();
        savedContent = normalized;
        initialMdContent = normalized;
      } catch {}
      mdInitialized = true;
      // 确保大纲目录点击可以跳转
      setupOutlineClickHandler();
    },
    input: () => {
      // 用户实际编辑内容时标记为 dirty
      if (mdInitialized) {
        userEdited = true;
      }
    },
  });
};

// 确保大纲目录点击可以跳转到对应标题
// 使用捕获阶段事件监听，绕过 Vditor 内置的 stopPropagation
let _outlineHandlerBound = false;

const handleOutlineCapture = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  if (!target) return;

  // 检查是否点击了展开/折叠按钮，放行
  if (target.closest('.vditor-outline__action')) return;

  // 向上查找带有 data-target-id 的元素
  const outlineItem = target.closest('[data-target-id]') as HTMLElement;
  if (!outlineItem) return;

  const targetId = outlineItem.getAttribute('data-target-id');
  if (!targetId) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const headingEl = document.getElementById(targetId);
  if (!headingEl) return;

  // 找到实际的滚动容器（vditor-mount 内部的可滚动元素）
  const mountEl = document.getElementById('vditor-mount');
  if (!mountEl) return;

  // 在 IR/SV 模式下，内容区域是可滚动的
  // 查找从标题元素到 mountEl 之间的可滚动父元素
  let scrollContainer: HTMLElement | null = null;
  let cur: HTMLElement | null = headingEl;
  while (cur && cur !== mountEl) {
    const style = window.getComputedStyle(cur);
    if (/(auto|scroll)/.test(style.overflow + style.overflowY) &&
        cur.scrollHeight > cur.clientHeight) {
      scrollContainer = cur;
      break;
    }
    cur = cur.parentElement;
  }

  if (scrollContainer) {
    // 标题在内部滚动容器中，手动计算偏移量
    const containerRect = scrollContainer.getBoundingClientRect();
    const headingRect = headingEl.getBoundingClientRect();
    const offset = headingRect.top - containerRect.top + scrollContainer.scrollTop - 20;
    scrollContainer.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' });
  } else {
    // 回退: scrollIntoView 或 window scrollTo
    headingEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

const setupOutlineClickHandler = () => {
  const mountEl = document.getElementById('vditor-mount');
  if (!mountEl || _outlineHandlerBound) return;

  // 使用捕获阶段监听，确保在 Vditor 的冒泡处理器之前执行
  mountEl.addEventListener('click', handleOutlineCapture, true);
  _outlineHandlerBound = true;
};

const initVditorPreview = async (content: string) => {
  await loadVditorResources();
  await loadHighlightJS();

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

  // 为代码块添加语法高亮 + 行号 + 语言标签
  highlightAndAnnotateCodeBlocks(previewElement);

  // 保存一个伪实例，getValue 时返回原始内容
  vditorInstance = {
    getValue: () => content,
    destroy: () => { previewElement.remove(); },
  };
  // 预览模式基线与实际内容一致
  savedContent = content;
  initialMdContent = content;
  mdInitialized = true;
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

// 为代码块添加语法高亮 + 行号 + 语言标签
// 处理顺序：1) 语法高亮 2) 行号包裹 3) 语言标签
const highlightAndAnnotateCodeBlocks = (container: HTMLElement) => {
  const codeBlocks = container.querySelectorAll('pre > code');
  const hljs = (window as any).hljs;

  codeBlocks.forEach((codeEl) => {
    // 1. 从 class 提取语言名
    let lang = '';
    const langMatch = codeEl.className.match(/language-(\w+)/);
    if (langMatch) {
      lang = langMatch[1];
    }
    // 设置 data-lang（供 CSS ::before 显示语言标签）
    if (lang && !codeEl.getAttribute('data-lang')) {
      codeEl.setAttribute('data-lang', lang);
    }

    // 2. 应用语法高亮（在添加行号之前）
    if (hljs && lang) {
      try {
        // 先获取纯文本，让 highlight.js 自己处理
        const rawText = codeEl.textContent || '';
        const result = hljs.highlight(rawText, { language: lang, ignoreIllegals: true });
        codeEl.innerHTML = result.value;
        codeEl.classList.add('hljs');
      } catch (e) {
        // 语言不支持或其他错误，跳过高亮
        console.warn('[hljs] highlight failed for', lang, e);
      }
    }

    // 3. 为每行添加行号包裹
    // 注意：此时 innerHTML 可能包含 hljs 的 <span> 标签
    // 按 \n 分割后，每个片段仍然是有效的 HTML（hljs 用 inline span）
    const html = codeEl.innerHTML;
    const lines = html.split('\n');
    // 去掉尾部空行
    if (lines.length > 1 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    const wrappedHtml = lines
      .map((line) => `<span class="code-line">${line}</span>`)
      .join('\n');
    codeEl.innerHTML = wrappedHtml;
    codeEl.classList.add('has-line-numbers');
  });
};

const switchMode = async (mode: "ir" | "sv" | "preview") => {
  if (!vditorInstance) return;
  if (currentMode.value === mode) return;

  // 保存当前内容
  const content = vditorInstance.getValue();
  savedContent = content;
  currentMode.value = mode;
  // 模式切换不算用户编辑
  // userEdited 保持不变，因为用户之前可能已经编辑过

  // 销毁旧实例，按新模式重建（Vditor 不支持运行时切换模式）
  try { vditorInstance.destroy(); } catch {}
  vditorInstance = null;
  mdInitialized = false;

  // 重置大纲处理器绑定标记（新实例需要重新绑定）
  _outlineHandlerBound = false;

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
    // Vditor dirty 检测：用 userEdited 标记判断
    if (userEdited && mdInitialized) {
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
      userEdited = false;
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
    ? (vditorInstance && userEdited && mdInitialized)
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
      userEdited = false;
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
