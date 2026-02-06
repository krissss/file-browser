import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

// 安全的根路径 - 限制在项目目录内
const ROOT_PATH = process.env.FILE_BROWSER_ROOT || '/Volumes/Kriss/kriss/projects/github.com/krissss/file-browser';

// 安全检查：防止路径遍历攻击
function isSafePath(path: string): boolean {
  const resolvedPath = join(ROOT_PATH, path);
  return resolvedPath.startsWith(ROOT_PATH);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path') || '/';

  // 安全检查
  if (!isSafePath(path)) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
  }

  const fullPath = join(ROOT_PATH, path);

  try {
    const entries = await readdir(fullPath, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const entryPath = join(fullPath, entry.name);
        const stats = await stat(entryPath);

        return {
          name: entry.name,
          path: join(path, entry.name).replace(/\\/g, '/'),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? stats.size : undefined,
          modified: stats.mtime.toISOString(),
        };
      })
    );

    // 排序：目录优先，然后按名称
    items.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error reading directory:', error);
    return NextResponse.json(
      { error: 'Failed to read directory' },
      { status: 500 }
    );
  }
}
