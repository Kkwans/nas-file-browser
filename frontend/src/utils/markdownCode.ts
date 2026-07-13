/**
 * Markdown 代码块的纯函数契约。
 *
 * 代码块的 DOM 装饰由 externalResources.ts 负责，这里只处理语言规范化、
 * 受控自动识别、行号包装和用户偏好键，方便在没有浏览器环境时测试。
 */

const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "bash",
  c: "c",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  csharp: "csharp",
  go: "go",
  html: "xml",
  java: "java",
  javascript: "javascript",
  js: "javascript",
  json: "json",
  kotlin: "kotlin",
  md: "markdown",
  markdown: "markdown",
  php: "php",
  py: "python",
  python: "python",
  rb: "ruby",
  ruby: "ruby",
  rust: "rust",
  rs: "rust",
  sh: "bash",
  shell: "bash",
  sql: "sql",
  swift: "swift",
  ts: "typescript",
  typescript: "typescript",
  txt: "plaintext",
  text: "plaintext",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
};

const LANGUAGE_DECLARATION = /(?:^|\s)(?:language|lang)-([a-z0-9+_.-]+)/i;

function normalizeLanguage(value: string): string | null {
  const token = value.trim().toLowerCase().replace(/^\+/, "");
  return LANGUAGE_ALIASES[token] ?? null;
}

/** Create a persistent fenced block for the language picker. */
export function createMarkdownCodeFence(language: string): string {
  const normalized = normalizeLanguage(language) ?? "";
  return `\`\`\`${normalized}\n\n\`\`\`\n`;
}

/** Resolve an explicitly declared fence language. Unknown declarations return null. */
export function resolveMarkdownCodeLanguage(
  className: string,
  source: string
): string | null {
  const declaration = className.match(LANGUAGE_DECLARATION);
  if (declaration) return normalizeLanguage(declaration[1]);
  return inferMarkdownCodeLanguage(source);
}

/**
 * Perform deliberately conservative language detection.
 * A low-confidence block remains plain text instead of receiving a wrong theme.
 */
export function inferMarkdownCodeLanguage(source: string): string | null {
  const code = source.trim();
  if (!code) return null;

  if (/^#!\s*\/usr\/bin\/env\s+(?:ba)?sh\b|^#!\/bin\/(?:ba)?sh\b/.test(code)) {
    return "bash";
  }
  if (
    /\bpublic\s+(?:final\s+)?class\s+\w+/.test(code) ||
    /System\.out\.(?:print|println)\s*\(/.test(code)
  ) {
    return "java";
  }
  if (
    /\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=/.test(code) ||
    /\bconsole\.(?:log|error|warn)\s*\(/.test(code) ||
    /=>/.test(code)
  ) {
    return "javascript";
  }
  if (
    /^\s*(?:def\s+\w+\s*\(|from\s+\w+\s+import\s+|import\s+\w+)/m.test(code)
  ) {
    return "python";
  }
  if (
    /^\s*(?:SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|CREATE\s+TABLE)\b/im.test(
      code
    )
  ) {
    return "sql";
  }
  if (/^\s*[<{][\s\S]*[>}]\s*$/.test(code) && /<\/?[a-z][^>]*>/i.test(code)) {
    return "xml";
  }

  return null;
}

/** Wrap rendered HTML lines only when the user enabled line numbers. */
export function wrapMarkdownCodeLines(
  html: string,
  showLineNumbers: boolean
): { html: string; hasLineNumbers: boolean } {
  const normalized = html.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  if (!showLineNumbers) {
    return { html: normalized, hasLineNumbers: false };
  }

  const lines = normalized.split("\n");
  return {
    html: lines
      .map((line) => `<span class="code-line">${line}</span>`)
      // 每个代码行由 CSS 独立占据一行；不要再插入文本换行，否则
      // white-space: pre 会把它渲染成额外的空白行。
      .join(""),
    hasLineNumbers: true,
  };
}

export function getMarkdownLineNumberStorageKey(
  userId: string | number | null | undefined
): string {
  const namespace = String(userId ?? "").trim() || "guest";
  return `nas-file-browser:markdown-line-numbers:${namespace}`;
}
