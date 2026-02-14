import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  breaks: true
});

markdown.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx];
  token.attrSet('target', '_blank');
  token.attrSet('rel', 'noopener noreferrer');
  return self.renderToken(tokens, idx, options);
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

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

function formatFrontmatterValue(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    return value.map(v => `<span class="fm-tag">${escapeHtml(String(v))}</span>`).join(' ');
  }
  return escapeHtml(String(value));
}

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

function convertWikiLinks(html: string): string {
  return html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, path, label) => {
    const displayText = label || path.split('/').pop() || path;
    const escapedPath = escapeHtml(path);
    const escapedText = escapeHtml(displayText);
    return `<a href="javascript:void(0)" data-file-path="${escapedPath}" class="internal-link" title="${escapedPath}">${escapedText}</a>`;
  });
}

function convertReverseLinks(html: string): string {
  return html.replace(/\(([^)]+)\)\[([^\]]+)\]/g, (_, label, path) => {
    const escapedPath = escapeHtml(path);
    const escapedLabel = escapeHtml(label);
    return `<a href="javascript:void(0)" data-file-path="${escapedPath}" class="internal-link" title="${escapedPath}">${escapedLabel}</a>`;
  });
}

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
