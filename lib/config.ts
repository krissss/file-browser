import { join } from 'path';
import { cwd } from 'process';

/**
 * 应用配置
 * 集中管理环境变量和常量
 */

/**
 * 文件系统根目录
 * 通过 FILE_BROWSER_ROOT 环境变量指定，默认为当前工作目录
 */
export const FILE_BROWSER_ROOT = process.env.FILE_BROWSER_ROOT || cwd();

/**
 * 文件预览大小限制（字节）
 */
export const MAX_PREVIEW_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * 大文件阈值（字节）- 超过此大小的文件默认使用原文模式
 */
export const LARGE_FILE_THRESHOLD = 50 * 1024; // 50KB

/**
 * 代码高亮初始显示行数
 */
export const INITIAL_DISPLAY_LINES = 1000;

/**
 * 支持的图片格式
 */
export const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'
];

/**
 * 安全检查：防止路径遍历攻击
 * @param path 要检查的相对路径
 * @param rootPath 根目录（默认使用 FILE_BROWSER_ROOT）
 * @returns 是否为安全路径
 */
export function isSafePath(
  path: string,
  rootPath: string = FILE_BROWSER_ROOT
): boolean {
  const resolvedPath = join(rootPath, path);
  return resolvedPath.startsWith(rootPath);
}

/**
 * 获取完整的文件路径
 * @param relativePath 相对路径
 * @returns 完整的绝对路径
 */
export function getFullPath(relativePath: string): string {
  return join(FILE_BROWSER_ROOT, relativePath);
}
