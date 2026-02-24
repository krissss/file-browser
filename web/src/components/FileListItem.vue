<script setup lang="ts">
/**
 * 文件列表项组件
 *
 * 显示单个文件/目录的信息
 */
import { fileIcon, type FileEntry } from '../file-types';

const props = defineProps<{
  entry: FileEntry;
  selected?: boolean;
  showPath?: string;
  formatSize: (size: number) => string;
  formatDate: (date: string) => string;
}>();

const emit = defineEmits<{
  click: [entry: FileEntry];
}>();
</script>

<template>
  <div
    class="list-item"
    :class="{
      active: selected,
      'list-item--with-path': showPath
    }"
    @click="emit('click', entry)"
  >
    <component :is="fileIcon(entry)" class="file-icon" :size="18" :stroke-width="1.8" />
    <div class="file-meta">
      <strong class="file-name">{{ entry.name }}</strong>
      <span v-if="showPath" class="file-path">{{ showPath }}</span>
      <div class="file-info">
        <small>{{ entry.type === 'dir' ? '目录' : formatSize(entry.size) }}</small>
        <small>{{ formatDate(entry.modified) }}</small>
      </div>
    </div>
  </div>
</template>
