/**
 * 集中管理所有硬编码翻译常量
 * 原 useI18n().t() 调用替换为这些常量
 */
export const T = {
  // buttons
  save: "保存",
  delete: "删除",
  create: "创建",
  share: "分享",
  copy: "复制",
  close: "关闭",
  openFile: "打开文件",
  openFolder: "打开文件夹",
  copyFile: "复制文件",
  preview: "预览",
  stopSearch: "停止搜索",

  // search
  typeToSearch: "输入关键词搜索",
  pressToSearch: "按回车搜索",

  // viewer
  openInEditor: "在编辑器中打开",

  // users
  createUser: "创建用户",
  updateUser: "更新用户",

  // login
  username: "用户名",
  password: "密码",
  login: "登录",
} as const;

export type TranslationKey = keyof typeof T;