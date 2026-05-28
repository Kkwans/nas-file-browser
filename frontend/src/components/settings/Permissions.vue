<template>
  <div>
    <h3>{{ $t("settings.permissions") }}</h3>
    <p class="small">{{ $t("settings.permissionsHelp") }}</p>

    <p>
      <input type="checkbox" v-model="admin" />
      {{ $t("settings.administrator") }}
    </p>

    <p>
      <input type="checkbox" :disabled="admin" v-model="perm.create" />
      {{ $t("settings.perm.create") }}
    </p>
    <p>
      <input type="checkbox" :disabled="admin" v-model="perm.delete" />
      {{ $t("settings.perm.delete") }}
    </p>
    <p>
      <input
        type="checkbox"
        :disabled="admin || perm.share"
        v-model="perm.download"
      />
      {{ $t("settings.perm.download") }}
    </p>
    <p>
      <input type="checkbox" :disabled="admin" v-model="perm.modify" />
      {{ $t("settings.perm.modify") }}
    </p>
    <p v-if="isExecEnabled">
      <input type="checkbox" :disabled="admin" v-model="perm.execute" />
      {{ $t("settings.perm.execute") }}
    </p>
    <p>
      <input type="checkbox" :disabled="admin" v-model="perm.rename" />
      {{ $t("settings.perm.rename") }}
    </p>
    <p>
      <input type="checkbox" :disabled="admin" v-model="perm.share" />
      {{ $t("settings.perm.share") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { enableExec } from "@/utils/constants";

interface Permissions {
  admin: boolean;
  create: boolean;
  delete: boolean;
  download: boolean;
  modify: boolean;
  execute: boolean;
  rename: boolean;
  share: boolean;
}

const props = defineProps<{
  perm: Permissions;
}>();

const isExecEnabled = enableExec;

const admin = computed({
  get: () => props.perm.admin,
  set: (value: boolean) => {
    if (value) {
      for (const key in props.perm) {
        (props.perm as any)[key] = true;
      }
    }
    props.perm.admin = value;
  },
});

watch(
  () => props.perm,
  () => {
    if (props.perm.share === true) {
      props.perm.download = true;
    }
  },
  { deep: true }
);
</script>
