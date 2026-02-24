/**
 * 代码语法高亮模块
 *
 * 使用 highlight.js 实现代码高亮，支持按需加载语言包
 */
import DOMPurify from 'dompurify';
import hljs from 'highlight.js/lib/common';

// 按需导入语言包（减少打包体积）
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import graphql from 'highlight.js/lib/languages/graphql';
import ini from 'highlight.js/lib/languages/ini';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import lua from 'highlight.js/lib/languages/lua';
import makefile from 'highlight.js/lib/languages/makefile';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import protobuf from 'highlight.js/lib/languages/protobuf';
import python from 'highlight.js/lib/languages/python';
import ruby from 'highlight.js/lib/languages/ruby';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import swift from 'highlight.js/lib/languages/swift';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

// 注册语言包到 highlight.js
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('cs', csharp);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('go', go);
hljs.registerLanguage('graphql', graphql);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('java', java);
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('json', json);
hljs.registerLanguage('kotlin', kotlin);
hljs.registerLanguage('lua', lua);
hljs.registerLanguage('makefile', makefile);
hljs.registerLanguage('php', php);
hljs.registerLanguage('plaintext', plaintext);
hljs.registerLanguage('protobuf', protobuf);
hljs.registerLanguage('python', python);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('swift', swift);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);

/** 已注册的语言列表，用于判断是否支持指定语言 */
const registeredLanguages = new Set([
  'bash', 'c', 'cpp', 'cs', 'dockerfile', 'go', 'graphql', 'ini',
  'java', 'javascript', 'json', 'kotlin', 'lua', 'makefile', 'php',
  'plaintext', 'protobuf', 'python', 'ruby', 'rust', 'sql', 'swift',
  'typescript', 'xml', 'yaml',
]);

/** 语言别名映射（扩展名 -> 语言名） */
const languageAliases: Record<string, string> = {
  yml: 'yaml',
  sh: 'bash',
  zsh: 'bash',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
  proto: 'protobuf',
  gql: 'graphql',
  kt: 'kotlin',
  kts: 'kotlin',
  html: 'xml',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hh: 'cpp',
  hpp: 'cpp',
  hxx: 'cpp',
  gitignore: 'ini',
  env: 'ini',
  conf: 'ini',
  toml: 'ini',
  properties: 'ini',
  eslintrc: 'json',
  prettierrc: 'json',
  tsconfig: 'json',
  lock: 'plaintext',
  gradle: 'plaintext',
  vue: 'plaintext',
  svelte: 'plaintext',
  astro: 'plaintext',
  scala: 'plaintext',
  dart: 'plaintext',
  r: 'plaintext',
  clj: 'plaintext',
  cljs: 'plaintext',
  cljc: 'plaintext',
  ps1: 'plaintext',
  psm1: 'plaintext',
  bat: 'plaintext',
  cmd: 'plaintext',
  css: 'plaintext',
  scss: 'plaintext',
  sass: 'plaintext',
  less: 'plaintext',
  styl: 'plaintext',
};

/**
 * 高亮页面中已渲染的 Markdown 代码块
 * 用于处理 Markdown-it 生成的 <pre><code> 元素
 */
export function highlightMarkdownBlocks(selector = '.markdown pre code') {
  const blocks = document.querySelectorAll(selector);
  blocks.forEach((block) => {
    hljs.highlightElement(block as HTMLElement);
  });
}

/**
 * 高亮代码内容并返回安全的 HTML
 * @param content 代码内容
 * @param lang 语言（可选），不指定则自动检测
 * @returns 包含高亮代码的 HTML 字符串
 */
export function highlightCode(content: string, lang?: string) {
  // 解析语言别名
  let resolvedLang = lang && languageAliases[lang] ? languageAliases[lang] : lang;

  // 未注册的语言回退到自动检测
  if (resolvedLang && !registeredLanguages.has(resolvedLang)) {
    resolvedLang = undefined;
  }

  // 执行高亮
  const highlighted = resolvedLang
    ? hljs.highlight(content, { language: resolvedLang }).value
    : hljs.highlightAuto(content).value;

  // 使用 DOMPurify 净化 HTML，防止 XSS 攻击
  return DOMPurify.sanitize(`<pre><code class="hljs">${highlighted}</code></pre>`);
}

