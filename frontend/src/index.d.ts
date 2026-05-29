declare module "*.vue";

// Global t function provided by main.ts (replaces vue-i18n)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare function t(key: string, opts?: Record<string, string | number>): string;

// Make this file a module (required for `declare global`)
export {};
declare global {
  interface Window {
    /** VideoJS instance (loaded from CDN) */
    Vditor?: typeof import("vditor").default;
    /** highlight.js instance (loaded from CDN) */
    hljs?: typeof import("highlight.js").default;
  }
}

// Extend video.js Player interface for plugins
declare module "video.js" {
  interface Player {
    /** Mobile UI plugin for video.js */
    mobileUi?: () => void;
  }
}
