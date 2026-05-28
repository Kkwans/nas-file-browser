<template>
  <div class="tag-picker" @click.stop>
    <div class="tag-picker-header">
      <span>{{ $t("tags.assignTags") }}</span>
      <button
        class="tag-picker-manage"
        @click="openManager"
        :title="$t('tags.manage')"
      >
        <i class="material-icons">settings</i>
      </button>
    </div>
    <div v-if="tagsStore.sortedTags.length === 0" class="tag-picker-empty">
      {{ $t("tags.noTags") }}
    </div>
    <div v-else class="tag-picker-list">
      <button
        v-for="tag in tagsStore.sortedTags"
        :key="tag.id"
        class="tag-picker-item"
        :class="{ active: isAssigned(tag.id) }"
        @click="toggle(tag.id)"
      >
        <span class="tag-dot" :style="{ background: tag.color }"></span>
        <span class="tag-name">{{ tag.name }}</span>
        <i v-if="isAssigned(tag.id)" class="material-icons tag-check">check</i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTagsStore } from "@/stores/tags";

const props = defineProps<{
  path: string;
}>();

const emit = defineEmits<{
  manage: [];
}>();

const tagsStore = useTagsStore();

function isAssigned(tagId: string): boolean {
  const cleaned = props.path.replace(/\/+$/, "");
  const tag = tagsStore.tags.find((t) => t.id === tagId);
  return tag ? tag.paths.includes(cleaned) : false;
}

function toggle(tagId: string) {
  tagsStore.togglePathInTag(tagId, props.path);
}

function openManager() {
  emit("manage");
}
</script>

<style scoped>
.tag-picker {
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--divider, rgba(0, 0, 0, 0.1));
  border-radius: 0.5em;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  min-width: 12em;
  max-height: 16em;
  overflow-y: auto;
}

.tag-picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5em 0.75em;
  border-bottom: 1px solid var(--divider, rgba(0, 0, 0, 0.06));
  font-size: 0.75em;
  font-weight: 600;
  color: var(--textSecondary, #666);
}

.tag-picker-manage {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--textSecondary, #888);
  padding: 0.125em;
  border-radius: 0.25em;
  display: flex;
}

.tag-picker-manage:hover {
  background: var(--hover, rgba(0, 0, 0, 0.06));
}

.tag-picker-manage .material-icons {
  font-size: 0.875em;
}

.tag-picker-empty {
  padding: 1em;
  text-align: center;
  font-size: 0.75em;
  color: var(--textSecondary, #999);
}

.tag-picker-list {
  padding: 0.25em 0;
}

.tag-picker-item {
  display: flex;
  align-items: center;
  gap: 0.5em;
  width: 100%;
  padding: 0.375em 0.75em;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8125em;
  color: var(--textPrimary, #1a1a2e);
  text-align: left;
}

.tag-picker-item:hover {
  background: var(--hover, rgba(0, 0, 0, 0.04));
}

.tag-picker-item.active {
  background: rgba(33, 150, 243, 0.06);
}

.tag-dot {
  width: 0.5em;
  height: 0.5em;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-check {
  font-size: 0.875em;
  color: var(--blue, #2196f3);
}

/* Dark mode */
.dark .tag-picker {
  background: var(--surfacePrimary, #1e1e2e);
  border-color: var(--divider, rgba(255, 255, 255, 0.1));
}
</style>
