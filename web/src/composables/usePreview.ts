/**
 * 文件预览状态管理 composable
 *
 * 管理文件预览内容、分页加载等
 */
import { reactive, computed, ref, nextTick } from 'vue';
import { renderMarkdown } from '../markdown';
import { highlightCode, highlightMarkdownBlocks } from '../highlight';
import { entryExtension, isBinaryFile, isCode, isImage, isMarkdown, type FileEntry } from '../file-types';
import { apiUrl } from '../api';

/** 预览状态 */
export interface PreviewState {
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
}

const chunkSize = 64 * 1024;

export function usePreview() {
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

  const previewCardRef = ref<HTMLElement | null>(null);

  /** 预览模式 */
  function getPreviewMode(entry: FileEntry | null): 'none' | 'image' | 'markdown' | 'code' | 'text' {
    if (!entry) return 'none';
    const ext = entryExtension(entry).toLowerCase();
    if (isImage(ext)) return 'image';
    if (isMarkdown(ext)) return 'markdown';
    if (isCode(ext, entry.name)) return 'code';
    return 'text';
  }

  /** 预览 HTML（渲染模式） */
  function getPreviewHtml(entry: FileEntry | null, mode: string): string {
    if (mode === 'markdown') {
      return renderMarkdown(preview.content);
    }
    if (mode === 'code') {
      const lang = codeLanguage(entry);
      return highlightCode(preview.content, lang);
    }
    return '';
  }

  /** 获取代码语言 */
  function codeLanguage(file: FileEntry | null): string {
    if (!file) return '';
    const name = file.name.toLowerCase();
    if (name === 'dockerfile' || name.startsWith('dockerfile.')) return 'dockerfile';
    if (name === 'makefile' || name.startsWith('makefile.')) return 'makefile';
    return entryExtension(file).toLowerCase() || 'plaintext';
  }

  /** 重置预览状态 */
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

  /** 获取预览内容 */
  async function fetchPreview(path: string, selectedEntry: FileEntry, append = false) {
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
      ? apiUrl('/api/preview?path=' + encodeURIComponent(path) + '&offset=' + offset + '&limit=' + (limit || chunkSize))
      : apiUrl('/api/preview?path=' + encodeURIComponent(path));

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
    preview.isBinary = isBinaryFile(selectedEntry);
    preview.loading = false;
    preview.appending = false;

    // 更新 entry 的大小和时间
    if (!append) {
      if (payload.size !== undefined) {
        selectedEntry.size = payload.size;
      }
      if (payload.modified) {
        selectedEntry.modified = payload.modified;
      }
    }

    if (append && previewCard) {
      requestAnimationFrame(() => {
        previewCard.scrollTop = prevScrollTop;
      });
    }
  }

  /** 加载更多内容 */
  async function loadChunk(selectedEntry: FileEntry | null) {
    if (!selectedEntry) return;
    await fetchPreview(selectedEntry.path, selectedEntry, true);
  }

  /** 设置预览视图模式 */
  function setPreviewView(view: 'render' | 'raw') {
    preview.view = view;
  }

  /** 应用代码高亮（Markdown 中的代码块） */
  function applyCodeHighlight(entry: FileEntry | null) {
    if (preview.view !== 'render') return;
    if (getPreviewMode(entry) !== 'markdown') return;
    nextTick(() => {
      highlightMarkdownBlocks();
    });
  }

  /** 下载链接 */
  function getDownloadUrl(entry: FileEntry | null): string | null {
    if (!entry || entry.type !== 'file') return null;
    return `/api/download?path=${encodeURIComponent(entry.path)}`;
  }

  /** 图片链接 */
  function getImageUrl(entry: FileEntry | null): string | undefined {
    if (!entry || entry.type !== 'file') return undefined;
    if (!isImage(entryExtension(entry))) return undefined;
    return `/api/image?path=${encodeURIComponent(entry.path)}`;
  }

  /** 格式化文件大小 */
  function formatSize(size: number): string {
    if (!size && size !== 0) return '-';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  /** 格式化日期 */
  function formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  }

  /** 格式化路径 */
  function formatPath(path: string): string {
    return path.replace(/^\/+/, '/');
  }

  return {
    preview,
    previewCardRef,
    getPreviewMode,
    getPreviewHtml,
    previewReset,
    fetchPreview,
    loadChunk,
    setPreviewView,
    applyCodeHighlight,
    getDownloadUrl,
    getImageUrl,
    formatSize,
    formatDate,
    formatPath
  };
}
