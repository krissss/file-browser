/**
 * Markdown 渲染功能测试
 */
import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('渲染基本 Markdown', () => {
    const result = renderMarkdown('# Hello World');
    expect(result).toContain('<h1');
    expect(result).toContain('Hello World');
  });

  it('渲染段落', () => {
    const result = renderMarkdown('This is a paragraph.');
    expect(result).toContain('<p>');
    expect(result).toContain('This is a paragraph.');
  });

  it('链接添加 target="_blank" 属性', () => {
    const result = renderMarkdown('[Example](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('渲染粗体和斜体', () => {
    const result = renderMarkdown('**bold** and *italic*');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('渲染代码块', () => {
    const result = renderMarkdown('```\ncode here\n```');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
  });

  it('渲染行内代码', () => {
    const result = renderMarkdown('Use `console.log` for debugging');
    expect(result).toContain('<code>');
    expect(result).toContain('console.log');
  });

  it('渲染无序列表', () => {
    const result = renderMarkdown('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('渲染有序列表', () => {
    const result = renderMarkdown('1. First\n2. Second');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>');
  });

  it('渲染引用块', () => {
    const result = renderMarkdown('> This is a quote');
    expect(result).toContain('<blockquote>');
  });

  it('处理 YAML Frontmatter', () => {
    const result = renderMarkdown('---\ntitle: Test\n---\n# Content');
    expect(result).toContain('fm-container');
    expect(result).toContain('fm-key');
    expect(result).toContain('title');
  });

  it('渲染 frontmatter 标签为数组', () => {
    const result = renderMarkdown('---\ntags:\n  - tag1\n  - tag2\n---\nContent');
    expect(result).toContain('fm-tag');
    expect(result).toContain('tag1');
    expect(result).toContain('tag2');
  });

  it('转换 Wiki 链接', () => {
    const result = renderMarkdown('[[path/to/file|Display Text]]');
    expect(result).toContain('internal-link');
    expect(result).toContain('data-file-path="path/to/file"');
    expect(result).toContain('Display Text');
  });

  it('转换无标签的 Wiki 链接', () => {
    const result = renderMarkdown('[[path/to/file]]');
    expect(result).toContain('internal-link');
    expect(result).toContain('data-file-path="path/to/file"');
    expect(result).toContain('file'); // 使用文件名作为显示文本
  });

  it('转换反向链接', () => {
    const result = renderMarkdown('(Label)[file/path]');
    expect(result).toContain('internal-link');
    expect(result).toContain('data-file-path="file/path"');
    expect(result).toContain('Label');
  });

  it('净化 HTML 内容（XSS 防护）', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    // DOMPurify 转义 script 标签但保留文本内容
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('处理换行符', () => {
    const result = renderMarkdown('Line 1\nLine 2');
    // markdown-it 配置 breaks: true 时，单个换行符转换为 <br>
    expect(result).toContain('<br');
  });

  it('处理空内容', () => {
    const result = renderMarkdown('');
    expect(result).toBe('');
  });

  it('渲染各级标题', () => {
    expect(renderMarkdown('## Heading 2')).toContain('<h2');
    expect(renderMarkdown('### Heading 3')).toContain('<h3');
    expect(renderMarkdown('#### Heading 4')).toContain('<h4');
  });

  it('渲染水平分割线', () => {
    const result = renderMarkdown('---\n\nSome text');
    // 注意：开头的 --- 可能被解析为 frontmatter
    const result2 = renderMarkdown('Text\n\n---\n\nMore text');
    expect(result2).toContain('<hr');
  });

  it('渲染表格', () => {
    const result = renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(result).toContain('<table>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
  });
});
