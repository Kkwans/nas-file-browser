<template>
  <select name="selectLanguage" @change="change" :value="locale">
    <option v-for="(language, value) in locales" :key="value" :value="value">
      {{ language }}
    </option>
  </select>
</template>

<script setup lang="ts">
import { markRaw } from "vue";

defineProps<{
  locale: string;
}>();

const emit = defineEmits<{
  "update:locale": [value: string];
}>();

const locales = markRaw({
  ar: "العربية",
  bg: "български език",
  ca: "Català",
  cs: "Čeština",
  de: "Deutsch",
  el: "Ελληνικά",
  en: "English",
  es: "Español",
  fr: "Français",
  he: "עברית",
  hr: "Hrvatski",
  hu: "Magyar",
  is: "Icelandic",
  it: "Italiano",
  ja: "日本語",
  ko: "한국어",
  no: "Norsk",
  nl: "Nederlands (Nederland)",
  "nl-be": "Nederlands (België)",
  lv: "Latviešu",
  pl: "Polski",
  "pt-br": "Português (Brasil)",
  "pt-pt": "Português (Portugal)",
  ro: "Romanian",
  ru: "Русский",
  sk: "Slovenčina",
  "sv-se": "Swedish (Sweden)",
  tr: "Türkçe",
  uk: "Українська",
  vi: "Tiếng Việt",
  "zh-cn": "中文 (简体)",
  "zh-tw": "中文 (繁體)",
} as Record<string, string>);

const change = (event: Event) => {
  emit("update:locale", (event.target as HTMLSelectElement).value);
};
</script>
