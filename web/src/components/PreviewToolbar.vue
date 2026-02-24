<script setup lang="ts">
/**
 * 预览工具栏组件
 *
 * 包含渲染/原文切换、最大化、下载按钮
 */
import { Download, Maximize2, Minimize2 } from 'lucide-vue-next';

defineProps<{
  view: 'render' | 'raw';
  previewMode: 'none' | 'image' | 'markdown' | 'code' | 'text';
  maximized: boolean;
  downloadUrl: string | null;
}>();

const emit = defineEmits<{
  setView: [view: 'render' | 'raw'];
  toggleMax: [];
}>();
</script>

<template>
  <div class="preview-toolbar">
    <div class="preview-toggle" v-if="previewMode === 'markdown' || previewMode === 'code'">
      <button
        class="button"
        :class="{ primary: view === 'render' }"
        @click="emit('setView', 'render')"
      >
        渲染
      </button>
      <button
        class="button"
        :class="{ primary: view === 'raw' }"
        @click="emit('setView', 'raw')"
      >
        原文
      </button>
    </div>

    <div class="preview-actions">
      <button
        class="icon-button"
        @click="emit('toggleMax')"
        aria-label="最大化预览"
        title="最大化预览"
      >
        <Maximize2 v-if="!maximized" :size="18" :stroke-width="2" />
        <Minimize2 v-else :size="18" :stroke-width="2" />
      </button>
      <a
        v-if="downloadUrl"
        class="icon-button"
        :href="downloadUrl"
        aria-label="下载"
        title="下载"
      >
        <Download :size="18" :stroke-width="2" />
      </a>
    </div>
  </div>
</template>
