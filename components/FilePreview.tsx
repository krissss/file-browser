'use client';

import { useEffect, useState } from 'react';
import { FileNode } from '@/app/page';

interface FilePreviewProps {
  file: FileNode;
  onClose: () => void;
}

export default function FilePreview({ file, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading file content
    setLoading(true);
    setTimeout(() => {
      setContent(`// ${file.name}\n// This is a preview of the file content\n\nContent preview for ${file.name}\nFile type: ${file.extension}\nPath: ${file.path}`);
      setLoading(false);
    }, 500);
  }, [file]);

  const isImageFile = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(file.extension || '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[80vh] bg-[#141518] rounded-xl border border-[rgba(255,255,255,0.12)] shadow-2xl overflow-hidden animate-[fadeIn_0.3s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-[#1a1b1f]">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 flex items-center justify-center rounded-lg text-xs font-bold border"
              style={{
                backgroundColor: getFileColor(file.extension) + '20',
                color: getFileColor(file.extension),
                borderColor: getFileColor(file.extension) + '30',
              }}
            >
              {file.extension?.toUpperCase().slice(0, 3) || 'FILE'}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#e8eaed]">{file.name}</h2>
              <p className="text-xs text-[#5f6368]">{file.path}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.06)] transition-colors group"
          >
            <svg className="h-5 w-5 text-[#9aa0a6] group-hover:text-[#e8eaed] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)] bg-[#0d0e10]">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="h-8 w-8 border-2 border-[#00d4ff] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-[#9aa0a6]">Loading preview...</p>
              </div>
            </div>
          ) : isImageFile ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <svg className="h-20 w-20 mx-auto text-[#5f6368] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-[#9aa0a6]">Image preview would be displayed here</p>
              </div>
            </div>
          ) : (
            <pre className="text-sm text-[#e8eaed] font-mono whitespace-pre-wrap bg-[#1a1b1f] p-4 rounded-lg border border-[rgba(255,255,255,0.06)]">
              {content}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-[rgba(255,255,255,0.06)] bg-[#1a1b1f]">
          <span className="text-xs text-[#5f6368]">Preview mode</span>
          <button className="px-4 py-2 text-xs font-medium rounded-lg bg-[#00d4ff]/10 text-[#00d4ff] border border-[rgba(0,212,255,0.2)] hover:bg-[#00d4ff]/20 transition-colors">
            Download
          </button>
        </div>
      </div>
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
  };

  return colors[extension || ''] || '#a0a0a0';
}
