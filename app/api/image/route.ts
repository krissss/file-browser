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

function isImageFile(extension: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];
  return imageExtensions.includes(extension);
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

    const extension = getFileExtension(path);

    // 检查是否为图片文件
    if (!isImageFile(extension)) {
      return NextResponse.json({ error: 'Not an image file' }, { status: 400 });
    }

    // 读取图片文件
    const imageBuffer = await readFile(fullPath);

    // 设置正确的 Content-Type
    const contentTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'webp': 'image/webp',
      'bmp': 'image/bmp',
      'ico': 'image/x-icon',
    };

    const contentType = contentTypes[extension] || 'image/jpeg';

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error reading image:', error);
    return NextResponse.json(
      { error: 'Failed to read image' },
      { status: 500 }
    );
  }
}
