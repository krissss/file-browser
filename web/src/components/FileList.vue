<script setup lang="ts">
/**
 * 文件列表组件
 *
 * 显示文件/目录列表，支持搜索模式和普通模式
 */
import FileListItem from './FileListItem.vue';
import type { FileEntry } from '../file-types';

const props = defineProps<{
  entries: FileEntry[];
  selected: FileEntry | null;
  searchMode?: boolean;
  recursive?: boolean;
  loading?: boolean;
  getRelativePath?: (entry: FileEntry) => string;
  formatSize: (size: number) => string;
  formatDate: (date: string) => string;
}>();

const emit = defineEmits<{
  select: [entry: FileEntry];
}>();

function getShowPath(entry: FileEntry): string | undefined {
  if (!props.searchMode || !props.recursive || !props.getRelativePath) return undefined;
  return props.getRelativePath(entry) || undefined;
}
</script>

<template>
  <div class="list">
    <template v-if="searchMode">
      <div v-if="!loading && entries.length === 0" class="empty-result">
        未找到匹配的文件
      </div>
      <FileListItem
        v-for="entry in entries"
        :key="entry.path"
        :entry="entry"
        :selected="selected?.path === entry.path"
        :show-path="getShowPath(entry)"
        :format-size="formatSize"
        :format-date="formatDate"
        @click="emit('select', entry)"
      />
    </template>
    <template v-else>
      <FileListItem
        v-for="entry in entries"
        :key="entry.path"
        :entry="entry"
        :selected="selected?.path === entry.path"
        :format-size="formatSize"
        :format-date="formatDate"
        @click="emit('select', entry)"
      />
    </template>
  </div>
</template>
