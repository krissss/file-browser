/**
 * 文件类型识别与图标映射
 *
 * 根据文件扩展名识别文件类型，并返回对应的 Lucide 图标组件
 */
import {
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileCode2,
  FileCog,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileSliders,
  FileTerminal,
  FileText,
  FileType,
  FileType2,
  FileVideo,
  Folder
} from 'lucide-vue-next';
import type { Component } from 'vue';

/** 文件/目录条目，对应后端 API 返回的数据结构 */
export type FileEntry = {
  name: string;          // 文件名
  path: string;          // 相对路径
  type: 'file' | 'dir';  // 类型：文件或目录
  extension?: string;    // 扩展名（可选）
  size: number;          // 文件大小（字节）
  modified: string;      // 修改时间（RFC3339 格式）
};

/**
 * 从文件名提取扩展名
 * 特殊处理：Dockerfile、Makefile、隐藏文件（如 .gitignore）
 */
export function fileExtensionFromName(name: string) {
  const lower = name.toLowerCase();
  // 特殊文件：Dockerfile 和 Makefile 系列
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'dockerfile';
  if (lower === 'makefile' || lower.startsWith('makefile.')) return 'makefile';
  // 隐藏文件（如 .gitignore, .env）
  if (lower.startsWith('.') && !lower.slice(1).includes('.')) {
    return lower.slice(1);
  }
  // 常规扩展名提取
  const idx = lower.lastIndexOf('.');
  if (idx <= 0 || idx === lower.length - 1) return '';
  return lower.slice(idx + 1);
}

/** 获取条目的扩展名，优先使用显式指定的扩展名 */
export function entryExtension(entry: FileEntry) {
  return entry.extension || fileExtensionFromName(entry.name);
}

/** 判断是否为 Markdown 文件 */
export function isMarkdown(ext: string) {
  return ['md', 'markdown'].includes(ext.toLowerCase());
}

/** 判断是否为图片文件 */
export function isImage(ext: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext.toLowerCase());
}

/** 判断是否为文本文件（可在浏览器中预览） */
export function isTextFile(ext: string) {
  return [
    'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'css', 'html', 'xml', 'yaml', 'yml', 'ini', 'conf',
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h',
    'sh', 'bash', 'zsh', 'sql', 'graphql', 'gql', 'toml',
    'env', 'gitignore', 'eslintrc', 'prettierrc',
    'lock', 'tsconfig', 'dockerfile', 'makefile',
    'proto', 'vue', 'svelte', 'astro',
    'cs', 'kt', 'kts', 'swift', 'php', 'lua', 'scala', 'groovy',
    'clj', 'cljs', 'cljc', 'gradle', 'properties'
  ].includes(ext.toLowerCase());
}

/** 判断是否为二进制文件（图片除外，图片可预览） */
export function isBinaryFile(entry: FileEntry) {
  const ext = entryExtension(entry);
  if (isImage(ext)) return false;
  return !isTextFile(ext);
}

/** 判断是否为代码文件（需要语法高亮） */
export function isCode(ext: string, name?: string) {
  const lowerName = name ? name.toLowerCase() : '';
  if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile.')) return true;
  if (lowerName === 'makefile' || lowerName.startsWith('makefile.')) return true;
  return [
    'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'py', 'rb', 'go', 'rs', 'java',
    'c', 'cc', 'cpp', 'cxx', 'h', 'hh', 'hpp', 'hxx', 'm', 'mm',
    'cs', 'kt', 'kts', 'swift', 'php', 'lua', 'scala', 'groovy',
    'clj', 'cljs', 'cljc', 'dart', 'r', 'rs', 'swift', 'kt', 'kts',
    'css', 'scss', 'sass', 'less', 'styl',
    'html', 'xml', 'yaml', 'yml', 'json', 'toml', 'ini', 'conf',
    'sh', 'bash', 'zsh', 'ps1', 'psm1', 'bat', 'cmd',
    'sql', 'dockerfile', 'proto', 'graphql', 'gql', 'vue', 'svelte', 'astro',
    'env', 'gitignore', 'eslintrc', 'prettierrc', 'lock', 'tsconfig',
    'gradle', 'properties', 'makefile'
  ].includes(ext.toLowerCase());
}

/** 按扩展名映射代码文件图标 */
const codeIconByExt: Record<string, Component> = {
  js: FileCode,
  jsx: FileCode,
  mjs: FileCode,
  cjs: FileCode,
  ts: FileCode2,
  tsx: FileCode2,
  go: FileCode2,
  rs: FileCode2,
  py: FileCode,
  rb: FileCode,
  php: FileCode,
  lua: FileCode,
  java: FileCode2,
  c: FileCode2,
  cc: FileCode2,
  cpp: FileCode2,
  cxx: FileCode2,
  h: FileCode2,
  hh: FileCode2,
  hpp: FileCode2,
  hxx: FileCode2,
  cs: FileCode2,
  kt: FileCode2,
  kts: FileCode2,
  swift: FileCode2,
  scala: FileCode2,
  groovy: FileCode2,
  clj: FileCode2,
  cljs: FileCode2,
  cljc: FileCode2,
  dart: FileCode2,
  r: FileCode2,
  sql: FileCode,
  sh: FileTerminal,
  bash: FileTerminal,
  zsh: FileTerminal,
  ps1: FileTerminal,
  psm1: FileTerminal,
  bat: FileTerminal,
  cmd: FileTerminal,
  html: FileType,
  xml: FileType,
  vue: FileType,
  svelte: FileType,
  astro: FileType,
  css: FileType2,
  scss: FileType2,
  sass: FileType2,
  less: FileType2,
  styl: FileType2,
  yaml: FileSliders,
  yml: FileSliders,
  toml: FileSliders,
  ini: FileSliders,
  conf: FileSliders,
  env: FileSliders,
  properties: FileSliders,
  gradle: FileSliders,
  dockerfile: FileCog,
  makefile: FileCog,
  proto: FileCode2,
  gql: FileCode,
  graphql: FileCode
};

/**
 * 根据文件条目返回对应的图标组件
 * 优先级：目录 > 图片 > Markdown > JSON > 代码图标映射 > 通用代码 > 其他类型
 */
export function fileIcon(entry: FileEntry) {
  if (entry.type === 'dir') return Folder;
  const ext = entryExtension(entry).toLowerCase();
  const name = entry.name.toLowerCase();

  // 特殊文件类型
  if (isImage(ext)) return FileImage;
  if (isMarkdown(ext)) return FileText;
  if (ext === 'json') return FileJson;

  // 代码文件：优先使用精确映射
  const codeIcon = codeIconByExt[ext];
  if (codeIcon) return codeIcon;
  if (isCode(ext, name)) return FileCode2;

  // 其他文件类型
  if (['csv', 'tsv', 'xls', 'xlsx'].includes(ext)) return FileSpreadsheet;
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return FileAudio;
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext)) return FileVideo;
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return FileArchive;

  // 默认图标
  return File;
}
