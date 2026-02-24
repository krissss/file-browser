/**
 * 文件类型工具函数测试
 */
import { describe, it, expect } from 'vitest';
import {
  fileExtensionFromName,
  entryExtension,
  isMarkdown,
  isImage,
  isTextFile,
  isBinaryFile,
  isCode,
  fileIcon,
  type FileEntry
} from './file-types';
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
  FileTerminal,
  FileText,
  FileVideo,
  Folder
} from 'lucide-vue-next';

describe('fileExtensionFromName', () => {
  it('从简单文件名提取扩展名', () => {
    expect(fileExtensionFromName('test.txt')).toBe('txt');
    expect(fileExtensionFromName('app.ts')).toBe('ts');
    expect(fileExtensionFromName('index.html')).toBe('html');
  });

  it('处理多个点号的文件名', () => {
    expect(fileExtensionFromName('file.test.ts')).toBe('ts');
    expect(fileExtensionFromName('app.config.json')).toBe('json');
  });

  it('处理特殊文件（Dockerfile、Makefile）', () => {
    expect(fileExtensionFromName('Dockerfile')).toBe('dockerfile');
    expect(fileExtensionFromName('dockerfile.dev')).toBe('dockerfile');
    expect(fileExtensionFromName('Makefile')).toBe('makefile');
    expect(fileExtensionFromName('makefile.prod')).toBe('makefile');
  });

  it('处理隐藏文件', () => {
    expect(fileExtensionFromName('.gitignore')).toBe('gitignore');
    expect(fileExtensionFromName('.env')).toBe('env');
    expect(fileExtensionFromName('.env.local')).toBe('local');
  });

  it('处理无扩展名的文件', () => {
    expect(fileExtensionFromName('README')).toBe('');
    expect(fileExtensionFromName('file.')).toBe('');
    expect(fileExtensionFromName('.')).toBe('');
  });

  it('大小写不敏感', () => {
    expect(fileExtensionFromName('FILE.TXT')).toBe('txt');
    expect(fileExtensionFromName('DOCKERFILE')).toBe('dockerfile');
  });
});

describe('entryExtension', () => {
  it('优先返回显式指定的扩展名', () => {
    const entry: FileEntry = {
      name: 'test.txt',
      path: '/test.txt',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z',
      extension: 'custom'
    };
    expect(entryExtension(entry)).toBe('custom');
  });

  it('从文件名提取扩展名（未显式指定时）', () => {
    const entry: FileEntry = {
      name: 'test.ts',
      path: '/test.ts',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(entryExtension(entry)).toBe('ts');
  });
});

describe('isMarkdown', () => {
  it('识别 Markdown 扩展名', () => {
    expect(isMarkdown('md')).toBe(true);
    expect(isMarkdown('markdown')).toBe(true);
    expect(isMarkdown('MD')).toBe(true);
    expect(isMarkdown('MARKDOWN')).toBe(true);
  });

  it('非 Markdown 扩展名返回 false', () => {
    expect(isMarkdown('txt')).toBe(false);
    expect(isMarkdown('html')).toBe(false);
  });
});

describe('isImage', () => {
  it('识别图片扩展名', () => {
    expect(isImage('jpg')).toBe(true);
    expect(isImage('jpeg')).toBe(true);
    expect(isImage('png')).toBe(true);
    expect(isImage('gif')).toBe(true);
    expect(isImage('svg')).toBe(true);
    expect(isImage('webp')).toBe(true);
    expect(isImage('bmp')).toBe(true);
    expect(isImage('ico')).toBe(true);
  });

  it('非图片扩展名返回 false', () => {
    expect(isImage('txt')).toBe(false);
    expect(isImage('pdf')).toBe(false);
    expect(isImage('mp4')).toBe(false);
  });

  it('大小写不敏感', () => {
    expect(isImage('JPG')).toBe(true);
    expect(isImage('PNG')).toBe(true);
  });
});

describe('isTextFile', () => {
  it('识别文本文件扩展名', () => {
    expect(isTextFile('txt')).toBe(true);
    expect(isTextFile('md')).toBe(true);
    expect(isTextFile('json')).toBe(true);
    expect(isTextFile('js')).toBe(true);
    expect(isTextFile('ts')).toBe(true);
    expect(isTextFile('py')).toBe(true);
    expect(isTextFile('go')).toBe(true);
    expect(isTextFile('rs')).toBe(true);
    expect(isTextFile('html')).toBe(true);
    expect(isTextFile('css')).toBe(true);
  });

  it('非文本文件扩展名返回 false', () => {
    expect(isTextFile('exe')).toBe(false);
    expect(isTextFile('bin')).toBe(false);
    expect(isTextFile('dll')).toBe(false);
  });
});

describe('isBinaryFile', () => {
  it('图片文件返回 false（可预览）', () => {
    const entry: FileEntry = {
      name: 'image.png',
      path: '/image.png',
      type: 'file',
      size: 1000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(isBinaryFile(entry)).toBe(false);
  });

  it('文本文件返回 false', () => {
    const entry: FileEntry = {
      name: 'script.ts',
      path: '/script.ts',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(isBinaryFile(entry)).toBe(false);
  });

  it('二进制文件返回 true', () => {
    const entry: FileEntry = {
      name: 'program.exe',
      path: '/program.exe',
      type: 'file',
      size: 10000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(isBinaryFile(entry)).toBe(true);
  });
});

describe('isCode', () => {
  it('识别代码文件扩展名', () => {
    expect(isCode('js')).toBe(true);
    expect(isCode('ts')).toBe(true);
    expect(isCode('py')).toBe(true);
    expect(isCode('go')).toBe(true);
    expect(isCode('rs')).toBe(true);
    expect(isCode('java')).toBe(true);
    expect(isCode('c')).toBe(true);
    expect(isCode('cpp')).toBe(true);
  });

  it('特殊文件（Dockerfile、Makefile）识别为代码', () => {
    expect(isCode('', 'Dockerfile')).toBe(true);
    expect(isCode('', 'dockerfile.dev')).toBe(true);
    expect(isCode('', 'Makefile')).toBe(true);
    expect(isCode('', 'makefile.prod')).toBe(true);
  });

  it('非代码扩展名返回 false', () => {
    expect(isCode('exe')).toBe(false);
    expect(isCode('bin')).toBe(false);
  });
});

describe('fileIcon', () => {
  it('目录返回 Folder 图标', () => {
    const entry: FileEntry = {
      name: 'src',
      path: '/src',
      type: 'dir',
      size: 0,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(Folder);
  });

  it('图片文件返回 FileImage 图标', () => {
    const entry: FileEntry = {
      name: 'photo.png',
      path: '/photo.png',
      type: 'file',
      size: 1000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileImage);
  });

  it('JSON 文件返回 FileJson 图标', () => {
    const entry: FileEntry = {
      name: 'package.json',
      path: '/package.json',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileJson);
  });

  it('音频文件返回 FileAudio 图标', () => {
    const entry: FileEntry = {
      name: 'music.mp3',
      path: '/music.mp3',
      type: 'file',
      size: 5000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileAudio);
  });

  it('视频文件返回 FileVideo 图标', () => {
    const entry: FileEntry = {
      name: 'video.mp4',
      path: '/video.mp4',
      type: 'file',
      size: 10000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileVideo);
  });

  it('压缩文件返回 FileArchive 图标', () => {
    const entry: FileEntry = {
      name: 'archive.zip',
      path: '/archive.zip',
      type: 'file',
      size: 1000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileArchive);
  });

  it('未知文件类型返回 File 图标', () => {
    const entry: FileEntry = {
      name: 'unknown.xyz',
      path: '/unknown.xyz',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(File);
  });

  it('TypeScript 文件返回 FileCode2 图标', () => {
    const entry: FileEntry = {
      name: 'app.ts',
      path: '/app.ts',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileCode2);
  });

  it('Dockerfile 返回 FileCog 图标', () => {
    const entry: FileEntry = {
      name: 'Dockerfile',
      path: '/Dockerfile',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileCog);
  });
});
