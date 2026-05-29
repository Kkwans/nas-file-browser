<template>
  <form class="rules small">
    <div v-for="(rule, index) in props.rules" :key="index">
      <input type="checkbox" v-model="rule.regex" /><label>Regex</label>
      <input type="checkbox" v-model="rule.allow" /><label>Allow</label>

      <input
        @keypress.enter.prevent
        type="text"
        v-if="rule.regex"
        v-model="rule.regexp.raw"
        placeholder="输入正则表达式"
      />
      <input
        @keypress.enter.prevent
        type="text"
        v-else
        placeholder="输入路径"
        v-model="rule.path"
      />

      <button class="button button--red" @click="remove($event, index)">
        -
      </button>
    </div>

    <div>
      <button class="button" @click="create" default="false">新建</button>
    </div>
  </form>
</template>

<script setup lang="ts">
interface Rule {
  allow: boolean;
  path: string;
  regex: boolean;
  regexp: { raw: string };
}

const props = defineProps<{
  rules: Rule[];
}>();

const emit = defineEmits<{
  "update:rules": [value: Rule[]];
}>();

const remove = (event: Event, index: number) => {
  event.preventDefault();
  const rules = [...props.rules];
  rules.splice(index, 1);
  emit("update:rules", [...rules]);
};

const create = (event: Event) => {
  event.preventDefault();
  emit("update:rules", [
    ...props.rules,
    {
      allow: true,
      path: "",
      regex: false,
      regexp: { raw: "" },
    },
  ]);
};
</script>
