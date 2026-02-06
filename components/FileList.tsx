'use client';

import { FileNode } from '@/app/page';

interface FileListProps {
  files: FileNode[];
  currentPath: string;
  onFileClick: (file: FileNode) => void;
  onPathChange: (path: string) => void;
}

export default function FileList({ files, currentPath, onFileClick, onPathChange }: FileListProps) {
  const directories = files.filter(f => f.type === 'directory');
  const regularFiles = files.filter(f => f.type === 'file');

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <svg
            className="h-16 w-16 mx-auto text-[#5f6368] mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm text-[#9aa0a6]">This folder is empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Parent Directory Navigation */}
      {currentPath !== '/' && (
        <div
          onClick={() => {
            const segments = currentPath.split('/').filter(Boolean);
            segments.pop();
            onPathChange('/' + segments.join('/'));
          }}
          className="mb-4 flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#1a1b1f] hover:border-[rgba(0,212,255,0.3)] hover:bg-[#1f2126] cursor-pointer transition-all duration-200 group active:scale-[0.98]"
        >
          <svg className="h-5 w-5 text-[#5f6368] group-hover:text-[#00d4ff] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-sm font-medium text-[#9aa0a6] group-hover:text-[#00d4ff] transition-colors">..</span>
        </div>
      )}

      {/* Directories Section */}
      {directories.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-3 px-1">Directories</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {directories.map((dir, index) => (
              <div
                key={dir.path}
                onClick={() => onFileClick(dir)}
                className="relative group cursor-pointer animate-[fadeIn_0.3s_ease-out_forwards]"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative p-4 md:p-4 min-h-[88px] rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#1a1b1f] hover:border-[rgba(0,212,255,0.3)] hover:bg-[#1f2126] transition-all duration-200 active:scale-[0.98]">
                  {/* Hover Glow */}
                  <div className="absolute inset-0 rounded-lg bg-[rgba(0,212,255,0.03)] opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative flex items-start gap-3">
                    <svg
                      className="h-8 w-8 text-[#ffd000] flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#e8eaed] group-hover:text-[#00d4ff] truncate transition-colors">
                        {dir.name}
                      </p>
                      <p className="text-xs text-[#5f6368] mt-0.5">
                        {dir.children?.length || 0} items
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {regularFiles.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-3 px-1">Files</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {regularFiles.map((file, index) => (
              <div
                key={file.path}
                onClick={() => onFileClick(file)}
                className="relative group cursor-pointer animate-[fadeIn_0.3s_ease-out_forwards]"
                style={{ animationDelay: `${(directories.length + index) * 50}ms` }}
              >
                <div className="relative p-4 md:p-4 min-h-[88px] rounded-lg border border-[rgba(255,255,255,0.06)] bg-[#1a1b1f] hover:border-[rgba(0,212,255,0.3)] hover:bg-[#1f2126] transition-all duration-200 active:scale-[0.98]">
                  {/* Hover Glow */}
                  <div className="absolute inset-0 rounded-lg bg-[rgba(0,212,255,0.03)] opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative flex items-start gap-3">
                    <div
                      className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold border"
                      style={{
                        backgroundColor: getFileColor(file.extension) + '20',
                        color: getFileColor(file.extension),
                        borderColor: getFileColor(file.extension) + '30',
                      }}
                    >
                      {file.extension?.toUpperCase().slice(0, 3) || 'FILE'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#e8eaed] group-hover:text-[#00d4ff] truncate transition-colors">
                        {file.name}
                      </p>
                      <p className="text-xs text-[#5f6368] mt-0.5 uppercase">
                        {file.extension || 'file'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getFileColor(extension?: string): string {
  const colors: Record<string, string> = {
    ts: '#00d4ff',
    tsx: '#00d4ff',
    js: '#f7df1e',
    jsx: '#f7df1e',
    css: '#264de4',
    html: '#e34c26',
    json: '#f7df1e',
    md: '#519aba',
    txt: '#a0a0a0',
    jpg: '#ff6b6b',
    png: '#ff6b6b',
    gif: '#ff6b6b',
    svg: '#ffb300',
    zip: '#ff9500',
    tar: '#ff9500',
    gz: '#ff9500',
  };

  return colors[extension || ''] || '#a0a0a0';
}
