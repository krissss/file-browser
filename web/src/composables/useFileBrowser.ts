/**
 * 文件浏览状态管理 composable
 *
 * 管理文件列表、搜索、选择等状态
 */
import { reactive, computed, ref } from 'vue';
import { fileExtensionFromName, isImage, type FileEntry } from '../file-types';

/** 获取 API URL（支持子路径部署） */
function apiUrl(path: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}${path}`.replace(/\/+/g, '/');
}

/** 文件浏览状态 */
export interface BrowserState {
  currentPath: string;
  entries: FileEntry[];
  selected: FileEntry | null;
  initialized: boolean;
}

/** 搜索状态 */
export interface SearchState {
  query: string;
  results: FileEntry[];
  isSearching: boolean;
  loading: boolean;
  recursive: boolean;
}

export function useFileBrowser() {
  const state = reactive<BrowserState>({
    currentPath: '/',
    entries: [],
    selected: null,
    initialized: false
  });

  const search = reactive<SearchState>({
    query: '',
    results: [],
    isSearching: false,
    loading: false,
    recursive: false
  });

  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  /** 面包屑导航 */
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

  /** 当前显示的条目（搜索结果或目录内容） */
  const displayEntries = computed(() => {
    return search.isSearching ? search.results : state.entries;
  });

  /** 加载目录内容 */
  async function loadEntries(path: string) {
    state.currentPath = path;
    const response = await fetch(apiUrl('/api/files?path=' + encodeURIComponent(path)));
    if (!response.ok) {
      throw new Error('无法加载目录');
    }
    const items: FileEntry[] = await response.json();
    state.entries = items.map((entry) => ({
      ...entry,
      extension: entry.extension || fileExtensionFromName(entry.name)
    }));
  }

  /** 清除搜索 */
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

  /** 执行搜索 */
  async function performSearch() {
    if (!search.query.trim()) {
      search.isSearching = false;
      search.results = [];
      return;
    }

    search.loading = true;
    search.isSearching = true;

    const recursiveParam = search.recursive ? 'true' : 'false';
    const response = await fetch(
      apiUrl('/api/search?path=' + encodeURIComponent(state.currentPath) + '&q=' + encodeURIComponent(search.query) + '&recursive=' + recursiveParam)
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

  /** 防抖搜索 */
  function debouncedSearch() {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);
  }

  /** 切换递归搜索 */
  function toggleSearchRecursive() {
    search.recursive = !search.recursive;
    if (search.query.trim()) {
      performSearch();
    }
  }

  /** 选择条目 */
  async function selectEntry(entry: FileEntry) {
    if (entry.type === 'dir') {
      clearSearch();
      await loadEntries(entry.path);
      return false; // 目录导航
    }
    state.selected = entry;
    return true; // 文件选择
  }

  /** 设置选中的条目 */
  function setSelected(entry: FileEntry | null) {
    state.selected = entry;
  }

  /** 获取相对路径（用于递归搜索结果显示） */
  function getRelativePath(entry: FileEntry): string {
    if (!search.recursive || !search.isSearching) return '';
    const basePath = state.currentPath === '/' ? '' : state.currentPath;
    let relPath = entry.path;
    if (relPath.startsWith(basePath)) {
      relPath = relPath.slice(basePath.length);
      if (relPath.startsWith('/')) relPath = relPath.slice(1);
    }

    const parts = relPath.split('/');
    if (entry.type === 'file' && parts.length > 1) {
      parts.pop();
    }

    if (parts.length === 0) return '';

    const fullPath = parts.join('/');
    const maxLen = 35;
    if (fullPath.length <= maxLen) {
      return fullPath;
    }

    const lastParts = parts.slice(-3).join('/');
    if (lastParts.length <= maxLen - 3) {
      return '.../' + lastParts;
    }

    const last2 = parts.slice(-2).join('/');
    return '.../' + last2;
  }

  /** 解析内部链接路径 */
  function resolveFilePath(linkPath: string): string {
    if (linkPath.startsWith('/')) {
      return linkPath;
    }
    const baseDir = state.selected
      ? state.selected.path.substring(0, state.selected.path.lastIndexOf('/'))
      : state.currentPath;
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

  return {
    state,
    search,
    breadcrumbs,
    displayEntries,
    loadEntries,
    clearSearch,
    performSearch,
    debouncedSearch,
    toggleSearchRecursive,
    selectEntry,
    setSelected,
    getRelativePath,
    resolveFilePath
  };
}
