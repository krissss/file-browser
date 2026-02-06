'use client';

import { useState, useEffect } from 'react';
import SimpleFileList from '@/components/SimpleFileList';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  extension?: string;
  size?: number;
  modified?: string;
}

export default function Home() {
  const [selectedPath, setSelectedPath] = useState<string>('/');
  const [isDark, setIsDark] = useState(false); // 默认明亮模式
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    if (stored) {
      setIsDark(stored === 'dark');
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Load files from API
  useEffect(() => {
    loadFiles(selectedPath);
  }, [selectedPath]);

  const loadFiles = async (path: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);

      if (!response.ok) {
        throw new Error('Failed to load files');
      }

      const data: FileNode[] = await response.json();

      // Add extension to file nodes
      const filesWithExtension = data.map(file => ({
        ...file,
        extension: file.type === 'file' ? file.name.split('.').pop() : undefined,
      }));

      setFiles(filesWithExtension);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load directory');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePathChange = (newPath: string) => {
    setSelectedPath(newPath);
  };

  return (
    <div className="fixed inset-0 flex flex-col min-h-dvh">
      {/* Header */}
      <header className="flex-none border-b" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                File Browser
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="flex items-center justify-center w-9 h-9 rounded-md transition-colors hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
              aria-label="Toggle theme"
            >
              {isDark ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="flex-none border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 py-3 overflow-x-auto">
            <button
              onClick={() => setSelectedPath('/')}
              className="text-sm transition-colors hover:opacity-70"
              style={{ color: selectedPath === '/' ? 'var(--text-primary)' : 'var(--text-secondary)' }}
            >
              Root
            </button>
            {selectedPath.split('/').filter(Boolean).map((segment, index, array) => (
              <div key={index} className="flex items-center gap-2">
                <svg className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                <button
                  onClick={() => setSelectedPath('/' + array.slice(0, index + 1).join('/'))}
                  className="text-sm transition-colors hover:opacity-70 whitespace-nowrap"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {segment}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* File List */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="max-w-5xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="w-8 h-8 border-2 rounded-full mx-auto mb-4 animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-sm text-red-500 mb-2">Error</p>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{error}</p>
              </div>
            </div>
          ) : (
            <SimpleFileList
              files={files}
              currentPath={selectedPath}
              onPathChange={handlePathChange}
            />
          )}
        </div>
      </main>
    </div>
  );
}
