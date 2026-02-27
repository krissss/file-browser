/**
 * 主题管理 composable
 *
 * 管理亮色/暗色主题切换，持久化到 localStorage
 */
import { ref, onMounted } from 'vue';
import markdownLight from 'github-markdown-css/github-markdown-light.css?url';
import markdownDark from 'github-markdown-css/github-markdown-dark.css?url';

const hljsThemeId = 'hljs-theme';
const markdownThemeId = 'markdown-theme';

/** 设置 highlight.js 主题样式表 */
function setHljsTheme(theme: 'light' | 'dark') {
  const href = theme === 'dark' ? 'hljs-github-dark.css' : 'hljs-github.css';
  let link = document.getElementById(hljsThemeId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = hljsThemeId;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
}

/** 设置 Markdown 主题样式表 */
function setMarkdownTheme(theme: 'light' | 'dark') {
  const href = theme === 'dark' ? markdownDark : markdownLight;
  let link = document.getElementById(markdownThemeId) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = markdownThemeId;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = href;
}

export function useTheme() {
  const theme = ref<'light' | 'dark'>('light');

  /** 应用主题 */
  function applyTheme(next: 'light' | 'dark') {
    theme.value = next;
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('file-browser-theme', next);
    setHljsTheme(next);
    setMarkdownTheme(next);
  }

  /** 切换主题 */
  function toggleTheme() {
    applyTheme(theme.value === 'light' ? 'dark' : 'light');
  }

  /** 初始化主题（从 localStorage 恢复） */
  function initTheme() {
    const saved = localStorage.getItem('file-browser-theme');
    if (saved === 'dark' || saved === 'light') {
      applyTheme(saved);
    } else {
      applyTheme('light');
    }
  }

  onMounted(() => {
    initTheme();
  });

  return {
    theme,
    toggleTheme
  };
}
