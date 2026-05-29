declare module "*.vue";

// Global t function provided by main.ts (replaces vue-i18n)
declare function t(key: string, opts?: Record<string, string | number>): string;