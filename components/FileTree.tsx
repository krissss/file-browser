'use client';

import { useState } from 'react';
import { FileNode } from '@/app/page';

interface FileTreeProps {
  data: FileNode;
  selectedPath: string;
  onPathSelect: (path: string) => void;
  level?: number;
}

export default function FileTree({ data, selectedPath, onPathSelect, level = 0 }: FileTreeProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set(['/']));

  const toggleExpand = (path: string) => {
    setExpandedDirs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const isExpanded = (path: string) => expandedDirs.has(path);
  const isSelected = (path: string) => selectedPath === path;

  const renderNode = (node: FileNode, currentPath: string) => {
    const isDir = node.type === 'directory';
    const hasChildren = isDir && node.children && node.children.length > 0;
    const expanded = isExpanded(currentPath);
    const selected = isSelected(currentPath);

    return (
      <div key={currentPath}>
        <div
          className="flex items-center gap-2 px-3 py-3 cursor-pointer transition-all duration-200 relative group min-h-[44px]"
          style={{ paddingLeft: `${level * 16 + 12}px` }}
          onClick={() => {
            if (isDir && hasChildren) {
              toggleExpand(currentPath);
            }
            onPathSelect(currentPath);
          }}
        >
          {/* Selection Indicator */}
          {selected && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.6)]" />
          )}

          {/* Hover Glow Effect */}
          <div className="absolute inset-0 bg-[rgba(0,212,255,0.04)] opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Expand/Collapse Icon */}
          {hasChildren && (
            <svg
              className={`h-3 w-3 text-[#5f6368] transition-transform duration-200 flex-shrink-0 ${
                expanded ? 'rotate-90' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {!hasChildren && <div className="w-3 flex-shrink-0" />}

          {/* File/Folder Icon */}
          {isDir ? (
            <svg
              className={`h-4 w-4 flex-shrink-0 transition-colors ${
                expanded ? 'text-[#ffd000]' : 'text-[#9aa0a6] group-hover:text-[#ffd000]'
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          ) : (
            <FileIcon extension={node.extension} />
          )}

          {/* File Name */}
          <span
            className={`text-xs font-medium truncate transition-colors ${
              selected
                ? 'text-[#00d4ff]'
                : 'text-[#e8eaed] group-hover:text-[#00d4ff]'
            }`}
          >
            {node.name}
          </span>
        </div>

        {/* Children */}
        {isDir && expanded && hasChildren && (
          <div className="animate-[slideIn_0.2s_ease-out]">
            {node.children!.map(child => renderNode(child, `${currentPath === '/' ? '' : currentPath}/${child.name}`))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2">
      {renderNode(data, data.path)}
    </div>
  );
}

function FileIcon({ extension }: { extension?: string }) {
  const color = getFileColor(extension);

  return (
    <div
      className="h-4 w-4 flex-shrink-0 text-[10px] font-bold flex items-center justify-center rounded-sm border border-[rgba(255,255,255,0.1)]"
      style={{ backgroundColor: color + '20', color, borderColor: color + '30' }}
    >
      {extension?.toUpperCase().slice(0, 3) || 'FILE'}
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
