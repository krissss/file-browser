/**
 * API URL 工具
 *
 * 支持子路径部署，自动使用 Vite 的 base 配置作为 API 基础路径
 */

/** 获取 API URL（支持子路径部署） */
export function apiUrl(path: string): string {
  const base = import.meta.env.BASE_URL; // 例如: '/' 或 '/files/'
  return `${base}${path}`.replace(/\/+/g, '/');
}
