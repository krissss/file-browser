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
  it('should extract extension from simple filename', () => {
    expect(fileExtensionFromName('test.txt')).toBe('txt');
    expect(fileExtensionFromName('app.ts')).toBe('ts');
    expect(fileExtensionFromName('index.html')).toBe('html');
  });

  it('should handle multiple dots', () => {
    expect(fileExtensionFromName('file.test.ts')).toBe('ts');
    expect(fileExtensionFromName('app.config.json')).toBe('json');
  });

  it('should handle special files', () => {
    expect(fileExtensionFromName('Dockerfile')).toBe('dockerfile');
    expect(fileExtensionFromName('dockerfile.dev')).toBe('dockerfile');
    expect(fileExtensionFromName('Makefile')).toBe('makefile');
    expect(fileExtensionFromName('makefile.prod')).toBe('makefile');
  });

  it('should handle hidden files', () => {
    expect(fileExtensionFromName('.gitignore')).toBe('gitignore');
    expect(fileExtensionFromName('.env')).toBe('env');
    expect(fileExtensionFromName('.env.local')).toBe('local');
  });

  it('should handle files without extension', () => {
    expect(fileExtensionFromName('README')).toBe('');
    expect(fileExtensionFromName('file.')).toBe('');
    expect(fileExtensionFromName('.')).toBe('');
  });

  it('should be case insensitive', () => {
    expect(fileExtensionFromName('FILE.TXT')).toBe('txt');
    expect(fileExtensionFromName('DOCKERFILE')).toBe('dockerfile');
  });
});

describe('entryExtension', () => {
  it('should return explicit extension if present', () => {
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

  it('should extract extension from name if not provided', () => {
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
  it('should return true for markdown extensions', () => {
    expect(isMarkdown('md')).toBe(true);
    expect(isMarkdown('markdown')).toBe(true);
    expect(isMarkdown('MD')).toBe(true);
    expect(isMarkdown('MARKDOWN')).toBe(true);
  });

  it('should return false for non-markdown extensions', () => {
    expect(isMarkdown('txt')).toBe(false);
    expect(isMarkdown('html')).toBe(false);
  });
});

describe('isImage', () => {
  it('should return true for image extensions', () => {
    expect(isImage('jpg')).toBe(true);
    expect(isImage('jpeg')).toBe(true);
    expect(isImage('png')).toBe(true);
    expect(isImage('gif')).toBe(true);
    expect(isImage('svg')).toBe(true);
    expect(isImage('webp')).toBe(true);
    expect(isImage('bmp')).toBe(true);
    expect(isImage('ico')).toBe(true);
  });

  it('should return false for non-image extensions', () => {
    expect(isImage('txt')).toBe(false);
    expect(isImage('pdf')).toBe(false);
    expect(isImage('mp4')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isImage('JPG')).toBe(true);
    expect(isImage('PNG')).toBe(true);
  });
});

describe('isTextFile', () => {
  it('should return true for text file extensions', () => {
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

  it('should return false for non-text file extensions', () => {
    expect(isTextFile('exe')).toBe(false);
    expect(isTextFile('bin')).toBe(false);
    expect(isTextFile('dll')).toBe(false);
  });
});

describe('isBinaryFile', () => {
  it('should return false for image files', () => {
    const entry: FileEntry = {
      name: 'image.png',
      path: '/image.png',
      type: 'file',
      size: 1000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(isBinaryFile(entry)).toBe(false);
  });

  it('should return false for text files', () => {
    const entry: FileEntry = {
      name: 'script.ts',
      path: '/script.ts',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(isBinaryFile(entry)).toBe(false);
  });

  it('should return true for binary files', () => {
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
  it('should return true for code extensions', () => {
    expect(isCode('js')).toBe(true);
    expect(isCode('ts')).toBe(true);
    expect(isCode('py')).toBe(true);
    expect(isCode('go')).toBe(true);
    expect(isCode('rs')).toBe(true);
    expect(isCode('java')).toBe(true);
    expect(isCode('c')).toBe(true);
    expect(isCode('cpp')).toBe(true);
  });

  it('should return true for special files', () => {
    expect(isCode('', 'Dockerfile')).toBe(true);
    expect(isCode('', 'dockerfile.dev')).toBe(true);
    expect(isCode('', 'Makefile')).toBe(true);
    expect(isCode('', 'makefile.prod')).toBe(true);
  });

  it('should return false for non-code extensions', () => {
    expect(isCode('exe')).toBe(false);
    expect(isCode('bin')).toBe(false);
  });
});

describe('fileIcon', () => {
  it('should return Folder for directories', () => {
    const entry: FileEntry = {
      name: 'src',
      path: '/src',
      type: 'dir',
      size: 0,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(Folder);
  });

  it('should return FileImage for image files', () => {
    const entry: FileEntry = {
      name: 'photo.png',
      path: '/photo.png',
      type: 'file',
      size: 1000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileImage);
  });

  it('should return FileJson for JSON files', () => {
    const entry: FileEntry = {
      name: 'package.json',
      path: '/package.json',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileJson);
  });

  it('should return FileAudio for audio files', () => {
    const entry: FileEntry = {
      name: 'music.mp3',
      path: '/music.mp3',
      type: 'file',
      size: 5000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileAudio);
  });

  it('should return FileVideo for video files', () => {
    const entry: FileEntry = {
      name: 'video.mp4',
      path: '/video.mp4',
      type: 'file',
      size: 10000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileVideo);
  });

  it('should return FileArchive for archive files', () => {
    const entry: FileEntry = {
      name: 'archive.zip',
      path: '/archive.zip',
      type: 'file',
      size: 1000,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileArchive);
  });

  it('should return File for unknown file types', () => {
    const entry: FileEntry = {
      name: 'unknown.xyz',
      path: '/unknown.xyz',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(File);
  });

  it('should return correct icon for TypeScript files', () => {
    const entry: FileEntry = {
      name: 'app.ts',
      path: '/app.ts',
      type: 'file',
      size: 100,
      modified: '2024-01-01T00:00:00Z'
    };
    expect(fileIcon(entry)).toBe(FileCode2);
  });

  it('should return FileCog for Dockerfile', () => {
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
