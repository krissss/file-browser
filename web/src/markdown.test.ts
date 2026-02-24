import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('should render basic markdown', () => {
    const result = renderMarkdown('# Hello World');
    expect(result).toContain('<h1');
    expect(result).toContain('Hello World');
  });

  it('should render paragraphs', () => {
    const result = renderMarkdown('This is a paragraph.');
    expect(result).toContain('<p>');
    expect(result).toContain('This is a paragraph.');
  });

  it('should render links with target="_blank"', () => {
    const result = renderMarkdown('[Example](https://example.com)');
    expect(result).toContain('href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('should render bold and italic text', () => {
    const result = renderMarkdown('**bold** and *italic*');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('should render code blocks', () => {
    const result = renderMarkdown('```\ncode here\n```');
    expect(result).toContain('<pre>');
    expect(result).toContain('<code>');
  });

  it('should render inline code', () => {
    const result = renderMarkdown('Use `console.log` for debugging');
    expect(result).toContain('<code>');
    expect(result).toContain('console.log');
  });

  it('should render lists', () => {
    const result = renderMarkdown('- Item 1\n- Item 2');
    expect(result).toContain('<ul>');
    expect(result).toContain('<li>');
  });

  it('should render ordered lists', () => {
    const result = renderMarkdown('1. First\n2. Second');
    expect(result).toContain('<ol>');
    expect(result).toContain('<li>');
  });

  it('should render blockquotes', () => {
    const result = renderMarkdown('> This is a quote');
    expect(result).toContain('<blockquote>');
  });

  it('should handle YAML frontmatter', () => {
    const result = renderMarkdown('---\ntitle: Test\n---\n# Content');
    expect(result).toContain('fm-container');
    expect(result).toContain('fm-key');
    expect(result).toContain('title');
  });

  it('should render frontmatter tags as array', () => {
    const result = renderMarkdown('---\ntags:\n  - tag1\n  - tag2\n---\nContent');
    expect(result).toContain('fm-tag');
    expect(result).toContain('tag1');
    expect(result).toContain('tag2');
  });

  it('should convert wiki links', () => {
    const result = renderMarkdown('[[path/to/file|Display Text]]');
    expect(result).toContain('internal-link');
    expect(result).toContain('data-file-path="path/to/file"');
    expect(result).toContain('Display Text');
  });

  it('should convert wiki links without label', () => {
    const result = renderMarkdown('[[path/to/file]]');
    expect(result).toContain('internal-link');
    expect(result).toContain('data-file-path="path/to/file"');
    expect(result).toContain('file'); // Uses filename as display text
  });

  it('should convert reverse links', () => {
    const result = renderMarkdown('(Label)[file/path]');
    expect(result).toContain('internal-link');
    expect(result).toContain('data-file-path="file/path"');
    expect(result).toContain('Label');
  });

  it('should sanitize HTML content', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    // DOMPurify escapes the script tags but keeps the text content
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle line breaks', () => {
    const result = renderMarkdown('Line 1\nLine 2');
    // markdown-it with breaks: true converts single newlines to <br>
    expect(result).toContain('<br');
  });

  it('should handle empty content', () => {
    const result = renderMarkdown('');
    expect(result).toBe('');
  });

  it('should render headings correctly', () => {
    expect(renderMarkdown('## Heading 2')).toContain('<h2');
    expect(renderMarkdown('### Heading 3')).toContain('<h3');
    expect(renderMarkdown('#### Heading 4')).toContain('<h4');
  });

  it('should render horizontal rules', () => {
    const result = renderMarkdown('---\n\nSome text');
    // Note: First --- might be parsed as frontmatter if empty
    const result2 = renderMarkdown('Text\n\n---\n\nMore text');
    expect(result2).toContain('<hr');
  });

  it('should render tables', () => {
    const result = renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |');
    expect(result).toContain('<table>');
    expect(result).toContain('<th>');
    expect(result).toContain('<td>');
  });
});
