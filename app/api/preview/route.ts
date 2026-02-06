import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

const ROOT_PATH = process.env.FILE_BROWSER_ROOT || '/Volumes/Kriss/kriss/projects/github.com/krissss/file-browser';

function isSafePath(path: string): boolean {
  const resolvedPath = join(ROOT_PATH, path);
  return resolvedPath.startsWith(ROOT_PATH);
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function isTextFile(extension: string): boolean {
  const textExtensions = [
    'txt', 'md', 'markdown', 'json', 'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
    'css', 'html', 'xml', 'yaml', 'yml', 'ini', 'conf',
    'py', 'rb', 'go', 'rs', 'java', 'c', 'cpp', 'h',
    'sh', 'bash', 'zsh', 'sql', 'graphql', 'toml',
    'env', 'gitignore', 'eslintrc', 'prettierrc',
    'lock', 'tsconfig', 'eslintrc', 'prettierrc'
  ];
  return textExtensions.includes(extension);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  // 安全检查
  if (!isSafePath(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = join(ROOT_PATH, path);

  try {
    const stats = await stat(fullPath);

    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 400 });
    }

    // 检查文件大小（限制预览 1MB）
    const MAX_PREVIEW_SIZE = 1024 * 1024; // 1MB
    if (stats.size > MAX_PREVIEW_SIZE) {
      return NextResponse.json({
        error: 'File too large',
        message: 'This file is too large to preview',
        size: stats.size,
      }, { status: 400 });
    }

    const extension = getFileExtension(path);

    // 检查是否为文本文件
    if (!isTextFile(extension)) {
      return NextResponse.json({
        error: 'Binary file',
        message: 'This file type cannot be previewed',
        type: extension,
      });
    }

    const content = await readFile(fullPath, 'utf-8');

    return NextResponse.json({
      path,
      name: path.split('/').pop() || '',
      content,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      type: extension,
    });
  } catch (error) {
    console.error('Error reading file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}
