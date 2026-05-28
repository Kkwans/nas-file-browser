import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { createI18n } from "vue-i18n";

import zhCn from "./zh-cn.json";

export const i18n = createI18n({
  locale: "zh-cn",
  fallbackLocale: "zh-cn",
  messages: { "zh-cn": zhCn },
  legacy: true,
});

dayjs.locale("zh-cn");

export function setLocale(): void {
  dayjs.locale("zh-cn");
}

export function setHtmlLocale(): void {
  const html = document.documentElement;
  html.lang = "zh-cn";
  html.dir = "ltr";
}

export const isRtl = () => false;

export default i18n;
