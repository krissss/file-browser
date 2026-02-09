<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';
import { renderMarkdown } from './markdown';
import { highlightCode, highlightMarkdownBlocks } from './highlight';
import { Download, Maximize2, Minimize2, Moon, Sun } from 'lucide-vue-next';

import {
  entryExtension,
  fileExtensionFromName,
  fileIcon,
  isBinaryFile,
  isCode,
  isImage,
  isMarkdown,
  type FileEntry
} from './file-types';

type PreviewState = {
  content: string;
  loading: boolean;
  appending: boolean;
  error: string | null;
  tooLarge: boolean;
  maxBytes: number | null;
  size: number | null;
  offset: number;
  limit: number;
  hasMore: boolean;
  view: 'render' | 'raw';
  isBinary: boolean;
};

const state = reactive({
  currentPath: '/',
  entries: [] as FileEntry[],
  selected: null as FileEntry | null
});

const preview = reactive<PreviewState>({
  content: '',
  loading: false,
  appending: false,
  error: null,
  tooLarge: false,
  maxBytes: null,
  size: null,
  offset: 0,
  limit: 0,
  hasMore: false,
  view: 'render',
  isBinary: false
});

const theme = ref<'light' | 'dark'>('light');
const previewCardRef = ref<HTMLElement | null>(null);
const previewMaximized = ref(false);
const chunkSize = 64 * 1024;
const hljsThemeId = 'hljs-theme';

function setHljsTheme(next: 'light' | 'dark') {
  const href = next === 'dark' ? '/hljs-github-dark.css' : '/hljs-github.css';
  let link = document.getElementById(hljsThemeId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = hljsThemeId;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
}

function applyTheme(next: 'light' | 'dark') {
  theme.value = next;
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('file-browser-theme', next);
  setHljsTheme(next);
}

function toggleTheme() {
  applyTheme(theme.value === 'light' ? 'dark' : 'light');
}

function togglePreviewMax() {
  previewMaximized.value = !previewMaximized.value;
}

const breadcrumbs = computed(() => {
  const parts = state.currentPath.split('/').filter(Boolean);
  const crumbs = [{ label: '根目录', path: '/' }];
  let acc = '';
  for (const part of parts) {
    acc += '/' + part;
    crumbs.push({ label: part, path: acc });
  }
  return crumbs;
});

const previewMode = computed(() => {
  if (!state.selected) {
    return 'none';
  }
  const ext = entryExtension(state.selected).toLowerCase();
  if (isImage(ext)) return 'image';
  if (isMarkdown(ext)) return 'markdown';
  if (isCode(ext, state.selected.name)) return 'code';
  return 'text';
});

const previewHtml = computed(() => {
  if (previewMode.value === 'markdown') {
    return renderMarkdown(preview.content);
  }
  if (previewMode.value === 'code') {
    const lang = codeLanguage(state.selected);
    return highlightCode(preview.content, lang);
  }
  return '';
});

function applyCodeHighlight() {
  if (preview.view !== 'render') return;
  if (previewMode.value !== 'markdown') return;
  nextTick(() => {
    highlightMarkdownBlocks();
  });
}

async function loadEntries(path: string) {
  previewReset();
  state.selected = null;
  state.currentPath = path;
  const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
  if (!response.ok) {
    preview.error = '无法加载目录';
    return;
  }
  const items: FileEntry[] = await response.json();
  state.entries = items.map((entry) => ({
    ...entry,
    extension: entry.extension || fileExtensionFromName(entry.name)
  }));
}

function previewReset() {
  preview.content = '';
  preview.loading = false;
  preview.appending = false;
  preview.error = null;
  preview.tooLarge = false;
  preview.maxBytes = null;
  preview.size = null;
  preview.offset = 0;
  preview.limit = 0;
  preview.hasMore = false;
  preview.view = 'render';
  preview.isBinary = false;
}

async function selectEntry(entry: FileEntry) {
  if (entry.type === 'dir') {
    await loadEntries(entry.path);
    return;
  }
  state.selected = entry;
  previewReset();
  if (isImage(entryExtension(entry))) {
    return;
  }
  await fetchPreview(entry.path);
}

async function fetchPreview(path: string, append = false) {
  const previewCard = previewCardRef.value;
  const prevScrollTop = previewCard ? previewCard.scrollTop : 0;
  const prevScrollHeight = previewCard ? previewCard.scrollHeight : 0;

  if (append) {
    preview.appending = true;
  } else {
    preview.loading = true;
  }
  const offset = append ? preview.offset : 0;
  const limit = append && preview.limit > 0 ? preview.limit : 0;
  const url = offset > 0
    ? `/api/preview?path=${encodeURIComponent(path)}&offset=${offset}&limit=${limit || chunkSize}`
    : `/api/preview?path=${encodeURIComponent(path)}`;

  const response = await fetch(url);
  if (response.status === 413) {
    const payload = await response.json();
    preview.tooLarge = true;
    preview.maxBytes = payload.meta?.maxBytes || null;
    preview.size = payload.meta?.size || null;
    preview.error = payload.error || '文件过大，无法直接预览';
    preview.loading = false;
    return;
  }

  if (!response.ok) {
    preview.error = '无法加载预览';
    preview.loading = false;
    return;
  }

  const payload = await response.json();
  preview.content = append ? preview.content + payload.content : payload.content;
  preview.offset = (payload.offset || 0) + (payload.limit || payload.content.length);
  preview.limit = payload.limit || preview.limit;
  preview.hasMore = payload.hasMore;
  preview.isBinary = state.selected ? isBinaryFile(state.selected) : false;
  preview.loading = false;
  preview.appending = false;

  if (append && previewCard) {
    requestAnimationFrame(() => {
      previewCard.scrollTop = prevScrollTop;
    });
  }
}

async function loadChunk() {
  if (!state.selected) return;
  await fetchPreview(state.selected.path, true);
}

function formatSize(size: number) {
  if (!size && size !== 0) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

function codeLanguage(file: FileEntry | null) {
  if (!file) return '';
  const name = file.name.toLowerCase();
  if (name === 'dockerfile' || name.startsWith('dockerfile.')) return 'dockerfile';
  if (name === 'makefile' || name.startsWith('makefile.')) return 'makefile';
  const ext = entryExtension(file).toLowerCase();
  if (ext === 'yml') return 'yaml';
  if (ext === 'js') return 'javascript';
  if (ext === 'ts') return 'typescript';
  if (ext === 'tsx' || ext === 'jsx') return 'javascript';
  if (ext === 'sh' || ext === 'zsh') return 'bash';
  if (ext === 'proto') return 'protobuf';
  if (ext === 'gql') return 'graphql';
  if (ext === 'cs') return 'cs';
  if (ext === 'kt' || ext === 'kts') return 'kotlin';
  if (ext === 'xml' || ext === 'html') return 'xml';
  if (ext === 'toml') return 'ini';
  return ext || 'plaintext';
}

function setPreviewView(view: 'render' | 'raw') {
  preview.view = view;
}

const selectedDownload = computed(() => {
  if (!state.selected || state.selected.type !== 'file') return null;
  return `/api/download?path=${encodeURIComponent(state.selected.path)}`;
});

const selectedImage = computed(() => {
  if (!state.selected || state.selected.type !== 'file') return null;
  if (!isImage(entryExtension(state.selected))) return null;
  return `/api/image?path=${encodeURIComponent(state.selected.path)}`;
});

onMounted(async () => {
  const saved = localStorage.getItem('file-browser-theme');
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  } else {
    applyTheme('light');
  }
  await loadEntries('/');
});

watch([() => preview.content, () => preview.view, () => previewMode.value], () => {
  applyCodeHighlight();
});
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
      <button class="icon-button" @click="toggleTheme" aria-label="切换主题" title="切换主题">
        <Sun v-if="theme === 'light'" :size="18" :stroke-width="2" />
        <Moon v-else :size="18" :stroke-width="2" />
      </button>
    </div>
  </div>

  <div class="app-shell" :class="{ maximized: previewMaximized }">
    <section class="panel list-panel">
      <div class="breadcrumbs">
        <template v-for="(crumb, index) in breadcrumbs" :key="crumb.path">
          <span @click="loadEntries(crumb.path)">{{ crumb.label }}</span>
          <span v-if="index < breadcrumbs.length - 1">/</span>
        </template>
      </div>

      <div class="list">
        <div
          v-for="entry in state.entries"
          :key="entry.path"
          class="list-item"
          :class="{ active: state.selected?.path === entry.path }"
          @click="selectEntry(entry)"
        >
          <component :is="fileIcon(entry)" class="file-icon" :size="18" :stroke-width="1.8" />
          <div class="file-meta">
            <strong>{{ entry.name }}</strong>
            <small>{{ entry.type === 'dir' ? '目录' : formatSize(entry.size) }}</small>
          </div>
          <small>{{ formatDate(entry.modified) }}</small>
        </div>
      </div>
    </section>

    <section class="panel preview">
      <div v-if="!state.selected" class="empty">选择一个文件以开始预览</div>

      <template v-else>
        <div class="file-meta">
          <strong>{{ state.selected.name }}</strong>
          <small>
            {{ formatSize(state.selected.size) }} · {{ formatDate(state.selected.modified) }}
          </small>
        </div>

        <div class="preview-toolbar">
          <div class="preview-toggle" v-if="previewMode === 'markdown' || previewMode === 'code'">
            <button
              class="button"
              :class="{ primary: preview.view === 'render' }"
              @click="setPreviewView('render')"
            >
              渲染
            </button>
            <button
              class="button"
              :class="{ primary: preview.view === 'raw' }"
              @click="setPreviewView('raw')"
            >
              原文
            </button>
          </div>

          <div class="preview-actions">
            <button
              class="icon-button"
              @click="togglePreviewMax"
              aria-label="最大化预览"
              title="最大化预览"
            >
              <Maximize2 v-if="!previewMaximized" :size="18" :stroke-width="2" />
              <Minimize2 v-else :size="18" :stroke-width="2" />
            </button>
            <a
              v-if="selectedDownload"
              class="icon-button"
              :href="selectedDownload"
              aria-label="下载"
              title="下载"
            >
              <Download :size="18" :stroke-width="2" />
            </a>
          </div>
        </div>

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
              <button class="button" @click="loadChunk" v-if="preview.tooLarge">加载首段</button>
            </template>

            <template v-else-if="previewMode === 'image'">
              <img :src="selectedImage" alt="preview" />
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
          @click="loadChunk"
          :disabled="preview.appending || preview.loading"
        >
          {{ preview.appending ? '加载中...' : '加载更多' }}
          <span v-if="preview.offset > 0" class="load-status">
            （已加载 {{ formatSize(preview.offset) }}）
          </span>
        </button>
      </template>
    </section>
  </div>
</template>
