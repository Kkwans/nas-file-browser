import type { Component } from "vue";
import {
  FileCog,
  FileExclamationPoint,
  FolderCog,
  FolderLock,
  ShieldAlert,
  Wrench,
} from "@lucide/vue";

export const appIcons = {
  "file-maintenance": FileCog,
  "file-warning": FileExclamationPoint,
  "folder-maintenance": FolderCog,
  "folder-protected": FolderLock,
  "risk-high": ShieldAlert,
  "risk-medium": Wrench,
} satisfies Record<string, Component>;

export type AppIconName = keyof typeof appIcons;
