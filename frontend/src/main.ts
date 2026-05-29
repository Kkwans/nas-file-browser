import { disableExternal } from "@/utils/constants";
import { createApp } from "vue";
import VueNumberInput from "@chenfengyuan/vue-number-input";
import VueLazyload from "vue-lazyload";
import Toast, { POSITION, useToast } from "vue-toastification";
import type {
  ToastOptions,
  PluginOptions,
} from "vue-toastification/dist/types/types";
import createPinia from "@/stores";
import router from "@/router";
import App from "@/App.vue";
import CustomToast from "@/components/CustomToast.vue";
import { T } from "@/utils/translations";

import dayjs from "dayjs";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import duration from "dayjs/plugin/duration";

import "./css/styles.css";

// Detect Material Icons font loading to prevent "folder" text flash
document.body.classList.add("fonts-loading");
document.fonts.ready.then(() => {
  document.body.classList.remove("fonts-loading");
});

// register dayjs plugins globally
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(duration);

const pinia = createPinia(router);

const app = createApp(App);

app.component(VueNumberInput.name || "vue-number-input", VueNumberInput);
app.use(VueLazyload);
app.use(Toast, {
  transition: "Vue-Toastification__bounce",
  maxToasts: 10,
  newestOnTop: true,
} satisfies PluginOptions);

app.use(pinia);
app.use(router);

// 全局 t 函数，供所有 Vue 组件模板使用（替代 vue-i18n）
// 支持嵌套键：t('buttons.save') → "保存"
app.config.globalProperties.t = (key: string, opts?: Record<string, any>): string => {
  const keys = key.split(".");
  let result: any = T;
  for (const k of keys) {
    result = result?.[k];
    if (result === undefined) break;
  }
  let text = typeof result === "string" ? result : key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      text = text.replace(new RegExp(`\\{\\s*${k}\\s*\\}`, "g"), String(v));
    }
  }
  return text;
};

// provide v-focus for components
app.directive("focus", {
  mounted: async (el) => {
    // initiate focus for the element
    el.focus();
  },
});

const toastConfig = {
  position: POSITION.BOTTOM_CENTER,
  timeout: 4000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
} satisfies ToastOptions;

app.provide("$showSuccess", (message: string) => {
  const $toast = useToast();
  $toast.success(
    {
      component: CustomToast,
      props: {
        message: message,
      },
    },
    { ...toastConfig, rtl: false }
  );
});

app.provide("$showError", (error: Error | string, displayReport = true) => {
  const $toast = useToast();
  $toast.error(
    {
      component: CustomToast,
      props: {
        message: (error as Error).message || error,
        isReport: !disableExternal && displayReport,
        // TODO: could you add this to the component itself?
        reportText: "报告问题",
      },
    },
    {
      ...toastConfig,
      timeout: 0,
      rtl: false,
    }
  );
});

router.isReady().then(() => app.mount("#app"));
