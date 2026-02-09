import MarkdownIt from 'markdown-it';
import DOMPurify from 'dompurify';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
});

export function renderMarkdown(content: string) {
  return DOMPurify.sanitize(markdown.render(content));
}

