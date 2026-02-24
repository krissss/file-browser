<script setup lang="ts">
/**
 * 搜索框组件
 *
 * 包含搜索输入、清除按钮和递归切换
 */
import { Search, X } from 'lucide-vue-next';

defineProps<{
  query: string;
  recursive: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  'update:query': [value: string];
  toggleRecursive: [];
  clear: [];
  search: [];
}>();
</script>

<template>
  <div class="search-box">
    <Search class="search-icon" :size="16" :stroke-width="2" />
    <input
      type="text"
      :value="query"
      placeholder="搜索文件..."
      @input="emit('update:query', ($event.target as HTMLInputElement).value)"
      @keydown.enter="emit('search')"
      @keydown.escape="emit('clear')"
    />
    <button
      v-if="query"
      class="search-clear"
      @click="emit('clear')"
      aria-label="清除搜索"
    >
      <X :size="14" :stroke-width="2" />
    </button>
    <button
      class="search-mode"
      :class="{ active: recursive }"
      @click="emit('toggleRecursive')"
      :title="recursive ? '递归搜索已开启' : '递归搜索已关闭'"
    >
      {{ recursive ? '递归' : '当前' }}
    </button>
  </div>
</template>
