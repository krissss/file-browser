<script setup lang="ts">
/**
 * 预览面板组件
 *
 * 显示文件预览内容，支持文本、代码、Markdown、图片
 */
import { computed, ref, watch, nextTick } from 'vue';
import { renderMarkdown } from '../markdown';
import { highlightCode, highlightMarkdownBlocks } from '../highlight';
import { entryExtension, isImage, isMarkdown, isCode, type FileEntry } from '../file-types';
import PreviewToolbar from './PreviewToolbar.vue';
import type { PreviewState } from '../composables/usePreview';

const props = defineProps<{
  entry: FileEntry | null;
  preview: PreviewState;
  maximized: boolean;
  formatSize: (size: number) => string;
  formatDate: (date: string) => string;
  formatPath: (path: string) => string;
}>();

const emit = defineEmits<{
  loadChunk: [];
  'update:maximized': [value: boolean];
  'update:view': [view: 'render' | 'raw'];
}>();

const previewCardRef = ref<HTMLElement | null>(null);

/** 预览模式 */
const previewMode = computed(() => {
  if (!props.entry) return 'none';
  const ext = entryExtension(props.entry).toLowerCase();
  if (isImage(ext)) return 'image';
  if (isMarkdown(ext)) return 'markdown';
  if (isCode(ext, props.entry.name)) return 'code';
  return 'text';
});

/** 下载链接 */
const downloadUrl = computed(() => {
  if (!props.entry || props.entry.type !== 'file') return null;
  return `/api/download?path=${encodeURIComponent(props.entry.path)}`;
});

/** 图片链接 */
const imageUrl = computed(() => {
  if (!props.entry || props.entry.type !== 'file') return undefined;
  if (!isImage(entryExtension(props.entry))) return undefined;
  return `/api/image?path=${encodeURIComponent(props.entry.path)}`;
});

/** 获取代码语言 */
function codeLanguage(file: FileEntry | null): string {
  if (!file) return '';
  const name = file.name.toLowerCase();
  if (name === 'dockerfile' || name.startsWith('dockerfile.')) return 'dockerfile';
  if (name === 'makefile' || name.startsWith('makefile.')) return 'makefile';
  return entryExtension(file).toLowerCase() || 'plaintext';
}

/** 渲染后的预览 HTML */
const previewHtml = computed(() => {
  if (previewMode.value === 'markdown') {
    return renderMarkdown(props.preview.content);
  }
  if (previewMode.value === 'code') {
    return highlightCode(props.preview.content, codeLanguage(props.entry));
  }
  return '';
});

/** 应用代码高亮（Markdown 中的代码块） */
function applyCodeHighlight() {
  if (props.preview.view !== 'render') return;
  if (previewMode.value !== 'markdown') return;
  nextTick(() => {
    highlightMarkdownBlocks();
  });
}

// 监听内容变化时应用高亮
watch([() => props.preview.content, () => props.preview.view, previewMode], () => {
  applyCodeHighlight();
});

function setView(view: 'render' | 'raw') {
  emit('update:view', view);
}

function toggleMax() {
  emit('update:maximized', !props.maximized);
}
</script>

<template>
  <section class="panel preview">
    <div v-if="!entry" class="empty">选择一个文件以开始预览</div>

    <template v-else>
      <div class="preview-meta">
        <strong>{{ entry.name }}</strong>
        <small class="preview-path">{{ formatPath(entry.path) }}</small>
        <small>
          {{ formatSize(entry.size) }} · {{ formatDate(entry.modified) }}
        </small>
      </div>

      <PreviewToolbar
        :view="preview.view"
        :preview-mode="previewMode"
        :maximized="maximized"
        :download-url="downloadUrl"
        @set-view="setView"
        @toggle-max="toggleMax"
      />

      <div class="preview-card" ref="previewCardRef">
        <template v-if="preview.loading && !preview.content">
          加载中...
        </template>

        <template v-else>
          <template v-if="preview.error">
            <p>{{ preview.error }}</p>
            <p v-if="preview.tooLarge && preview.maxBytes">
              预览上限 {{ formatSize(preview.maxBytes) }}，文件大小 {{ formatSize(preview.size || 0) }}。
            </p>
            <button class="button" @click="emit('loadChunk')" v-if="preview.tooLarge">加载首段</button>
          </template>

          <template v-else-if="previewMode === 'image'">
            <img :src="imageUrl" alt="preview" />
          </template>

          <template v-else-if="previewMode === 'markdown' || previewMode === 'code'">
            <div v-if="preview.view === 'render'" class="markdown markdown-body" v-html="previewHtml"></div>
            <pre v-else>{{ preview.content }}</pre>
          </template>

          <template v-else>
            <pre>{{ preview.content }}</pre>
          </template>
        </template>
      </div>

      <button
        v-if="preview.hasMore"
        class="button"
        @click="emit('loadChunk')"
        :disabled="preview.appending || preview.loading"
      >
        {{ preview.appending ? '加载中...' : '加载更多' }}
        <span v-if="preview.offset > 0" class="load-status">
          （已加载 {{ formatSize(preview.offset) }}）
        </span>
      </button>
    </template>
  </section>
</template>
