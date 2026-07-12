<template>
  <div class="card floating help">
    <div class="card-title">
      <h2>帮助</h2>
    </div>

    <div class="card-content">
      <ul>
        <li><strong>F1</strong> - '显示该帮助信息'</li>
        <li><strong>F2</strong> - '重命名文件/文件夹'</li>
        <li><strong>DEL</strong> - '删除所选的文件/文件夹'</li>
        <li><strong>ESC</strong> - '清除已选项或关闭提示信息'</li>
        <li><strong>↑ ↓</strong> - '上下方向键导航文件列表'</li>
        <li><strong>Shift + ↑ ↓</strong> - 'Shift + 方向键多选文件'</li>
        <li><strong>Enter</strong> - '打开选中的文件/文件夹'</li>
        <li><strong>Home / End</strong> - '跳转到列表首/末尾'</li>
        <li><strong>PageUp / PageDown</strong> - '按页上下翻滚'</li>
        <li><strong>CTRL + S</strong> - '保存文件或下载当前文件夹'</li>
        <li><strong>CTRL + C</strong> - '复制选中文件'</li>
        <li><strong>CTRL + X</strong> - '剪切选中文件'</li>
        <li><strong>CTRL + V</strong> - '粘贴剪贴板中的文件'</li>
        <li><strong>CTRL + A</strong> - '全选所有文件和文件夹'</li>
        <li><strong>CTRL + SHIFT + F</strong> - '打开搜索框'</li>
        <li><strong>CTRL + Click</strong> - '选择多个文件或文件夹'</li>
        <li><strong>Click</strong> - '选择文件或文件夹'</li>
        <li><strong>Double click</strong> - '打开文件/文件夹'</li>
        <li><strong>Space</strong> - '快速预览文件（选中文件后按空格键）'</li>
      </ul>
    </div>

    <div class="card-action">
      <button
        id="focus-prompt"
        type="submit"
        @click="closeHovers"
        class="button button--flat"
        aria-label="确定"
        title="确定"
        tabindex="1"
      >
        '确定'
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from "@/stores/layout";
const layoutStore = useLayoutStore();
const closeHovers = () => layoutStore.closeHovers();
</script>
