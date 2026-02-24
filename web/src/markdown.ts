/**
 * Markdown 渲染模块
 *
 * 支持：
 * - 标准 Markdown 语法
 * - YAML Frontmatter 解析与渲染
 * - Wiki 链接转换（[[path|label]]）
 * - 反向链接转换（(label)[path]）
 * - XSS 防护（DOMPurify）
 */
import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

// 初始化 Markdown 解析器
const markdown = new MarkdownIt({
  html: false,    // 禁止内联 HTML
  linkify: false, // 不自动转换 URL 为链接
  breaks: true    // 换行符转换为 <br>
});

// 自定义链接渲染：添加 target="_blank" 和安全属性
markdown.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  token.attrSet('target', '_blank');
  token.attrSet('rel', 'noopener noreferrer');
  return self.renderToken(tokens, idx, options);
};

/** HTML 转义，防止 XSS */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * 解析 YAML Frontmatter
 * 格式：---\nkey: value\n---
 * 返回 frontmatter 对象和剩余正文
 */
function parseYamlFrontmatter(content: string): { frontmatter: Record<string, unknown>; body: string } | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return null;

  const yamlContent = match[1];
  const body = content.slice(match[0].length);
  const frontmatter: Record<string, unknown> = {};

  const lines = yamlContent.split('\n');
  let currentKey = '';

  for (const line of lines) {
    if (!line.trim()) continue;

    const arrayItemMatch = line.match(/^(\s*)-\s+(.+)$/);
    if (arrayItemMatch) {
      if (currentKey && Array.isArray(frontmatter[currentKey])) {
        (frontmatter[currentKey] as string[]).push(arrayItemMatch[2].trim());
      }
      continue;
    }

    const kvMatch = line.match(/^([^:]+):\s*(.*)$/);
    if (kvMatch) {
      currentKey = kvMatch[1].trim();
      const value = kvMatch[2].trim();
      if (value) {
        frontmatter[currentKey] = value;
      } else {
        frontmatter[currentKey] = [];
      }
    }
  }

  return { frontmatter, body };
}

/** 格式化 frontmatter 值（数组渲染为标签） */
function formatFrontmatterValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value.map(v => `<span class="fm-tag">${escapeHtml(String(v))}</span>`).join(' ');
  }
  return escapeHtml(String(value));
}

/** 将 frontmatter 渲染为 HTML */
function renderFrontmatter(frontmatter: Record<string, unknown>): string {
  const entries = Object.entries(frontmatter).filter(([_, v]) => {
    if (Array.isArray(v)) return v.length > 0;
    return v !== null && v !== undefined && v !== '';
  });

  if (entries.length === 0) return '';

  const items = entries.map(([key, value]) => {
    const isTag = key === 'tags' || (Array.isArray(value) && value.length > 1);
    const valueClass = isTag ? 'fm-value fm-tags' : 'fm-value';
    return `<div class="fm-item">
      <span class="fm-key">${escapeHtml(key)}</span>
      <span class="${valueClass}">${formatFrontmatterValue(value)}</span>
    </div>`;
  }).join('');

  return `<div class="fm-container">${items}</div>`;
}

/**
 * 转换 Obsidian 风格的 Wiki 链接
 * [[path]] 或 [[path|label]] -> <a data-file-path="path">label</a>
 */
function convertWikiLinks(html: string): string {
  return html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, label) => {
    const displayText = label || path.split('/').pop() || path;
    const escapedPath = escapeHtml(path);
    const escapedText = escapeHtml(displayText);
    return `<a href="javascript:void(0)" data-file-path="${escapedPath}" class="internal-link" title="${escapedPath}">${escapedText}</a>`;
  });
}

/**
 * 转换反向链接语法
 * (label)[path] -> <a data-file-path="path">label</a>
 */
function convertReverseLinks(html: string): string {
  return html.replace(/\(([^)]+)\)\[([^\]]+)\]/g, (_, label, path) => {
    const escapedPath = escapeHtml(path);
    const escapedLabel = escapeHtml(label);
    return `<a href="javascript:void(0)" data-file-path="${escapedPath}" class="internal-link" title="${escapedPath}">${escapedLabel}</a>`;
  });
}

/**
 * 渲染 Markdown 内容
 * 处理流程：解析 frontmatter -> 渲染 Markdown -> 转换内部链接 -> 净化 HTML
 */
export function renderMarkdown(content: string): string {
  const parsed = parseYamlFrontmatter(content);
  let body = parsed ? parsed.body : content;
  let fmHtml = '';

  if (parsed && Object.keys(parsed.frontmatter).length > 0) {
    fmHtml = renderFrontmatter(parsed.frontmatter);
  }

  let rendered = markdown.render(body);
  rendered = convertWikiLinks(rendered);
  rendered = convertReverseLinks(rendered);

  return DOMPurify.sanitize(fmHtml + rendered, {
    ADD_ATTR: ['target', 'rel', 'data-file-path']
  });
}
