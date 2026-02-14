<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { renderMarkdown } from './markdown';
import { highlightCode, highlightMarkdownBlocks } from './highlight';
import { Download, Maximize2, Minimize2, Moon, Search, Sun, X } from 'lucide-vue-next';
import markdownLight from 'github-markdown-css/github-markdown-light.css?url';
import markdownDark from 'github-markdown-css/github-markdown-dark.css?url';

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

const route = useRoute();
const router = useRouter();

const state = reactive({
  currentPath: '/',
  entries: [] as FileEntry[],
  selected: null as FileEntry | null,
  initialized: false
});

const search = reactive({
  query: '',
  results: [] as FileEntry[],
  isSearching: false,
  loading: false,
  recursive: false
});

let searchTimeout: ReturnType<typeof setTimeout> | null = null;

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
const markdownThemeId = 'markdown-theme';

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

function setMarkdownTheme(next: 'light' | 'dark') {
  const href = next === 'dark' ? markdownDark : markdownLight;
  let link = document.getElementById(markdownThemeId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = markdownThemeId;
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
  setMarkdownTheme(next);
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

const displayEntries = computed(() => {
  return search.isSearching ? search.results : state.entries;
});

function getRelativePath(entry: FileEntry): string {
  if (!search.recursive || !search.isSearching) return '';
  const basePath = state.currentPath === '/' ? '' : state.currentPath;
  let relPath = entry.path;
  if (relPath.startsWith(basePath)) {
    relPath = relPath.slice(basePath.length);
    if (relPath.startsWith('/')) relPath = relPath.slice(1);
  }

  // 对于目录，显示完整相对路径
  // 对于文件，显示文件所在的目录
  const parts = relPath.split('/');
  if (entry.type === 'file' && parts.length > 1) {
    parts.pop();
  }

  if (parts.length === 0) return '';

  const fullPath = parts.join('/');

  // 智能截断：保留开头和结尾，中间省略
  const maxLen = 35;
  if (fullPath.length <= maxLen) {
    return fullPath;
  }

  // 尝试保留最后 3 级目录
  const lastParts = parts.slice(-3).join('/');
  if (lastParts.length <= maxLen - 3) {
    return '.../' + lastParts;
  }

  // 只保留最后 2 级
  const last2 = parts.slice(-2).join('/');
  return '.../' + last2;
}

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

function clearSearch() {
  search.query = '';
  search.results = [];
  search.isSearching = false;
  search.loading = false;
  if (searchTimeout) {
    clearTimeout(searchTimeout);
    searchTimeout = null;
  }
}

async function performSearch() {
  if (!search.query.trim()) {
    search.isSearching = false;
    search.results = [];
    return;
  }

  search.loading = true;
  search.isSearching = true;
  state.selected = null;
  previewReset();

  const recursiveParam = search.recursive ? 'true' : 'false';
  const response = await fetch(
    `/api/search?path=${encodeURIComponent(state.currentPath)}&q=${encodeURIComponent(search.query)}&recursive=${recursiveParam}`
  );

  if (response.ok) {
    const items: FileEntry[] = await response.json();
    search.results = items.map((entry) => ({
      ...entry,
      extension: entry.extension || fileExtensionFromName(entry.name)
    }));
  }
  search.loading = false;
}

function debouncedSearch() {
  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }
  searchTimeout = setTimeout(() => {
    performSearch();
  }, 300);
}

function toggleSearchRecursive() {
  search.recursive = !search.recursive;
  if (search.query.trim()) {
    performSearch();
  }
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

async function selectEntry(entry: FileEntry, updateRoute = true) {
  if (entry.type === 'dir') {
    clearSearch();
    if (updateRoute) {
      router.push({ path: '/', query: { dir: formatPath(entry.path) } });
    } else {
      await loadEntries(entry.path);
    }
    return;
  }
  state.selected = entry;
  previewReset();
  if (updateRoute) {
    router.push({ path: '/', query: { dir: formatPath(state.currentPath), file: formatPath(entry.path) } });
  }
  if (isImage(entryExtension(entry))) {
    return;
  }
  await fetchPreview(entry.path);
}

function resolveFilePath(linkPath: string): string {
  if (linkPath.startsWith('/')) {
    return linkPath;
  }
  const baseDir = state.selected ? state.selected.path.substring(0, state.selected.path.lastIndexOf('/')) : state.currentPath;
  const parts = (baseDir + '/' + linkPath).split('/').filter(Boolean);
  const resolved: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      resolved.pop();
    } else if (part !== '.') {
      resolved.push(part);
    }
  }
  return '/' + resolved.join('/');
}

function handleInternalLinkClick(event: Event) {
  const target = event.target as HTMLElement;
  const link = target.closest('a.internal-link') as HTMLAnchorElement | null;
  if (!link) return;

  event.preventDefault();
  const filePath = link.dataset.filePath;
  if (!filePath) return;

  const resolvedPath = resolveFilePath(filePath);
  const dirPath = resolvedPath.substring(0, resolvedPath.lastIndexOf('/')) || '/';

  router.push({ path: '/', query: { dir: dirPath, file: resolvedPath } });
}

const clickHandler = (e: Event) => handleInternalLinkClick(e);

async function fetchPreview(path: string, append = false) {
  const previewCard = previewCardRef.value;
  const prevScrollTop = previewCard ? previewCard.scrollTop : 0;

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

  // 更新 state.selected 的大小和时间（如果之前没有）
  if (state.selected && !append) {
    if (payload.size !== undefined) {
      state.selected.size = payload.size;
    }
    if (payload.modified) {
      state.selected.modified = payload.modified;
    }
  }

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

function formatPath(path: string): string {
  // 去掉开头的多个 /
  return path.replace(/^\/+/, '/');
}

function codeLanguage(file: FileEntry | null) {
  if (!file) return '';
  const name = file.name.toLowerCase();
  if (name === 'dockerfile' || name.startsWith('dockerfile.')) return 'dockerfile';
  if (name === 'makefile' || name.startsWith('makefile.')) return 'makefile';
  return entryExtension(file).toLowerCase() || 'plaintext';
}

function setPreviewView(view: 'render' | 'raw') {
  preview.view = view;
}

const selectedDownload = computed(() => {
  if (!state.selected || state.selected.type !== 'file') return null;
  return `/api/download?path=${encodeURIComponent(state.selected.path)}`;
});

const selectedImage = computed(() => {
  if (!state.selected || state.selected.type !== 'file') return undefined;
  if (!isImage(entryExtension(state.selected))) return undefined;
  return `/api/image?path=${encodeURIComponent(state.selected.path)}`;
});

function navigateToCrumb(path: string) {
  router.push({ path: '/', query: { dir: path } });
}

async function handleRouteChange() {
  const dir = (route.query.dir as string) || '/';
  const file = route.query.file as string | undefined;

  await loadEntries(dir);

  if (file) {
    const entry = state.entries.find(e => e.path === file);
    if (entry) {
      await selectEntry(entry, false);
    } else {
      state.selected = {
        name: file.split('/').pop() || file,
        path: file,
        type: 'file',
        size: 0,
        modified: '',
        extension: fileExtensionFromName(file)
      };
      previewReset();
      if (!isImage(entryExtension(state.selected))) {
        await fetchPreview(file);
      }
    }
  }
}

onMounted(async () => {
  const saved = localStorage.getItem('file-browser-theme');
  if (saved === 'dark' || saved === 'light') {
    applyTheme(saved);
  } else {
    applyTheme('light');
  }
  document.addEventListener('click', clickHandler);
  state.initialized = true;
  await handleRouteChange();
});

onUnmounted(() => {
  document.removeEventListener('click', clickHandler);
});

watch(() => route.query, () => {
  if (state.initialized) {
    handleRouteChange();
  }
}, { deep: true });

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
          <span @click="navigateToCrumb(crumb.path)">{{ crumb.label }}</span>
          <span v-if="index < breadcrumbs.length - 1">/</span>
        </template>
      </div>

      <div class="search-box">
        <Search class="search-icon" :size="16" :stroke-width="2" />
        <input
          type="text"
          v-model="search.query"
          placeholder="搜索文件..."
          @input="debouncedSearch"
          @keydown.escape="clearSearch"
        />
        <button
          v-if="search.query"
          class="search-clear"
          @click="clearSearch"
          aria-label="清除搜索"
        >
          <X :size="14" :stroke-width="2" />
        </button>
        <button
          class="search-mode"
          :class="{ active: search.recursive }"
          @click="toggleSearchRecursive"
          :title="search.recursive ? '递归搜索已开启' : '递归搜索已关闭'"
        >
          {{ search.recursive ? '递归' : '当前' }}
        </button>
      </div>

      <div class="search-status" v-if="search.isSearching">
        <template v-if="search.loading">
          搜索中...
        </template>
        <template v-else>
          找到 {{ search.results.length }} 个结果
        </template>
      </div>

      <div class="list">
        <template v-if="search.isSearching">
          <div v-if="!search.loading && search.results.length === 0" class="empty-result">
            未找到匹配的文件
          </div>
          <div
            v-for="entry in search.results"
            :key="entry.path"
            class="list-item"
            :class="{
              active: state.selected?.path === entry.path,
              'list-item--with-path': search.recursive && getRelativePath(entry)
            }"
            @click="selectEntry(entry)"
          >
            <component :is="fileIcon(entry)" class="file-icon" :size="18" :stroke-width="1.8" />
            <div class="file-meta">
              <strong class="file-name">{{ entry.name }}</strong>
              <span v-if="search.recursive && getRelativePath(entry)" class="file-path">
                {{ getRelativePath(entry) }}
              </span>
              <div class="file-info">
                <small>{{ entry.type === 'dir' ? '目录' : formatSize(entry.size) }}</small>
                <small>{{ formatDate(entry.modified) }}</small>
              </div>
            </div>
          </div>
        </template>
        <template v-else>
          <div
            v-for="entry in state.entries"
            :key="entry.path"
            class="list-item"
            :class="{ active: state.selected?.path === entry.path }"
            @click="selectEntry(entry)"
          >
            <component :is="fileIcon(entry)" class="file-icon" :size="18" :stroke-width="1.8" />
            <div class="file-meta">
              <strong class="file-name">{{ entry.name }}</strong>
              <div class="file-info">
                <small>{{ entry.type === 'dir' ? '目录' : formatSize(entry.size) }}</small>
                <small>{{ formatDate(entry.modified) }}</small>
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <section class="panel preview">
      <div v-if="!state.selected" class="empty">选择一个文件以开始预览</div>

      <template v-else>
        <div class="preview-meta">
          <strong>{{ state.selected.name }}</strong>
          <small class="preview-path">{{ formatPath(state.selected.path) }}</small>
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
