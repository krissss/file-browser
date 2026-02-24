package server

import (
	"os"
	"path"
	"path/filepath"
	"strings"
)

// resolvePath 将请求路径解析为绝对路径和相对路径
// 返回值：
//   - absPath: 文件系统绝对路径
//   - relPath: 相对于根目录的相对路径（不含前导 /）
//   - error: 路径遍历攻击或符号链接时返回错误
//
// 安全措施：
//   - 使用 path.Clean 规范化路径
//   - 检查路径是否逃逸根目录（防止路径遍历攻击）
//   - 检查路径组件是否为符号链接（防止符号链接攻击）
func (s *Server) resolvePath(reqPath string) (string, string, error) {
	// 规范化路径：去除首尾空格、合并多余斜杠、解析 . 和 ..
	clean := path.Clean("/" + strings.TrimSpace(reqPath))
	if clean == "." {
		clean = "/"
	}
	rel := strings.TrimPrefix(clean, "/")

	// 构建绝对路径
	abs := filepath.Join(s.cfg.Root, filepath.FromSlash(rel))
	abs = filepath.Clean(abs)

	// 路径遍历防护：检查解析后的路径是否仍在根目录内
	// 如果相对路径以 .. 开头，说明路径逃逸了根目录
	rootRel, err := filepath.Rel(s.cfg.Root, abs)
	if err != nil {
		return "", "", err
	}
	if rootRel == ".." || strings.HasPrefix(rootRel, ".."+string(os.PathSeparator)) {
		return "", "", errAccessDenied
	}

	// 符号链接防护：检查路径中的每个组件
	if err := ensureNoSymlink(s.cfg.Root, rel); err != nil {
		return "", "", err
	}

	return abs, rel, nil
}

// ensureNoSymlink 检查路径中的每个组件是否为符号链接
// 符号链接可能指向根目录外的敏感文件，因此拒绝访问
func ensureNoSymlink(root, rel string) error {
	if rel == "" {
		return nil
	}
	// 逐级检查路径中的每个组件
	parts := strings.Split(rel, "/")
	current := root
	for _, part := range parts {
		if part == "" {
			continue
		}
		current = filepath.Join(current, part)
		// 使用 Lstat 而非 Stat，以便检测符号链接本身而非其目标
		info, err := os.Lstat(current)
		if err != nil {
			return err
		}
		// 发现符号链接，拒绝访问
		if info.Mode()&os.ModeSymlink != 0 {
			return errAccessDenied
		}
	}
	return nil
}
