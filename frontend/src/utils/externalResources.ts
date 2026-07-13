/** Shared external resource loader for Vditor (Markdown) and highlight.js. */

import {
  resolveMarkdownCodeLanguage,
  wrapMarkdownCodeLines,
} from "@/utils/markdownCode";

let vditorCSSLoaded = false;
let vditorJSLoaded = false;
let hljsJSLoaded = false;

/**
 * Load Vditor CSS from CDN (once).
 */
export async function loadVditorCSS(): Promise<void> {
  if (vditorCSSLoaded || document.querySelector('link[href*="vditor"]')) {
    vditorCSSLoaded = true;
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://cdn.jsdelivr.net/npm/vditor@3.10.9/dist/index.css";
  document.head.appendChild(link);
  vditorCSSLoaded = true;
}

/**
 * Load Vditor JS from CDN (once).
 */
export async function loadVditorJS(): Promise<void> {
  if (vditorJSLoaded || window.Vditor) {
    vditorJSLoaded = true;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/vditor@3.10.9/dist/index.min.js";
    script.onload = () => {
      vditorJSLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Load both Vditor CSS and JS.
 */
export async function loadVditor(): Promise<void> {
  await Promise.all([loadVditorCSS(), loadVditorJS()]);
}

/**
 * Check if current theme is dark.
 */
export function isDarkTheme(): boolean {
  return document.documentElement.classList.contains("dark");
}

/**
 * Load highlight.js CSS from CDN (once).
 * Automatically selects dark/light theme based on current app theme.
 */
export async function loadHighlightCSS(): Promise<void> {
  const isDark = isDarkTheme();
  const themeCSS = isDark ? "github-dark" : "github";
  const expectedHref = `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/${themeCSS}.min.css`;

  const existing = document.getElementById(
    "hljs-theme"
  ) as HTMLLinkElement | null;
  if (existing) {
    if (!existing.href.endsWith(`/${themeCSS}.min.css`)) {
      existing.href = expectedHref;
    }
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/${themeCSS}.min.css`;
  link.id = "hljs-theme";
  document.head.appendChild(link);
}

/**
 * Load highlight.js JS from CDN (once).
 */
export async function loadHighlightJS(): Promise<void> {
  if (hljsJSLoaded || window.hljs) {
    hljsJSLoaded = true;
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js";
    script.onload = () => {
      hljsJSLoaded = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Load both highlight.js CSS and JS.
 */
export async function loadHighlight(): Promise<void> {
  await Promise.all([loadHighlightCSS(), loadHighlightJS()]);
}

/**
 * Load all resources needed for Markdown rendering (Vditor + highlight.js).
 */
export async function loadMarkdownResources(): Promise<void> {
  await Promise.all([loadVditor(), loadHighlight()]);
}

export type HighlightCodeOptions = {
  showLineNumbers?: boolean;
};

/**
 * Keep the CDN theme in sync when the application theme changes.
 * The observer is deliberately scoped to one caller and must be disposed.
 */
export function observeMarkdownThemeChanges(
  onChange?: (isDark: boolean) => void
): () => void {
  const html = document.documentElement;
  const observer = new MutationObserver(() => {
    void loadHighlightCSS();
    onChange?.(isDarkTheme());
  });
  observer.observe(html, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** Apply controlled syntax highlighting and optional line numbers. */
export function highlightAndAnnotateCodeBlocks(
  container: HTMLElement,
  options: HighlightCodeOptions = {}
): void {
  const showLineNumbers = options.showLineNumbers ?? false;
  const codeBlocks = container.querySelectorAll("pre > code");
  const hljs = window.hljs;

  codeBlocks.forEach((element) => {
    const codeEl = element as HTMLElement;
    const pre = codeEl.parentElement;
    const textContent = codeEl.textContent || "";
    // Vditor may briefly clear a code node while switching IR/SV/preview.
    // Keep the last raw source in data-* so a transient empty DOM does not
    // erase the block on the next decoration pass. If fresh text exists it
    // always wins, which keeps edits and re-renders authoritative.
    const rawText = textContent || codeEl.dataset.rawSource || "";
    codeEl.dataset.rawSource = rawText;
    const lang = resolveMarkdownCodeLanguage(codeEl.className, rawText);
    if (lang) {
      codeEl.setAttribute("data-lang", lang);
    } else {
      codeEl.removeAttribute("data-lang");
    }

    codeEl.classList.remove("hljs");
    if (hljs && lang && hljs.getLanguage(lang)) {
      try {
        const result = hljs.highlight(rawText, {
          language: lang,
          ignoreIllegals: true,
        });
        codeEl.innerHTML = result.value;
        codeEl.classList.add("hljs");
      } catch {
        // Language not supported, skip highlighting
      }
    }

    const rendered = wrapMarkdownCodeLines(codeEl.innerHTML, showLineNumbers);
    codeEl.innerHTML = rendered.html;
    codeEl.classList.toggle("has-line-numbers", rendered.hasLineNumbers);

    if (pre) {
      let toolbar = pre.querySelector<HTMLElement>(
        ":scope > .markdown-code-toolbar"
      );
      if (!toolbar) {
        toolbar = document.createElement("div");
        toolbar.className = "markdown-code-toolbar";
        pre.prepend(toolbar);
      }
      toolbar.replaceChildren();

      if (lang) {
        const language = document.createElement("span");
        language.className = "markdown-code-language";
        language.textContent = lang;
        toolbar.append(language);
      }

      const copy = document.createElement("button");
      copy.type = "button";
      copy.className = "markdown-code-copy";
      copy.setAttribute("aria-label", "复制代码");
      copy.innerHTML =
        '<i class="material-icons" aria-hidden="true">content_copy</i>';
      copy.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(rawText);
          copy.dataset.copied = "true";
          copy.setAttribute("aria-label", "已复制");
          window.setTimeout(() => {
            copy.dataset.copied = "false";
            copy.setAttribute("aria-label", "复制代码");
          }, 1400);
        } catch {
          copy.setAttribute("aria-label", "复制失败");
        }
      });
      toolbar.append(copy);
    }
  });
}
