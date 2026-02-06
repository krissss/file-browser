import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

const ROOT_PATH = process.env.FILE_BROWSER_ROOT || '/Volumes/Kriss/kriss/projects/github.com/krissss/file-browser';

function isSafePath(path: string): boolean {
  const resolvedPath = join(ROOT_PATH, path);
  return resolvedPath.startsWith(ROOT_PATH);
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

    // 读取文件
    const fileBuffer = await readFile(fullPath);

    // 获取文件名
    const fileName = path.split('/').pop() || 'download';

    // 返回文件
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': stats.size.toString(),
      },
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return NextResponse.json(
      { error: 'Failed to download file' },
      { status: 500 }
    );
  }
}
