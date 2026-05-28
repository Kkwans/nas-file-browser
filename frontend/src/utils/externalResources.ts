/**
 * Shared external resource loader for Vditor (Markdown) and highlight.js.
 * Ensures resources are loaded only once, even when used by multiple components.
 */

let vditorCSSLoaded = false;
let vditorJSLoaded = false;
let hljsCSSLoaded = false;
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
  if (vditorJSLoaded || (window as any).Vditor) {
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
  return document.documentElement.className === "dark";
}

/**
 * Load highlight.js CSS from CDN (once).
 * Automatically selects dark/light theme based on current app theme.
 */
export async function loadHighlightCSS(): Promise<void> {
  if (hljsCSSLoaded) return;

  const isDark = isDarkTheme();
  const themeCSS = isDark ? "github-dark" : "github";

  // Update existing theme if already loaded
  const existing = document.getElementById("hljs-theme") as HTMLLinkElement | null;
  if (existing) {
    const expectedHref = `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/${themeCSS}.min.css`;
    if (existing.href !== expectedHref) {
      existing.href = expectedHref;
    }
    hljsCSSLoaded = true;
    return;
  }

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/styles/${themeCSS}.min.css`;
  link.id = "hljs-theme";
  document.head.appendChild(link);
  hljsCSSLoaded = true;
}

/**
 * Load highlight.js JS from CDN (once).
 */
export async function loadHighlightJS(): Promise<void> {
  if (hljsJSLoaded || (window as any).hljs) {
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

/**
 * Apply syntax highlighting + line numbers + language labels to code blocks
 * inside a container element.
 */
export function highlightAndAnnotateCodeBlocks(container: HTMLElement): void {
  const codeBlocks = container.querySelectorAll("pre > code");
  const hljs = (window as any).hljs;

  codeBlocks.forEach((codeEl) => {
    // 1. Extract language from class
    let lang = "";
    const langMatch = codeEl.className.match(/language-(\w+)/);
    if (langMatch) {
      lang = langMatch[1];
    }
    // Set data-lang for CSS ::before language label
    if (lang && !codeEl.getAttribute("data-lang")) {
      codeEl.setAttribute("data-lang", lang);
    }

    // 2. Apply syntax highlighting (before adding line numbers)
    if (hljs && lang) {
      try {
        const rawText = codeEl.textContent || "";
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

    // 3. Wrap each line for line numbers
    const html = codeEl.innerHTML;
    const lines = html.split("\n");
    // Remove trailing empty line
    if (lines.length > 1 && lines[lines.length - 1].trim() === "") {
      lines.pop();
    }
    const wrappedHtml = lines
      .map((line) => `<span class="code-line">${line}</span>`)
      .join("\n");
    codeEl.innerHTML = wrappedHtml;
    codeEl.classList.add("has-line-numbers");
  });
}
