<script setup lang="ts">
/**
 * 文件浏览器主组件
 *
 * 协调文件列表和预览面板，管理路由
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

// Composables
import { useTheme } from './composables/useTheme';
import { useFileBrowser } from './composables/useFileBrowser';
import { usePreview } from './composables/usePreview';

// Types and utilities
import { fileExtensionFromName, isImage, entryExtension, type FileEntry } from './file-types';

// Components
import AppHeader from './components/AppHeader.vue';
import Breadcrumbs from './components/Breadcrumbs.vue';
import SearchBox from './components/SearchBox.vue';
import FileList from './components/FileList.vue';
import PreviewPanel from './components/PreviewPanel.vue';

// Composables
const { theme, toggleTheme } = useTheme();
const {
  state,
  search,
  breadcrumbs,
  displayEntries,
  loadEntries,
  clearSearch,
  debouncedSearch,
  toggleSearchRecursive,
  selectEntry,
  setSelected,
  getRelativePath,
  resolveFilePath
} = useFileBrowser();

const {
  preview,
  previewCardRef,
  getPreviewMode,
  getPreviewHtml,
  previewReset,
  fetchPreview,
  loadChunk,
  setPreviewView,
  formatSize,
  formatDate,
  formatPath
} = usePreview();

// Router
const route = useRoute();
const router = useRouter();

// Preview maximized state
const previewMaximized = ref(false);

function togglePreviewMax() {
  previewMaximized.value = !previewMaximized.value;
}

// 预览模式（用于渲染 HTML）
const previewMode = computed(() => getPreviewMode(state.selected));
const previewHtml = computed(() => getPreviewHtml(state.selected, previewMode.value));

// 处理文件选择
async function handleSelectEntry(entry: FileEntry, updateRoute = true) {
  const isFile = await selectEntry(entry);
  if (!isFile) {
    // 目录导航
    if (updateRoute) {
      router.push({ path: '/', query: { dir: formatPath(state.currentPath) } });
    }
    return;
  }

  // 文件选择
  previewReset();
  if (updateRoute) {
    router.push({ path: '/', query: { dir: formatPath(state.currentPath), file: formatPath(entry.path) } });
  }

  // 图片不需要加载预览
  if (isImage(entryExtension(entry))) {
    return;
  }

  await fetchPreview(entry.path, entry);
}

// 处理内部链接点击
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

// 处理面包屑导航
function handleNavigate(path: string) {
  router.push({ path: '/', query: { dir: path } });
}

// 处理路由变化
async function handleRouteChange() {
  const dir = (route.query.dir as string) || '/';
  const file = route.query.file as string | undefined;

  await loadEntries(dir);

  if (file) {
    const entry = state.entries.find(e => e.path === file);
    if (entry) {
      await handleSelectEntry(entry, false);
    } else {
      // 文件不在当前目录，创建临时 entry
      const tempEntry: FileEntry = {
        name: file.split('/').pop() || file,
        path: file,
        type: 'file',
        size: 0,
        modified: '',
        extension: fileExtensionFromName(file)
      };
      setSelected(tempEntry);
      previewReset();
      if (!isImage(entryExtension(tempEntry))) {
        await fetchPreview(file, tempEntry);
      }
    }
  }
}

// 全局点击处理
const clickHandler = (e: Event) => handleInternalLinkClick(e);

// 生命周期
onMounted(async () => {
  document.addEventListener('click', clickHandler);
  state.initialized = true;
  await handleRouteChange();
});

onUnmounted(() => {
  document.removeEventListener('click', clickHandler);
});

// 监听路由变化
watch(() => route.query, () => {
  if (state.initialized) {
    handleRouteChange();
  }
}, { deep: true });
</script>

<template>
  <AppHeader :theme="theme" @toggle-theme="toggleTheme" />

  <div class="app-shell" :class="{ maximized: previewMaximized }">
    <section class="panel list-panel">
      <Breadcrumbs :path="state.currentPath" @navigate="handleNavigate" />

      <SearchBox
        v-model:query="search.query"
        :recursive="search.recursive"
        :loading="search.loading"
        @update:query="debouncedSearch"
        @toggle-recursive="toggleSearchRecursive"
        @clear="clearSearch"
        @search="debouncedSearch"
      />

      <div class="search-status" v-if="search.isSearching">
        <template v-if="search.loading">
          搜索中...
        </template>
        <template v-else>
          找到 {{ search.results.length }} 个结果
        </template>
      </div>

      <FileList
        :entries="displayEntries"
        :selected="state.selected"
        :search-mode="search.isSearching"
        :recursive="search.recursive"
        :loading="search.loading"
        :get-relative-path="getRelativePath"
        :format-size="formatSize"
        :format-date="formatDate"
        @select="handleSelectEntry"
      />
    </section>

    <PreviewPanel
      :entry="state.selected"
      :preview="preview"
      :maximized="previewMaximized"
      :format-size="formatSize"
      :format-date="formatDate"
      :format-path="formatPath"
      @load-chunk="() => loadChunk(state.selected)"
      @update:view="setPreviewView"
      @update:maximized="togglePreviewMax"
    />
  </div>
</template>
