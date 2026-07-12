<template>
  <div class="tag-manager">
    <div class="tag-manager-header">
      <h3>管理标签</h3>
      <button class="close-btn" @click="close" title="关闭">
        <i class="material-icons">close</i>
      </button>
    </div>

    <!-- Create new tag -->
    <div class="tag-create">
      <div class="tag-create-row">
        <input
          v-model="newTagName"
          type="text"
          class="tag-input"
          placeholder="标签名称..."
          maxlength="20"
          @keyup.enter="createTag"
        />
        <div class="color-picker">
          <button
            v-for="c in TAG_COLORS"
            :key="c"
            class="color-dot"
            :class="{ active: newTagColor === c }"
            :style="{ background: c }"
            type="button"
            :aria-label="`选择颜色 ${c}`"
            @click="newTagColor = c"
          />
          <label
            class="color-dot custom-color"
            :class="{ active: !TAG_COLORS.includes(newTagColor) }"
            title="自定义颜色"
            aria-label="自定义颜色"
          >
            <input
              v-model="newTagColor"
              type="color"
              aria-label="选择自定义颜色"
            />
          </label>
        </div>
        <button
          class="tag-create-btn"
          :disabled="!newTagName.trim()"
          @click="createTag"
        >
          <i class="material-icons">add</i>
          创建标签
        </button>
      </div>
    </div>

    <!-- Tag list -->
    <div class="tag-list">
      <div v-if="tagsStore.sortedTags.length === 0" class="tag-empty">
        暂无标签，创建一个吧
      </div>
      <div v-for="tag in tagsStore.sortedTags" :key="tag.id" class="tag-item">
        <!-- View mode -->
        <template v-if="editingId !== tag.id">
          <span class="tag-dot" :style="{ background: tag.color }"></span>
          <span class="tag-name">{{ tag.name }}</span>
          <span class="tag-count">{{ tag.paths.length }}</span>
          <button
            class="tag-action-btn"
            title="编辑标签"
            @click="startEdit(tag)"
          >
            <i class="material-icons">edit</i>
          </button>
          <button
            class="tag-action-btn delete"
            title="删除标签"
            @click="confirmDelete(tag)"
          >
            <i class="material-icons">delete</i>
          </button>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <input
            v-model="editName"
            type="text"
            class="tag-input small"
            maxlength="20"
            @keyup.enter="saveEdit(tag.id)"
            @keyup.escape="cancelEdit"
          />
          <div class="color-picker compact">
            <button
              v-for="c in TAG_COLORS"
              :key="c"
              class="color-dot small"
              :class="{ active: editColor === c }"
              :style="{ background: c }"
              type="button"
              :aria-label="`选择颜色 ${c}`"
              @click="editColor = c"
            />
            <label
              class="color-dot small custom-color"
              :class="{ active: !TAG_COLORS.includes(editColor) }"
              title="自定义颜色"
              aria-label="自定义颜色"
            >
              <input
                v-model="editColor"
                type="color"
                aria-label="选择自定义颜色"
              />
            </label>
          </div>
          <button class="tag-action-btn save" @click="saveEdit(tag.id)">
            <i class="material-icons">check</i>
          </button>
          <button class="tag-action-btn" @click="cancelEdit">
            <i class="material-icons">close</i>
          </button>
        </template>
      </div>
    </div>

    <!-- Delete confirmation -->
    <div v-if="deleteTarget" class="tag-delete-confirm">
      <p>确定删除标签「{{ deleteTarget.name }}」？</p>
      <div class="tag-delete-actions">
        <button class="btn-cancel" @click="deleteTarget = null">取消</button>
        <button class="btn-delete" @click="doDelete">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useTagsStore, TAG_COLORS, type Tag } from "@/stores/tags";
const emit = defineEmits<{
  close: [];
}>();

const tagsStore = useTagsStore();

const newTagName = ref("");
const newTagColor = ref(TAG_COLORS[5]); // Blue default

const editingId = ref<string | null>(null);
const editName = ref("");
const editColor = ref("");

const deleteTarget = ref<Tag | null>(null);

function createTag() {
  if (!newTagName.value.trim()) return;
  tagsStore.createTag(newTagName.value, newTagColor.value);
  newTagName.value = "";
}

function startEdit(tag: Tag) {
  editingId.value = tag.id;
  editName.value = tag.name;
  editColor.value = tag.color;
}

function saveEdit(id: string) {
  if (!editName.value.trim()) return;
  tagsStore.updateTag(id, { name: editName.value, color: editColor.value });
  editingId.value = null;
}

function cancelEdit() {
  editingId.value = null;
}

function confirmDelete(tag: Tag) {
  deleteTarget.value = tag;
}

function doDelete() {
  if (deleteTarget.value) {
    tagsStore.deleteTag(deleteTarget.value.id);
    deleteTarget.value = null;
  }
}

function close() {
  emit("close");
}
</script>

<style scoped>
.tag-manager {
  background: var(--surfacePrimary, #fff);
  border-radius: 0.75em;
  padding: 1.5em;
  max-width: 28em;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
}

.tag-manager-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1em;
}

.tag-manager-header h3 {
  margin: 0;
  font-size: 1.125em;
  font-weight: 600;
  color: var(--textPrimary, #1a1a2e);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--textSecondary, #666);
  padding: 0.25em;
  border-radius: 50%;
  display: flex;
}

.close-btn:hover {
  background: var(--hover, rgba(0, 0, 0, 0.06));
}

/* Create section */
.tag-create {
  margin-bottom: 1.25em;
  padding-bottom: 1em;
  border-bottom: 1px solid var(--divider, rgba(0, 0, 0, 0.08));
}

.tag-create-row {
  display: flex;
  flex-direction: column;
  gap: 0.5em;
}

.tag-input {
  width: 100%;
  padding: 0.5em 0.75em;
  border: 1px solid var(--divider, rgba(0, 0, 0, 0.15));
  border-radius: 0.5em;
  background: var(--surfaceSecondary, #f5f5f5);
  color: var(--textPrimary, #1a1a2e);
  font-size: 0.875em;
  outline: none;
  box-sizing: border-box;
}

.tag-input:focus {
  border-color: var(--blue, #2196f3);
}

.tag-input.small {
  flex: 1;
  min-width: 0;
}

.color-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35em;
}

.color-picker.compact {
  gap: 0.25em;
}

.color-dot {
  width: 1.25em;
  height: 1.25em;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition:
    border-color 0.15s,
    transform 0.15s;
}

.color-dot.small {
  width: 1em;
  height: 1em;
}

.color-dot:hover {
  transform: scale(1.15);
}

.color-dot.active {
  border-color: var(--textPrimary, #1a1a2e);
}

.custom-color {
  position: relative;
  overflow: hidden;
  background: conic-gradient(
    #f44336 0 16.6%,
    #ffc107 16.6% 33.2%,
    #4caf50 33.2% 49.8%,
    #03a9f4 49.8% 66.4%,
    #3f51b5 66.4% 83%,
    #e91e63 83% 100%
  );
}

.custom-color input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;
}

.tag-create-btn {
  display: flex;
  align-items: center;
  gap: 0.25em;
  padding: 0.4em 0.75em;
  background: var(--blue, #2196f3);
  color: #fff;
  border: none;
  border-radius: 0.5em;
  font-size: 0.8125em;
  cursor: pointer;
  align-self: flex-end;
}

.tag-create-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tag-create-btn:not(:disabled):hover {
  filter: brightness(1.1);
}

.tag-create-btn .material-icons {
  font-size: 1em;
}

/* Tag list */
.tag-list {
  display: flex;
  flex-direction: column;
  gap: 0.375em;
}

.tag-empty {
  text-align: center;
  padding: 1.5em 0;
  color: var(--textSecondary, #999);
  font-size: 0.875em;
}

.tag-item {
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.4em 0.5em;
  border-radius: 0.375em;
  transition: background 0.15s;
}

.tag-item:hover {
  background: var(--hover, rgba(0, 0, 0, 0.04));
}

.tag-dot {
  width: 0.625em;
  height: 0.625em;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-name {
  flex: 1;
  font-size: 0.875em;
  color: var(--textPrimary, #1a1a2e);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-count {
  font-size: 0.75em;
  color: var(--textSecondary, #999);
  background: var(--surfaceSecondary, #f0f0f0);
  padding: 0.1em 0.4em;
  border-radius: 0.75em;
  min-width: 1.2em;
  text-align: center;
}

.tag-action-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--textSecondary, #888);
  padding: 0.2em;
  border-radius: 0.25em;
  display: flex;
  opacity: 0;
  transition: opacity 0.15s;
}

.tag-item:hover .tag-action-btn {
  opacity: 1;
}

.tag-action-btn:hover {
  background: var(--hover, rgba(0, 0, 0, 0.08));
  color: var(--textPrimary, #1a1a2e);
}

.tag-action-btn.delete:hover {
  color: var(--icon-red, #da4453);
}

.tag-action-btn.save {
  color: var(--icon-green, #27ae60);
  opacity: 1;
}

.tag-action-btn .material-icons {
  font-size: 1em;
}

/* Delete confirmation */
.tag-delete-confirm {
  margin-top: 0.75em;
  padding: 0.75em;
  background: rgba(244, 67, 54, 0.06);
  border: 1px solid rgba(244, 67, 54, 0.2);
  border-radius: 0.5em;
}

.tag-delete-confirm p {
  margin: 0 0 0.5em;
  font-size: 0.8125em;
  color: var(--textPrimary, #1a1a2e);
}

.tag-delete-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5em;
}

.btn-cancel,
.btn-delete {
  padding: 0.3em 0.75em;
  border: none;
  border-radius: 0.375em;
  font-size: 0.8125em;
  cursor: pointer;
}

.btn-cancel {
  background: var(--surfaceSecondary, #f0f0f0);
  color: var(--textPrimary, #1a1a2e);
}

.btn-delete {
  background: var(--icon-red, #da4453);
  color: #fff;
}

.btn-delete:hover {
  filter: brightness(1.1);
}

/* Dark mode */
.dark .tag-manager {
  background: var(--surfacePrimary, #1e1e2e);
}
.dark .tag-input {
  background: var(--surfaceSecondary, #2a2a3e);
  border-color: var(--divider, rgba(255, 255, 255, 0.1));
  color: var(--textPrimary, #e0e0e0);
}
.dark .tag-delete-confirm {
  background: rgba(244, 67, 54, 0.1);
}
</style>

<style scoped>
/* 标签管理器采用清晰的工具面板层级，所有动作都保持固定命中区域。 */
.tag-manager {
  box-sizing: border-box;
  width: min(36rem, calc(100vw - 2rem));
  max-width: none;
  max-height: min(42rem, calc(100dvh - 2rem));
  padding: 1.5rem;
  overflow-y: auto;
  color: var(--textPrimary, #1e293b);
  background: var(--surfacePrimary, #fff);
  border: 1px solid var(--divider, #e2e8f0);
  border-radius: 1rem;
  box-shadow: 0 1.5rem 4rem rgba(15, 23, 42, 0.2);
}

.tag-manager-header {
  margin-bottom: 1.25rem;
}

.tag-manager-header h3 {
  font-size: 1.25rem;
  letter-spacing: -0.02em;
}

.close-btn,
.tag-action-btn,
.color-dot {
  display: inline-grid;
  place-items: center;
  min-width: 2.5rem;
  min-height: 2.5rem;
  padding: 0;
  cursor: pointer;
}

.close-btn {
  color: var(--textSecondary, #64748b);
  border: 1px solid var(--divider, #e2e8f0);
  border-radius: 0.5rem;
}

.close-btn:hover {
  color: #dc2626;
  background: #fef2f2;
}

.tag-create {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: var(--surfaceSecondary, #f8fafc);
  border: 1px solid var(--divider, #e2e8f0);
  border-radius: 0.75rem;
}

.tag-create-row {
  gap: 0.75rem;
}

.tag-input {
  min-height: 2.75rem;
  padding: 0.625rem 0.75rem;
  background: var(--surfacePrimary, #fff);
  border-color: var(--divider, #cbd5e1);
  border-radius: 0.5rem;
  font-size: 0.9375rem;
}

.color-picker {
  gap: 0.5rem;
}

.color-dot {
  width: 2.25rem;
  height: 2.25rem;
  border: 3px solid transparent;
  border-radius: 50%;
  transition: box-shadow 140ms ease;
}

.color-dot:hover {
  transform: none;
  box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.18);
}

.color-dot.active {
  border-color: var(--textPrimary, #1e293b);
  box-shadow:
    0 0 0 2px var(--surfacePrimary, #fff),
    0 0 0 4px #1677ff;
}

.tag-create-btn {
  min-height: 2.75rem;
  justify-content: center;
  padding: 0.625rem 1rem;
  background: #1677ff;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
}

.tag-list {
  gap: 0.5rem;
}

.tag-item {
  min-height: 3.25rem;
  padding: 0.375rem 0.5rem 0.375rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.625rem;
}

.tag-item:hover {
  background: var(--surfaceSecondary, #f8fafc);
  border-color: var(--divider, #e2e8f0);
}

.tag-action-btn {
  opacity: 1;
  color: var(--textSecondary, #64748b);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 0.375rem;
}

.tag-action-btn:hover {
  color: #1677ff;
  background: rgba(22, 119, 255, 0.08);
}

.tag-action-btn.delete:hover {
  color: #dc2626;
  background: #fef2f2;
}

.tag-count {
  min-width: 2rem;
  padding: 0.25rem 0.5rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 736px) {
  .tag-manager {
    width: 100%;
    max-height: 80dvh;
    padding: 1rem;
    border: 0;
    border-radius: 1rem 1rem 0 0;
  }

  .tag-create-row {
    display: grid;
  }

  .tag-list {
    max-height: 40dvh;
  }
}
</style>
