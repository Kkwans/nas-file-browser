export {};

export interface IUser {
  id: number;
  username: string;
  password: string;
  scope: string;
  locale: string;
  perm: Permissions;
  commands: string[];
  rules: IRule[];
  lockPassword: boolean;
  hideDotfiles: boolean;
  singleClick: boolean;
  redirectAfterCopyMove: boolean;
  dateFormat: boolean;
  viewMode: ViewModeType;
  sorting?: Sorting;
  aceEditorTheme: string;
  sidebarPreferences?: string;
}

export type ViewModeType =
  | "mosaic"
  | "compact-grid"
  | "details"
  | "compact-list";

export interface Permissions {
  admin: boolean;
  copy: boolean;
  create: boolean;
  delete: boolean;
  download: boolean;
  execute: boolean;
  modify: boolean;
  move: boolean;
  rename: boolean;
  share: boolean;
  shell: boolean;
  upload: boolean;
}

export interface Sorting {
  by: string;
  asc: boolean;
}

interface IRule {
  allow: boolean;
  path: string;
  regex: boolean;
  regexp: IRegexp;
}

interface IRegexp {
  raw: string;
}

export type UserTheme = "light" | "dark" | "";
