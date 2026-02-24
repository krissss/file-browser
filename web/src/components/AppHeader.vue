<script setup lang="ts">
/**
 * 应用头部组件
 *
 * 包含品牌 logo 和主题切换按钮
 */
import { Sun, Moon } from 'lucide-vue-next';

defineProps<{
  theme: 'light' | 'dark';
}>();

const emit = defineEmits<{
  toggleTheme: [];
}>();
</script>

<template>
  <div class="header panel">
    <div class="title">
      <div class="brand">
        <img src="/logo.svg" alt="File Browser" class="brand-logo" />
        <div>
          <h1>File Browser</h1>
        </div>
      </div>
    </div>
    <div class="icon-actions">
      <button class="icon-button" @click="emit('toggleTheme')" aria-label="切换主题" title="切换主题">
        <Sun v-if="theme === 'light'" :size="18" :stroke-width="2" />
        <Moon v-else :size="18" :stroke-width="2" />
      </button>
    </div>
  </div>
</template>
