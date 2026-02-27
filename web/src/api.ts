/**
 * API URL 工具
 *
 * 使用相对路径，利用 HTML <base> 标签自动解析完整路径
 */

/** 获取 API URL（相对路径） */
export function apiUrl(path: string): string {
  // 确保路径不以 / 开头，这样浏览器会相对于 <base href> 解析
  return path.startsWith('/') ? path.slice(1) : path;
}
