'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FileNode } from '@/app/page';

// 动态导入 ReactMarkdown 以避免 SSR 问题
const ReactMarkdown = dynamic(
  () => import('react-markdown'),
  { ssr: false }
);

import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { memo } from 'react';

interface SimpleFileListProps {
  files: FileNode[];
  currentPath: string;
  onPathChange: (path: string) => void;
}

export default function SimpleFileList({ files, currentPath, onPathChange }: SimpleFileListProps) {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isMarkdownRendered, setIsMarkdownRendered] = useState(true); // Markdown 默认显示渲染模式
  const [isCodeRendered, setIsCodeRendered] = useState(true); // 代码默认显示高亮模式
  const [displayedLines, setDisplayedLines] = useState<number>(1000); // 大文件初始显示行数

  const directories = files.filter(f => f.type === 'directory');
  const regularFiles = files.filter(f => f.type === 'file');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const openFilePreview = async (file: FileNode) => {
    setSelectedFile(file);
    setLoadingPreview(true);
    setPreviewError(null);
    setFileContent(null);
    setDisplayedLines(1000); // 重置显示行数

    try {
      // 检查是否为图片文件
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];
      const isImage = file.extension && imageExtensions.includes(file.extension.toLowerCase());

      if (isImage) {
        // 图片不需要加载内容，直接显示
        setLoadingPreview(false);
      } else {
        // 文本文件加载内容
        const response = await fetch(`/api/preview?path=${encodeURIComponent(file.path)}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load file');
        }

        const data = await response.json();

        if (data.error) {
          setPreviewError(data.message || data.error);
        } else {
          setFileContent(data.content);

          // 对于大文件（>50KB），默认显示原文以避免语法高亮卡顿
          const LARGE_FILE_THRESHOLD = 50 * 1024; // 50KB
          if (data.size > LARGE_FILE_THRESHOLD) {
            setIsCodeRendered(false);
            setIsMarkdownRendered(false);
          }
        }
      }
    } catch (err) {
      console.error('Error loading file preview:', err);
      setPreviewError(err instanceof Error ? err.message : 'Failed to load file');
    } finally {
      setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    setSelectedFile(null);
    setFileContent(null);
    setPreviewError(null);
    setIsMarkdownRendered(true);
    setIsCodeRendered(true);
  };

  // 检测是否为代码文件
  const isCodeFile = (extension: string | undefined): boolean => {
    const codeExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
      'css', 'scss', 'less', 'sass',
      'html', 'htm', 'xml',
      'json', 'yaml', 'yml', 'toml',
      'py', 'rb', 'go', 'rs', 'java',
      'c', 'cpp', 'h', 'hpp',
      'sh', 'bash', 'zsh', 'ps1',
      'sql', 'graphql',
      'vue', 'svelte'
    ];
    return extension ? codeExtensions.includes(extension) : false;
  };

  // 获取代码语言
  const getLanguage = (extension: string | undefined): string => {
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'jsx',
      'ts': 'typescript',
      'tsx': 'tsx',
      'mjs': 'javascript',
      'cjs': 'javascript',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'sass': 'sass',
      'html': 'html',
      'htm': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'py': 'python',
      'rb': 'ruby',
      'go': 'go',
      'rs': 'rust',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'h': 'c',
      'hpp': 'cpp',
      'sh': 'bash',
      'bash': 'bash',
      'zsh': 'bash',
      'ps1': 'powershell',
      'sql': 'sql',
      'graphql': 'graphql',
      'vue': 'vue',
      'svelte': 'svelte'
    };
    return extension ? languageMap[extension] || 'text' : 'text';
  };

  // 将大文件分块以便渐进式渲染
  const chunkContent = (content: string, chunkSize: number = 500): string[] => {
    const lines = content.split('\n');
    const chunks: string[] = [];
    for (let i = 0; i < lines.length; i += chunkSize) {
      chunks.push(lines.slice(i, i + chunkSize).join('\n'));
    }
    return chunks;
  };

  // 限制显示的行数以提升性能
  const limitContentLines = (content: string, maxLines: number): { limited: string; totalLines: number; isTruncated: boolean } => {
    const lines = content.split('\n');
    const totalLines = lines.length;
    const isTruncated = totalLines > maxLines;
    const limited = isTruncated ? lines.slice(0, maxLines).join('\n') : content;
    return { limited, totalLines, isTruncated };
  };

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This folder is empty</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="py-6">
        {/* Back Button */}
        {currentPath !== '/' && (
          <button
            onClick={() => {
              const segments = currentPath.split('/').filter(Boolean);
              segments.pop();
              onPathChange('/' + segments.join('/'));
            }}
            className="mb-4 flex items-center gap-2 text-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--accent)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            ..
          </button>
        )}

        {/* Directories */}
        {directories.length > 0 && (
          <div className="mb-6">
            <div className="px-4 mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Folders
            </div>
            <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
              {directories.map((dir) => (
                <div
                  key={dir.path}
                  onClick={() => onPathChange(dir.path)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-color)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {dir.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Files */}
        {regularFiles.length > 0 && (
          <div>
            <div className="px-4 mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Files
            </div>
            <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-color)' }}>
              {regularFiles.map((file) => (
                <div
                  key={file.path}
                  onClick={() => openFilePreview(file)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-all border-b last:border-b-0"
                  style={{ borderColor: 'var(--border-color)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    e.currentTarget.style.borderColor = 'var(--border-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                  }}
                >
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center text-[10px] font-bold rounded uppercase"
                       style={{
                         backgroundColor: 'var(--accent)',
                         color: '#ffffff'
                       }}>
                    {file.extension?.slice(0, 3) || 'file'}
                  </div>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {file.name}
                  </span>
                  <div className="flex items-center gap-3">
                    {file.size && (
                      <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {formatSize(file.size)}
                      </span>
                    )}
                    {file.modified && (
                      <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {formatDate(file.modified)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File Preview Modal */}
      {selectedFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
          onClick={closePreview}
        >
          <div
            className="w-full max-w-7xl rounded-lg overflow-hidden flex flex-col"
            style={{ backgroundColor: 'var(--bg-elevated)', maxHeight: '95vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center rounded-lg text-xs font-bold uppercase"
                     style={{ backgroundColor: 'var(--accent)', color: '#ffffff' }}>
                  {selectedFile.extension?.slice(0, 3) || 'file'}
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {selectedFile.name}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                    {selectedFile.path}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreview}
                className="w-9 h-9 flex items-center justify-center rounded-md transition-colors hover:opacity-70"
                style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-auto" style={{ backgroundColor: 'var(--bg-secondary)', maxHeight: 'calc(95vh - 140px)' }}>
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}></div>
                </div>
              ) : previewError ? (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-tertiary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-sm mb-2" style={{ color: 'var(--text-primary)' }}>Preview not available</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{previewError}</p>
                </div>
              ) : selectedFile.extension && ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'].includes(selectedFile.extension.toLowerCase()) ? (
                <div className="flex items-center justify-center">
                  <img
                    src={`/api/image?path=${encodeURIComponent(selectedFile.path)}`}
                    alt={selectedFile.name}
                    className="max-w-full h-auto rounded-lg border"
                    style={{ borderColor: 'var(--border-color)', maxHeight: '50vh' }}
                    onError={(e) => {
                      setPreviewError('Failed to load image');
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : fileContent ? (
                <>
                  {/* Markdown 和代码文件切换按钮 */}
                  {(selectedFile.extension === 'md' || selectedFile.extension === 'markdown') ? (
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {selectedFile.size && selectedFile.size > 50 * 1024 && (
                          <span>大文件已默认使用原文模式</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsMarkdownRendered(true)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                          style={{
                            backgroundColor: isMarkdownRendered ? 'var(--accent)' : 'var(--bg-tertiary)',
                            color: isMarkdownRendered ? '#ffffff' : 'var(--text-primary)'
                          }}
                        >
                          渲染预览
                        </button>
                        <button
                          onClick={() => setIsMarkdownRendered(false)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                          style={{
                            backgroundColor: !isMarkdownRendered ? 'var(--accent)' : 'var(--bg-tertiary)',
                            color: !isMarkdownRendered ? '#ffffff' : 'var(--text-primary)'
                          }}
                        >
                          原文查看
                        </button>
                      </div>
                    </div>
                  ) : isCodeFile(selectedFile.extension) ? (
                    <div className="mb-4 flex items-center justify-between gap-2">
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {selectedFile.size && selectedFile.size > 50 * 1024 && (
                          <span>大文件已默认使用原文模式以提升性能</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setIsCodeRendered(true)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                          style={{
                            backgroundColor: isCodeRendered ? 'var(--accent)' : 'var(--bg-tertiary)',
                            color: isCodeRendered ? '#ffffff' : 'var(--text-primary)'
                          }}
                        >
                          高亮预览
                        </button>
                        <button
                          onClick={() => setIsCodeRendered(false)}
                          className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                          style={{
                            backgroundColor: !isCodeRendered ? 'var(--accent)' : 'var(--bg-tertiary)',
                            color: !isCodeRendered ? '#ffffff' : 'var(--text-primary)'
                          }}
                        >
                          原文查看
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-lg border" style={{ backgroundColor: 'var(--bg-tertiary)', borderColor: 'var(--border-color)' }}>
                    {(selectedFile.extension === 'md' || selectedFile.extension === 'markdown') ? (
                      isMarkdownRendered ? (
                        <div className="p-6 prose prose-sm max-w-none" style={{
                          color: 'var(--text-primary)',
                          lineHeight: '1.75'
                        }}>
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              a: ({ node, ...props }) => (
                                <a {...props} style={{ color: 'var(--accent)' }} target="_blank" rel="noopener noreferrer" />
                              ),
                              p: ({ node, ...props }) => (
                                <p {...props} style={{ marginBottom: '1em', marginTop: '0' }} />
                              ),
                              h1: ({ node, ...props }) => (
                                <h1 {...props} style={{
                                  fontSize: '2em',
                                  fontWeight: 'bold',
                                  marginBottom: '0.5em',
                                  marginTop: '0',
                                  paddingBottom: '0.3em',
                                  borderBottom: '1px solid var(--border-color)'
                                }} />
                              ),
                              h2: ({ node, ...props }) => (
                                <h2 {...props} style={{
                                  fontSize: '1.5em',
                                  fontWeight: 'bold',
                                  marginBottom: '0.5em',
                                  marginTop: '1.5em',
                                  paddingBottom: '0.3em',
                                  borderBottom: '1px solid var(--border-color)'
                                }} />
                              ),
                              h3: ({ node, ...props }) => (
                                <h3 {...props} style={{
                                  fontSize: '1.25em',
                                  fontWeight: 'bold',
                                  marginBottom: '0.5em',
                                  marginTop: '1.25em'
                                }} />
                              ),
                              h4: ({ node, ...props }) => (
                                <h4 {...props} style={{
                                  fontSize: '1em',
                                  fontWeight: 'bold',
                                  marginBottom: '0.5em',
                                  marginTop: '1em'
                                }} />
                              ),
                              ul: ({ node, ...props }) => (
                                <ul {...props} style={{ marginBottom: '1em', paddingLeft: '1.5em' }} />
                              ),
                              ol: ({ node, ...props }) => (
                                <ol {...props} style={{ marginBottom: '1em', paddingLeft: '1.5em' }} />
                              ),
                              li: ({ node, ...props }) => (
                                <li {...props} style={{ marginBottom: '0.25em' }} />
                              ),
                              code: ({ node, inline, className, children, ...props }) => {
                                const match = /language-(\w+)/.exec(className || '');
                                const language = match ? match[1] : '';

                                // 如果有语言标记且不是内联代码，使用语法高亮
                                if (language && !inline) {
                                  return (
                                    <SyntaxHighlighter
                                      language={language}
                                      style={document.documentElement.classList.contains('dark') ? oneDark : oneLight}
                                      customStyle={{
                                        margin: 0,
                                        borderRadius: '8px',
                                        fontSize: '0.875em',
                                        backgroundColor: document.documentElement.classList.contains('dark') ? 'transparent' : '#fafafa'
                                      }}
                                      PreTag="div"
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  );
                                }

                                // 内联代码或无语言标记的代码块
                                const isBlockCode = className !== undefined && className !== '';
                                return (
                                  <code
                                    className={className}
                                    {...props}
                                    style={{
                                      backgroundColor: 'var(--bg-primary)',
                                      padding: inline || !isBlockCode ? '2px 6px' : '16px',
                                      borderRadius: inline || !isBlockCode ? '4px' : '8px',
                                      fontSize: '0.875em',
                                      display: inline || !isBlockCode ? 'inline' : 'block',
                                      overflowX: 'auto',
                                      whiteSpace: isBlockCode && !inline ? 'pre' : 'pre-wrap',
                                      border: inline || !isBlockCode ? 'none' : '1px solid var(--border-color)'
                                    }}
                                  >
                                    {children}
                                  </code>
                                );
                              },
                              pre: ({ node, ...props }) => (
                                <pre {...props} style={{
                                  backgroundColor: 'var(--bg-primary)',
                                  padding: '16px',
                                  borderRadius: '8px',
                                  overflow: 'auto',
                                  border: '1px solid var(--border-color)',
                                  marginBottom: '1em',
                                  marginTop: '1em'
                                }} />
                              ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote {...props} style={{
                                  borderLeft: '4px solid var(--accent)',
                                  paddingLeft: '1em',
                                  marginLeft: '0',
                                  marginRight: '0',
                                  marginBottom: '1em',
                                  opacity: 0.8
                                }} />
                              ),
                              hr: ({ node, ...props }) => (
                                <hr {...props} style={{
                                  border: 'none',
                                  borderTop: '1px solid var(--border-color)',
                                  margin: '2em 0'
                                }} />
                              ),
                              table: ({ node, ...props }) => (
                                <div style={{ overflowX: 'auto', marginBottom: '1em' }}>
                                  <table {...props} style={{
                                    borderCollapse: 'collapse',
                                    width: '100%'
                                  }} />
                                </div>
                              ),
                              th: ({ node, ...props }) => (
                                <th {...props} style={{
                                  border: '1px solid var(--border-color)',
                                  padding: '8px 12px',
                                  backgroundColor: 'var(--bg-primary)',
                                  fontWeight: 'bold',
                                  textAlign: 'left'
                                }} />
                              ),
                              td: ({ node, ...props }) => (
                                <td {...props} style={{
                                  border: '1px solid var(--border-color)',
                                  padding: '8px 12px'
                                }} />
                              )
                            }}
                          >
                            {fileContent}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <pre className="p-4 text-sm" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                          {fileContent}
                        </pre>
                      )
                    ) : isCodeFile(selectedFile.extension) ? (
                      isCodeRendered ? (
                        <>
                          <SyntaxHighlighter
                            language={getLanguage(selectedFile.extension)}
                            style={document.documentElement.classList.contains('dark') ? oneDark : oneLight}
                            customStyle={{
                              margin: 0,
                              borderRadius: '8px',
                              fontSize: '14px',
                              backgroundColor: document.documentElement.classList.contains('dark') ? 'transparent' : '#fafafa'
                            }}
                            wrapLongLines
                          >
                            {(() => {
                              const { limited, totalLines, isTruncated } = limitContentLines(fileContent, displayedLines);
                              return limited;
                            })()}
                          </SyntaxHighlighter>
                          {(() => {
                            const { totalLines } = limitContentLines(fileContent, displayedLines);
                            if (totalLines > displayedLines) {
                              return (
                                <div className="mt-4 text-center">
                                  <button
                                    onClick={() => setDisplayedLines(prev => prev * 2)}
                                    className="px-4 py-2 text-xs font-medium rounded-md transition-colors"
                                    style={{
                                      backgroundColor: 'var(--accent)',
                                      color: '#ffffff'
                                    }}
                                  >
                                    加载更多（当前 {Math.min(displayedLines, totalLines)} / {totalLines} 行）
                                  </button>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </>
                      ) : (
                        <pre className="p-4 text-sm" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                          {fileContent}
                        </pre>
                      )
                    ) : (
                      <pre className="p-4 text-sm" style={{ color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                        {fileContent}
                      </pre>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-3 border-t" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-tertiary)' }}>
              <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {selectedFile.size && `${formatSize(selectedFile.size)} • `}
                {selectedFile.modified && formatDate(selectedFile.modified)}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.open(`/api/download?path=${encodeURIComponent(selectedFile.path)}`, '_blank')}
                  className="px-4 py-2 text-xs font-medium rounded-md transition-all hover:opacity-80"
                  style={{
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    cursor: 'pointer'
                  }}
                >
                  Download
                </button>
                <button
                  onClick={closePreview}
                  className="px-4 py-2 text-xs font-medium rounded-md transition-colors hover:opacity-70"
                  style={{ backgroundColor: 'var(--accent)', color: '#ffffff', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
