<template>
  <div id="editor-container">
    <header-bar>
      <action icon="close" label="关闭" @action="close()" />
      <title>{{ fileStore.req?.name ?? "" }}</title>

      <action
        v-if="authStore.user?.perm.modify"
        id="save-button"
        icon="save"
        label="保存"
        @action="save()"
      />

      <!-- 代码语言标识 + 行号切换（非 Markdown 文件） -->
      <template v-if="!isMarkdownFile && aceEditorReady">
        <span class="editor-lang-badge" :title="langCaption">
          <i class="material-icons">code</i>
          {{ langCaption }}
        </span>
        <action
          :icon="
            showLineNumbers ? 'format_list_numbered' : 'format_list_bulleted'
          "
          :label="showLineNumbers ? '关闭行号' : '显示行号'"
          @action="toggleLineNumbers()"
          :class="{ active: showLineNumbers }"
        />
      </template>

      <!-- Markdown 模式切换 -->
      <template v-if="isMarkdownFile">
        <action
          icon="edit"
          label="所见即所得"
          @action="switchMode('ir')"
          :class="{ active: currentMode === 'ir' }"
        />
        <action
          icon="vertical_split"
          label="即时渲染"
          @action="switchMode('sv')"
          :class="{ active: currentMode === 'sv' }"
        />
        <action
          icon="visibility"
          label="预览模式"
          @action="switchMode('preview')"
          :class="{ active: currentMode === 'preview' }"
        />
        <action
          :icon="
            showLineNumbers ? 'format_list_numbered' : 'format_list_bulleted'
          "
          :label="showLineNumbers ? '关闭行号' : '显示行号'"
          @action="toggleLineNumbers()"
          :class="{ active: showLineNumbers, disabled: currentMode === 'sv' }"
          :aria-disabled="currentMode === 'sv'"
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
      <div
        v-if="isMarkdownFile"
        id="vditor-mount"
        class="vditor-mount markdown-editor-active"
      ></div>
      <!-- Ace 编辑器（非 Markdown 文件） -->
      <form v-else id="editor"></form>
    </template>
    <div
      v-if="showCodeLanguagePicker"
      class="markdown-language-picker-backdrop"
      @click.self="showCodeLanguagePicker = false"
    >
      <div
        class="markdown-language-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="markdown-language-picker-title"
      >
        <div class="markdown-language-picker-header">
          <strong id="markdown-language-picker-title">选择代码语言</strong>
          <button
            type="button"
            class="markdown-language-picker-close"
            aria-label="关闭"
            @click="showCodeLanguagePicker = false"
          >
            <i class="material-icons" aria-hidden="true">close</i>
          </button>
        </div>
        <div class="markdown-language-search">
          <i class="material-icons" aria-hidden="true">search</i>
          <input
            v-model.trim="codeLanguageQuery"
            type="search"
            placeholder="搜索语言"
            aria-label="搜索代码语言"
          />
        </div>
        <div class="markdown-language-options">
          <button
            v-for="option in filteredCodeLanguageOptions"
            :key="option.value"
            type="button"
            @click="insertMarkdownCodeBlock(option.value)"
          >
            <i class="material-icons" aria-hidden="true">code</i>
            <span>{{ option.label }}</span>
          </button>
          <p
            v-if="filteredCodeLanguageOptions.length === 0"
            class="markdown-language-empty"
          >
            没有匹配的语言
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { files as api } from "@/api";
import type { ApiContent } from "@/types/api";
import buttons from "@/utils/buttons";
import url from "@/utils/url";
import {
  loadMarkdownResources,
  loadHighlight,
  isDarkTheme,
  highlightAndAnnotateCodeBlocks,
  observeMarkdownThemeChanges,
} from "@/utils/externalResources";
import {
  createMarkdownCodeFence,
  getMarkdownLineNumberStorageKey,
} from "@/utils/markdownCode";
import ace, { Ace, version as ace_version } from "ace-builds";
import "ace-builds/src-noconflict/ext-language_tools";
import modelist from "ace-builds/src-noconflict/ext-modelist";

import Action from "@/components/header/Action.vue";
import HeaderBar from "@/components/header/HeaderBar.vue";
import { useAuthStore } from "@/stores/auth";
import { useFileStore } from "@/stores/file";
import { useLayoutStore } from "@/stores/layout";
import { getEditorTheme, getTheme } from "@/utils/theme";
import { computed, inject, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { onBeforeRouteUpdate, useRoute, useRouter } from "vue-router";
const $showError = inject<IToastError>("$showError")!;

const fileStore = useFileStore();
const authStore = useAuthStore();
const layoutStore = useLayoutStore();

const route = useRoute();
const router = useRouter();

const isMarkdownFile =
  fileStore.req?.name.endsWith(".md") ||
  fileStore.req?.name.endsWith(".markdown");
const aceEditorReady = ref(false);
const showLineNumbers = ref(!isMarkdownFile);
const langCaption = ref("");
const showCodeLanguagePicker = ref(false);
const codeLanguageQuery = ref("");
const codeLanguageOptions = [
  { value: "java", label: "Java" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "less", label: "Less" },
  { value: "bash", label: "Shell" },
  { value: "powershell", label: "PowerShell" },
  { value: "python", label: "Python" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "toml", label: "TOML" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "sql", label: "SQL" },
  { value: "graphql", label: "GraphQL" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "csharp", label: "C#" },
  { value: "cpp", label: "C++" },
  { value: "kotlin", label: "Kotlin" },
  { value: "swift", label: "Swift" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "markdown", label: "Markdown" },
  { value: "plaintext", label: "纯文本" },
];
const filteredCodeLanguageOptions = computed(() => {
  const query = codeLanguageQuery.value.toLowerCase();
  if (!query) return codeLanguageOptions;
  return codeLanguageOptions.filter(
    (option) =>
      option.label.toLowerCase().includes(query) ||
      option.value.toLowerCase().includes(query)
  );
});

const currentMode = ref<"ir" | "sv" | "preview">("ir");
let vditorInstance: VditorInstance | null = null;
let aceEditor: Ace.Editor | null = null;
// Content tracking removed - unused variables
let mdInitialized = false; // Vditor 是否已完成初始化
let userEdited = false; // 用户是否实际修改过内容
let initialContent = ""; // 文件初始内容，用于 close 时的内容比对兜底
let markdownBuffer = "";
let editorGeneration = 0;
let markdownBaselineReady = false;
let stopThemeObserver: (() => void) | null = null;

const markdownLineNumberKey = () =>
  getMarkdownLineNumberStorageKey(authStore.user?.id);

const restoreLineNumberPreference = () => {
  if (!isMarkdownFile) return;
  showLineNumbers.value =
    localStorage.getItem(markdownLineNumberKey()) === "true";
};

const persistLineNumberPreference = () => {
  if (!isMarkdownFile) return;
  localStorage.setItem(markdownLineNumberKey(), String(showLineNumbers.value));
};

restoreLineNumberPreference();

watch(
  () => authStore.user?.id,
  () => restoreLineNumberPreference()
);

onMounted(() => {
  stopThemeObserver = observeMarkdownThemeChanges();
  window.addEventListener("keydown", keyEvent);
  window.addEventListener("beforeunload", handlePageChange);

  const fileContent = fileStore.req?.content || "";
  markdownBuffer = fileContent;

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
  stopThemeObserver?.();
  stopThemeObserver = null;
  const mountEl = document.getElementById("vditor-mount");
  if (mountEl) {
    mountEl.removeEventListener("click", handleOutlineCapture, true);
  }
  _outlineHandlerBound = false;
  if (vditorInstance) {
    try {
      vditorInstance.destroy();
    } catch {}
    vditorInstance = null;
  }
  if (aceEditor) {
    aceEditor.destroy();
    aceEditor = null;
  }
});

onBeforeRouteUpdate((to, from, next) => {
  if (layoutStore.loading) {
    next();
    return;
  }

  const isDirty = isMarkdownFile
    ? vditorInstance && userEdited && mdInitialized
    : !aceEditor?.session.getUndoManager().isClean();

  if (!isDirty) {
    next();
    return;
  }

  // 双重校验：flag 可能有误，用实际内容比对兜底
  if (isMarkdownFile && vditorInstance && mdInitialized) {
    try {
      const currentContent = vditorInstance.getValue();
      if (currentContent === initialContent) {
        userEdited = false;
        next();
        return;
      }
    } catch {}
  } else if (aceEditor) {
    const currentContent = aceEditor.getValue();
    if (currentContent === initialContent) {
      aceEditor.session.getUndoManager().markClean();
      next();
      return;
    }
  }

  layoutStore.showHover({
    prompt: "discardEditorChanges",
    confirm: (event: Event) => {
      event.preventDefault();
      if (aceEditor) aceEditor.session.getUndoManager().reset();
      userEdited = false;
      next();
    },
    saveAction: async () => {
      try {
        await save(true);
        next();
      } catch {}
    },
  });
});

const initVditor = async (content: string) => {
  initialContent = content;
  markdownBuffer = content;
  markdownBaselineReady = false;
  mdInitialized = false;
  userEdited = false;
  await initVditorWithMode(content, "ir");
};

const loadVditorResources = async () => {
  await loadMarkdownResources();
};

const initVditorWithMode = async (content: string, mode: "ir" | "sv") => {
  const generation = ++editorGeneration;
  await loadVditorResources();

  if (generation !== editorGeneration) return;

  const VditorClass = window.Vditor;
  const mountEl = document.getElementById("vditor-mount");
  if (!mountEl) return;

  const isDark = isDarkTheme();

  vditorInstance = new VditorClass("vditor-mount", {
    value: content,
    lang: "zh_CN",
    theme: isDark ? "dark" : "classic",
    mode: mode,
    toolbar: [
      "emoji",
      "headings",
      "bold",
      "italic",
      "strike",
      "|",
      "line",
      "quote",
      "list",
      "ordered-list",
      "check",
      "|",
      "code",
      {
        name: "code-language",
        tipPosition: "s",
        tip: "插入代码块",
        icon: '<i class="material-icons">code</i>',
        click: () => openCodeLanguagePicker(),
      },
      "inline-code",
      "table",
      "|",
      "link",
      "upload",
      "|",
      "undo",
      "redo",
      "|",
      "edit-mode",
      "preview",
      "fullscreen",
      "|",
      {
        name: "source-mode",
        tipPosition: "s",
        tip: "源码模式",
        icon: '<svg viewBox="0 0 1024 1024"><path d="M586.185 280.418l44.206-44.206L816 421.812l-185.609 185.61-44.206-44.207L727.588 421.812zM437.815 743.582l-44.206 44.206L208 602.188l185.609-185.61 44.206 44.207L296.412 602.188z"/></svg>',
        click: () => switchMode("sv"),
      },
    ],
    toolbarConfig: {
      hide: false,
    },
    outline: {
      enable: true,
      position: "right",
    },
    counter: {
      enable: true,
    },
    typewriterMode: true,
    undoDelay: 200,
    tab: "\t",
    preview: {
      theme: {
        current: isDark ? "dark" : "light",
      },
      markdown: {
        sanitize: true,
        toc: true,
      },
    },
    after: () => {
      if (generation !== editorGeneration) return;
      // 编辑器初始化完成后，捕获 Vditor 规范化后的内容作为基线
      // 这样即使 Vditor 对内容做了微调（如尾部换行），也不会误判为 dirty
      try {
        const normalized = vditorInstance!.getValue();
        markdownBuffer = normalized;
        if (!markdownBaselineReady) {
          initialContent = normalized;
          markdownBaselineReady = true;
        }
      } catch {}
      mdInitialized = true;
      // 初始化期间可能触发 input 事件，重置 dirty 标记
      userEdited = false;
      // 确保大纲目录点击可以跳转
      setupOutlineClickHandler();
      if (currentMode.value === "preview") refreshMarkdownCodeBlocks();
    },
    input: () => {
      // 用户实际编辑内容时标记为 dirty
      if (mdInitialized) {
        userEdited = true;
      }
      try {
        markdownBuffer = vditorInstance?.getValue() ?? markdownBuffer;
      } catch {}
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
  if (target.closest(".vditor-outline__action")) return;

  // 向上查找带有 data-target-id 的元素
  const outlineItem = target.closest("[data-target-id]") as HTMLElement;
  if (!outlineItem) return;

  const targetId = outlineItem.getAttribute("data-target-id");
  if (!targetId) return;

  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();

  const headingEl = document.getElementById(targetId);
  if (!headingEl) return;

  // 找到实际的滚动容器（vditor-mount 内部的可滚动元素）
  const mountEl = document.getElementById("vditor-mount");
  if (!mountEl) return;

  // 在 IR/SV 模式下，内容区域是可滚动的
  // 查找从标题元素到 mountEl 之间的可滚动父元素
  let scrollContainer: HTMLElement | null = null;
  let cur: HTMLElement | null = headingEl;
  while (cur && cur !== mountEl) {
    const style = window.getComputedStyle(cur);
    if (
      /(auto|scroll)/.test(style.overflow + style.overflowY) &&
      cur.scrollHeight > cur.clientHeight
    ) {
      scrollContainer = cur;
      break;
    }
    cur = cur.parentElement;
  }

  if (scrollContainer) {
    // 标题在内部滚动容器中，手动计算偏移量
    const containerRect = scrollContainer.getBoundingClientRect();
    const headingRect = headingEl.getBoundingClientRect();
    const offset =
      headingRect.top - containerRect.top + scrollContainer.scrollTop - 20;
    scrollContainer.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  } else {
    // 回退: scrollIntoView 或 window scrollTo
    headingEl.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

const setupOutlineClickHandler = () => {
  const mountEl = document.getElementById("vditor-mount");
  if (!mountEl || _outlineHandlerBound) return;

  // 使用捕获阶段监听，确保在 Vditor 的冒泡处理器之前执行
  mountEl.addEventListener("click", handleOutlineCapture, true);
  _outlineHandlerBound = true;
};

const initVditorPreview = async (content: string) => {
  const generation = ++editorGeneration;
  await loadHighlight();

  if (generation !== editorGeneration) return;

  const VditorClass = window.Vditor;
  const mountEl = document.getElementById("vditor-mount");
  if (!mountEl) return;

  const isDark = isDarkTheme();

  // 阅读模式：用 Vditor 的预览方法渲染为纯 HTML
  // md2html 可能返回 Promise 或 string，统一用 Promise.resolve 包裹确保 await
  const htmlResult = VditorClass.md2html(content, {
    theme: isDark ? "dark" : "light",
  });
  const html = await Promise.resolve(htmlResult);
  if (typeof html !== "string") {
    console.error("[Vditor] md2html returned non-string:", html);
    return;
  }

  const previewElement = document.createElement("div");
  previewElement.className = "vditor-reset vditor-preview--content";
  previewElement.innerHTML = html;
  mountEl.appendChild(previewElement);

  // 为代码块添加语法高亮、语言标签和可选行号
  highlightAndAnnotateCodeBlocks(previewElement, {
    showLineNumbers: showLineNumbers.value,
  });

  // 保存一个伪实例，getValue 时返回原始内容
  vditorInstance = {
    getValue: () => content,
    destroy: () => {
      previewElement.remove();
    },
  };
  // 预览模式基线与实际内容一致
  mdInitialized = true;
};

const initAceEditor = (content: string) => {
  initialContent = content;
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
    fontFamily:
      "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Cascadia Code', 'Consolas', 'Monaco', monospace",
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

  // 确保 undo manager 标记为 clean，避免误判为 dirty
  aceEditor.session.getUndoManager().markClean();
  aceEditor.focus();
  aceEditorReady.value = true;

  // 获取并设置语言名称
  const detectedMode = modelist.getModeForPath(fileStore.req!.name);
  langCaption.value = detectedMode.caption || detectedMode.name || "";
};

const openCodeLanguagePicker = () => {
  if (!isMarkdownFile || !vditorInstance) return;
  showCodeLanguagePicker.value = true;
};

const insertMarkdownCodeBlock = (language: string) => {
  showCodeLanguagePicker.value = false;
  if (!vditorInstance?.insertValue) return;
  vditorInstance.insertValue(createMarkdownCodeFence(language));
  try {
    markdownBuffer = vditorInstance.getValue();
  } catch {}
  userEdited = true;
};

const toggleLineNumbers = () => {
  if (isMarkdownFile && currentMode.value === "sv") return;
  showLineNumbers.value = !showLineNumbers.value;
  persistLineNumberPreference();
  if (aceEditor) {
    aceEditor.setOptions({
      showGutter: showLineNumbers.value,
      showLineNumbers: showLineNumbers.value,
    });
  }
  refreshMarkdownCodeBlocks();
};

const refreshMarkdownCodeBlocks = () => {
  const mountEl = document.getElementById("vditor-mount");
  if (!mountEl || !isMarkdownFile || currentMode.value !== "preview") return;
  highlightAndAnnotateCodeBlocks(mountEl, {
    showLineNumbers: showLineNumbers.value,
  });
};

const switchMode = async (mode: "ir" | "sv" | "preview") => {
  if (!vditorInstance) return;
  if (currentMode.value === mode) return;

  // 保存当前内容
  let content: string;
  try {
    // getValue() is authoritative, including an intentionally empty document.
    // The buffer is only a fallback if Vditor has already detached its DOM.
    content = vditorInstance.getValue();
  } catch {
    content = markdownBuffer;
  }
  markdownBuffer = content;
  currentMode.value = mode;
  // 模式切换不算用户编辑
  // userEdited 保持不变，因为用户之前可能已经编辑过

  // 销毁旧实例，按新模式重建（Vditor 不支持运行时切换模式）
  try {
    vditorInstance.destroy();
  } catch {}
  vditorInstance = null;
  mdInitialized = false;
  editorGeneration++;

  // 重置大纲处理器绑定标记（新实例需要重新绑定）
  _outlineHandlerBound = false;

  // 等待 DOM 更新
  await new Promise((r) => setTimeout(r, 50));

  if (mode === "preview") {
    // 阅读模式：用 Vditor 的预览模式（只有预览面板）
    await initVditorPreview(content);
  } else {
    // ir 或 sv 模式
    await initVditorWithMode(content, mode);
  }
};

const keyEvent = (event: KeyboardEvent) => {
  if (event.code === "Escape") {
    if (showCodeLanguagePicker.value) {
      showCodeLanguagePicker.value = false;
      return;
    }
    close();
  }

  if (!event.ctrlKey && !event.metaKey) return;
  if (event.key !== "s") return;

  event.preventDefault();
  save();
};

const handlePageChange = (event: BeforeUnloadEvent) => {
  // 编辑器未初始化完成时，不提示
  if (layoutStore.loading) return;

  if (isMarkdownFile && vditorInstance) {
    // Vditor dirty 检测：用 userEdited 标记 + 内容比对双重判断
    if (userEdited && mdInitialized) {
      try {
        const currentContent = vditorInstance.getValue();
        if (currentContent === initialContent) return;
      } catch {}
      event.preventDefault();
      event.returnValue = true;
    }
    return;
  }
  if (aceEditor && !aceEditor.session.getUndoManager().isClean()) {
    const currentContent = aceEditor.getValue();
    if (currentContent === initialContent) return;
    event.preventDefault();
    event.returnValue = true;
  }
};

const save = async (throwError?: boolean) => {
  const button = "save";
  buttons.loading("save");

  try {
    let content = "";
    if (isMarkdownFile && vditorInstance) {
      content = vditorInstance.getValue();
      markdownBuffer = content;
    } else if (aceEditor) {
      content = aceEditor.getValue();
    }
    await api.put(route.path, content as ApiContent);
    if (isMarkdownFile) {
      userEdited = false;
    }
    initialContent = content;
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
  // 编辑器未初始化完成时，直接关闭
  if (layoutStore.loading) {
    finishClose();
    return;
  }

  const isDirty = isMarkdownFile
    ? vditorInstance && userEdited && mdInitialized
    : !aceEditor?.session.getUndoManager().isClean();

  if (!isDirty) {
    finishClose();
    return;
  }

  // 双重校验：flag 可能有误，用实际内容比对兜底
  if (isMarkdownFile && vditorInstance && mdInitialized) {
    try {
      const currentContent = vditorInstance.getValue();
      if (currentContent === initialContent) {
        userEdited = false;
        finishClose();
        return;
      }
    } catch {}
  } else if (aceEditor) {
    const currentContent = aceEditor.getValue();
    if (currentContent === initialContent) {
      aceEditor.session.getUndoManager().markClean();
      finishClose();
      return;
    }
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

/* 语言标识 badge */
.editor-lang-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8em;
  font-weight: 500;
  color: var(--textSecondary);
  background: var(--surfaceSecondary);
  border: 1px solid var(--borderSecondary);
  text-transform: capitalize;
  white-space: nowrap;
  user-select: none;
}
.editor-lang-badge i {
  font-size: 14px;
  opacity: 0.7;
}

.markdown-language-picker-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2200;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgb(15 23 42 / 28%);
}

.markdown-language-picker {
  width: min(26rem, 100%);
  overflow: hidden;
  border: 1px solid var(--borderSecondary);
  border-radius: 14px;
  background: var(--surfacePrimary);
  box-shadow: 0 20px 50px rgb(15 23 42 / 20%);
}

.markdown-language-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 3.25rem;
  padding: 0 1rem;
  border-bottom: 1px solid var(--borderSecondary);
  color: var(--textPrimary);
}

.markdown-language-picker-close {
  display: inline-grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 50%;
  color: var(--textSecondary);
  background: transparent;
  cursor: pointer;
}

.markdown-language-picker-close:hover,
.markdown-language-picker-close:focus-visible {
  color: var(--textPrimary);
  background: var(--surfaceSecondary);
  outline: none;
}

.markdown-language-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 1rem;
}

.markdown-language-search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0 1rem;
  padding: 0 0.7rem;
  border: 1px solid var(--borderSecondary);
  border-radius: 8px;
  color: var(--textSecondary);
  background: var(--surfaceSecondary);
}

.markdown-language-search input {
  flex: 1;
  min-width: 0;
  height: 2.5rem;
  padding: 0;
  border: 0;
  outline: 0;
  color: var(--textPrimary);
  background: transparent;
}

.markdown-language-empty {
  grid-column: 1 / -1;
  margin: 0;
  padding: 0.8rem;
  color: var(--textSecondary);
  text-align: center;
}

.markdown-language-options button {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 2.75rem;
  padding: 0 0.75rem;
  border: 1px solid var(--borderSecondary);
  border-radius: 8px;
  color: var(--textPrimary);
  background: var(--surfacePrimary);
  cursor: pointer;
}

.markdown-language-options button:hover,
.markdown-language-options button:focus-visible {
  border-color: var(--blue);
  color: var(--blue);
  background: var(--surfaceSecondary);
  outline: none;
}

.markdown-language-options i {
  font-size: 1.1rem;
}

@media (max-width: 480px) {
  .markdown-language-options {
    grid-template-columns: 1fr;
  }
}
</style>
