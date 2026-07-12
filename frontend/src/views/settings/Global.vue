<template>
  <errors v-if="error" :errorCode="error.status" />
  <div class="row" v-else-if="!layoutStore.loading && settings !== null">
    <div class="column">
      <form class="card" @submit.prevent="save">
        <div class="card-title">
          <h2>全局设置</h2>
        </div>

        <div class="card-content">
          <p>
            <input type="checkbox" v-model="settings.signup" />
            允许注册
          </p>

          <p>
            <input type="checkbox" v-model="settings.createUserDir" />
            创建用户目录
          </p>

          <p>
            <input type="checkbox" v-model="settings.hideLoginButton" />
            隐藏登录按钮
          </p>

          <p>
            <label class="small">用户主目录路径</label>
            <input
              class="input input--block"
              type="text"
              v-model="settings.userHomeBasePath"
            />
          </p>

          <p>
            <label for="minimumPasswordLength">最小密码长度</label>
            <vue-number-input
              controls
              v-model.number="settings.minimumPasswordLength"
              id="minimumPasswordLength"
              :min="1"
            />
          </p>

          <h3>规则</h3>
          <p class="small">全局规则</p>
          <rules v-model:rules="settings.rules" />

          <div v-if="enableExec">
            <h3>在 Shell 中执行</h3>
            <p class="small">允许在文件操作前后在 Shell 中运行命令</p>
            <input
              class="input input--block"
              type="text"
              placeholder="bash -c, cmd /c, ..."
              v-model="shellValue"
            />
          </div>

          <h3>品牌定制</h3>

          <p class="small">
            '如需自定义品牌，请参考'
            <a
              class="link"
              target="_blank"
              href="https://filebrowser.org/customization.html#custom-branding"
              >官方文档</a
            >
            。
          </p>

          <p>
            <input
              type="checkbox"
              v-model="settings.branding.disableExternal"
              id="branding-links"
            />
            禁用外部链接
          </p>

          <p>
            <input
              type="checkbox"
              v-model="settings.branding.disableUsedPercentage"
              id="branding-used-disk"
            />
            禁用磁盘用量百分比
          </p>

          <p>
            <label for="theme">主题</label>
            <themes
              class="input input--block"
              v-model:theme="settings.branding.theme"
              id="theme"
            ></themes>
          </p>

          <p>
            <label for="branding-name">实例名称</label>
            <input
              class="input input--block"
              type="text"
              v-model="settings.branding.name"
              id="branding-name"
            />
          </p>

          <p>
            <label for="branding-files">品牌资源目录路径</label>
            <input
              class="input input--block"
              type="text"
              v-model="settings.branding.files"
              id="branding-files"
            />
          </p>

          <h3>TUS 上传</h3>

          <p class="small">启用 TUS 协议以支持断点续传</p>

          <div class="tusConditionalSettings">
            <p>
              <label for="tus-chunkSize">分块大小</label>
              <input
                class="input input--block"
                type="text"
                v-model="formattedChunkSize"
                id="tus-chunkSize"
              />
            </p>

            <p>
              <label for="tus-retryCount">重试次数</label>
              <vue-number-input
                controls
                v-model.number="settings.tus.retryCount"
                id="tus-retryCount"
                :min="0"
              />
            </p>
          </div>
        </div>

        <div class="card-action">
          <input
            class="button button--flat"
            type="submit"
            :value="'更新'"
          />
        </div>
      </form>
    </div>

    <div class="column">
      <form class="card" @submit.prevent="save">
        <div class="card-title">
          <h2>用户默认值</h2>
        </div>

        <div class="card-content">
          <p class="small">新用户的默认设置</p>

          <user-form
            :isNew="false"
            :isDefault="true"
            v-model:user="settings.defaults"
          />
        </div>

        <div class="card-action">
          <input
            class="button button--flat"
            type="submit"
            :value="'更新'"
          />
        </div>
      </form>
    </div>

    <div class="column">
      <form v-if="enableExec" class="card" @submit.prevent="save">
        <div class="card-title">
          <h2>命令运行器</h2>
        </div>

        <div class="card-content">
          <p class="small">
            'settings.commandDescription'
            <a
              class="link"
              target="_blank"
              href="https://filebrowser.org/command-execution.html#hook-runner"
              >官方文档</a
            >
            。
          </p>

          <div
            v-for="(command, key) in settings.commands"
            :key="key"
            class="collapsible"
          >
            <input :id="key" type="checkbox" />
            <label :for="key">
              <p>{{ capitalize(key) }}</p>
              <i class="material-icons">arrow_drop_down</i>
            </label>
            <div class="collapse">
              <textarea
                class="input input--block input--textarea"
                v-model.trim="commandObject[key]"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="card-action">
          <input
            class="button button--flat"
            type="submit"
            :value="'更新'"
          />
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { settings as api } from "@/api";
import { StatusError } from "@/api/utils";
import Rules from "@/components/settings/Rules.vue";
import Themes from "@/components/settings/Themes.vue";
import UserForm from "@/components/settings/UserForm.vue";
import type {
  ISettings,
  SettingsCommand,
  SettingsUnit,
} from "@/types/settings";
import { useLayoutStore } from "@/stores/layout";
import { enableExec } from "@/utils/constants";
import { getTheme, setTheme } from "@/utils/theme";
import Errors from "@/views/Errors.vue";
import { computed, inject, onBeforeUnmount, onMounted, ref } from "vue";
import { T } from "@/utils/translations";
const t = (key: string, opts?: Record<string, any>): string => {
  let result = (T as any)[key] ?? key;
  if (opts) {
    for (const [k, v] of Object.entries(opts)) {
      result = result.replace(new RegExp(`{\\s*${k}\\s*}`, "g"), String(v));
    }
  }
  return result;
};

const error = ref<StatusError | null>(null);
const originalSettings = ref<ISettings | null>(null);
const settings = ref<ISettings | null>(null);
const debounceTimeout = ref<number | null>(null);

const commandObject = ref<{
  [key: string]: string[] | string;
}>({});
const shellValue = ref<string>("");

const $showError = inject<IToastError>("$showError")!;
const $showSuccess = inject<IToastSuccess>("$showSuccess")!;

const layoutStore = useLayoutStore();

const formattedChunkSize = computed({
  get() {
    return settings?.value?.tus?.chunkSize
      ? formatBytes(settings?.value?.tus?.chunkSize)
      : "";
  },
  set(value: string) {
    // Use debouncing to allow the user to type freely without
    // interruption by the formatter
    // Clear the previous timeout if it exists
    if (debounceTimeout.value) {
      clearTimeout(debounceTimeout.value);
    }

    // Set a new timeout to apply the format after a short delay
    debounceTimeout.value = window.setTimeout(() => {
      if (settings.value) settings.value.tus.chunkSize = parseBytes(value);
    }, 1500);
  },
});

// Define funcs
const capitalize = (name: string, where: string | RegExp = "_") => {
  if (where === "caps") where = /(?=[A-Z])/;
  const split = name.split(where);
  name = "";

  for (let i = 0; i < split.length; i++) {
    name += split[i].charAt(0).toUpperCase() + split[i].slice(1) + " ";
  }

  return name.slice(0, -1);
};

const save = async () => {
  if (settings.value === null) return false;
  const newSettings: ISettings = {
    ...settings.value,
    shell:
      settings.value?.shell
        .join(" ")
        .trim()
        .split(" ")
        .filter((s: string) => s !== "") ?? [],
    commands: {},
  };

  const keys = Object.keys(settings.value.commands) as Array<
    keyof SettingsCommand
  >;
  for (const key of keys) {
    // not sure if we can safely assume non-null
    const newValue = commandObject.value[key];
    if (!newValue) continue;

    if (Array.isArray(newValue)) {
      newSettings.commands[key] = newValue;
    } else if (key in commandObject.value) {
      newSettings.commands[key] = newValue
        .split("\n")
        .filter((cmd: string) => cmd !== "");
    }
  }
  newSettings.shell = shellValue.value
    .trim()
    .split(" ")
    .filter((s) => s !== "");

  if (newSettings.branding.theme !== getTheme()) {
    setTheme(newSettings.branding.theme);
  }

  try {
    await api.update(newSettings);
    $showSuccess('设置已更新');
  } catch (e: any) {
    $showError(e);
  }

  return true;
};
// Parse the user-friendly input (e.g., "20M" or "1T") to bytes
const parseBytes = (input: string) => {
  const regex = /^(\d+)(\.\d+)?(B|K|KB|M|MB|G|GB|T|TB)?$/i;
  const matches = input.match(regex);
  if (matches) {
    const size = parseFloat(matches[1].concat(matches[2] || ""));
    let unit: keyof SettingsUnit =
      matches[3].toUpperCase() as keyof SettingsUnit;
    if (!unit.endsWith("B")) {
      unit += "B";
    }
    const units: SettingsUnit = {
      KB: 1024,
      MB: 1024 ** 2,
      GB: 1024 ** 3,
      TB: 1024 ** 4,
    };
    return size * (units[unit as keyof SettingsUnit] || 1);
  } else {
    return 1024 ** 2;
  }
};
// Format the chunk size in bytes to user-friendly format
const formatBytes = (bytes: number) => {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size}${units[unitIndex]}`;
};

// Define Hooks

onMounted(async () => {
  try {
    layoutStore.loading = true;
    const original: ISettings = await api.get();
    const newSettings: ISettings = { ...original, commands: {} };

    const keys = Object.keys(original.commands) as Array<keyof SettingsCommand>;
    for (const key of keys) {
      newSettings.commands[key] = original.commands[key];
      commandObject.value[key] = original.commands[key]!.join("\n");
    }

    originalSettings.value = original;
    settings.value = newSettings;
    shellValue.value = newSettings.shell.join(" ");
  } catch (err) {
    if (err instanceof Error) {
      error.value = err;
    }
  } finally {
    layoutStore.loading = false;
  }
});

// Clear the debounce timeout when the component is destroyed
onBeforeUnmount(() => {
  if (debounceTimeout.value) {
    clearTimeout(debounceTimeout.value);
  }
});
</script>
