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

export type FileEntry = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  extension?: string;
  size: number;
  modified: string;
};

export function fileExtensionFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower === 'dockerfile' || lower.startsWith('dockerfile.')) return 'dockerfile';
  if (lower === 'makefile' || lower.startsWith('makefile.')) return 'makefile';
  if (lower.startsWith('.') && !lower.slice(1).includes('.')) {
    return lower.slice(1);
  }
  const idx = lower.lastIndexOf('.');
  if (idx <= 0 || idx === lower.length - 1) return '';
  return lower.slice(idx + 1);
}

export function entryExtension(entry: FileEntry) {
  return entry.extension || fileExtensionFromName(entry.name);
}

export function isMarkdown(ext: string) {
  return ['md', 'markdown'].includes(ext.toLowerCase());
}

export function isImage(ext: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(ext.toLowerCase());
}

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

export function isBinaryFile(entry: FileEntry) {
  const ext = entryExtension(entry);
  if (isImage(ext)) return false;
  return !isTextFile(ext);
}

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

export function fileIcon(entry: FileEntry) {
  if (entry.type === 'dir') return Folder;
  const ext = entryExtension(entry).toLowerCase();
  const name = entry.name.toLowerCase();
  if (isImage(ext)) return FileImage;
  if (isMarkdown(ext)) return FileText;
  if (ext === 'json') return FileJson;
  const codeIcon = codeIconByExt[ext];
  if (codeIcon) return codeIcon;
  if (isCode(ext, name)) return FileCode2;
  if (['csv', 'tsv', 'xls', 'xlsx'].includes(ext)) return FileSpreadsheet;
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return FileAudio;
  if (['mp4', 'mov', 'mkv', 'avi', 'webm'].includes(ext)) return FileVideo;
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) return FileArchive;
  return File;
}
