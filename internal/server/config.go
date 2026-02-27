package server

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// 默认配置值
const (
	defaultHost             = "127.0.0.1"      // 默认监听地址
	defaultPort             = 3000             // 默认端口
	defaultPreviewMax       = 1 * 1024 * 1024  // 默认预览大小限制 (1MB)
)

// Config 服务器配置
type Config struct {
	Root       string // 文件浏览根目录（绝对路径）
	Host       string // 监听地址
	Port       int    // 监听端口
	PreviewMax int64  // 文件预览最大字节数
	BasePath   string // 基础路径（用于反向代理子路径部署，例如 /files）
}

// Addr 返回监听地址，格式为 host:port
func (c Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

// ParseConfig 从命令行参数和环境变量解析配置
// 命令行参数：
//
//	--path: 文件浏览根目录（必需）
//	--host: 监听地址（默认 127.0.0.1）
//	--port: 监听端口（默认 3000）
//	--preview-max: 预览大小限制（默认 1MB）
//
// 环境变量：FILE_BROWSER_PATH、FILE_BROWSER_HOST 等
func ParseConfig() (Config, error) {
	var cfg Config

	fs := flag.NewFlagSet(os.Args[0], flag.ContinueOnError)
	fs.StringVar(&cfg.Root, "path", ".", "root path to serve")
	fs.StringVar(&cfg.Host, "host", defaultHost, "host to bind")
	fs.IntVar(&cfg.Port, "port", defaultPort, "port to listen on")
	previewMax := fs.String("preview-max", "1MB", "max preview size (e.g. 1MB, 512KB)")
	fs.StringVar(&cfg.BasePath, "base-path", "", "base path for reverse proxy deployment (e.g. /files)")

	// 应用环境变量默认值（优先级低于命令行参数）
	applyEnvDefaults(fs)
	if err := fs.Parse(os.Args[1:]); err != nil {
		return Config{}, err
	}

	// 解析预览大小限制
	maxBytes, err := parseBytes(*previewMax)
	if err != nil {
		return Config{}, fmt.Errorf("invalid --preview-max: %w", err)
	}

	if cfg.Root == "" {
		return Config{}, errors.New("--path is required")
	}

	// 转换为绝对路径
	absRoot, err := filepath.Abs(cfg.Root)
	if err != nil {
		return Config{}, fmt.Errorf("resolve root: %w", err)
	}

	// 验证根目录：必须存在、不能是符号链接、必须是目录
	info, err := os.Lstat(absRoot)
	if err != nil {
		return Config{}, fmt.Errorf("root not accessible: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return Config{}, errors.New("root path cannot be a symlink")
	}
	if !info.IsDir() {
		return Config{}, errors.New("root path must be a directory")
	}

	cfg.Root = absRoot
	if maxBytes <= 0 {
		maxBytes = defaultPreviewMax
	}
	cfg.PreviewMax = maxBytes

	// 规范化 BasePath
	cfg.BasePath = normalizeBasePath(cfg.BasePath)

	return cfg, nil
}

// applyEnvDefaults 从环境变量应用默认值
// 环境变量命名规则：FILE_BROWSER_<大写参数名>
// 例如：--preview-max 对应 FILE_BROWSER_PREVIEW_MAX
func applyEnvDefaults(fs *flag.FlagSet) {
	fs.VisitAll(func(f *flag.Flag) {
		key := "FILE_BROWSER_" + strings.ToUpper(strings.ReplaceAll(f.Name, "-", "_"))
		if v, ok := os.LookupEnv(key); ok {
			_ = f.Value.Set(v)
			f.DefValue = v
		}
	})
}

// parseBytes 解析带单位的字节大小字符串
// 支持格式：1024、1KB、2K、1.5MB、1G 等
func parseBytes(input string) (int64, error) {
	value := strings.TrimSpace(strings.ToUpper(input))
	if value == "" {
		return 0, errors.New("empty size")
	}
	if value == "0" {
		return 0, nil
	}

	multiplier := int64(1)
	for _, suffix := range []struct {
		s string
		m int64
	}{
		{"KB", 1024},
		{"K", 1024},
		{"MB", 1024 * 1024},
		{"M", 1024 * 1024},
		{"GB", 1024 * 1024 * 1024},
		{"G", 1024 * 1024 * 1024},
	} {
		if strings.HasSuffix(value, suffix.s) {
			multiplier = suffix.m
			value = strings.TrimSuffix(value, suffix.s)
			break
		}
	}

	value = strings.TrimSpace(value)
	if value == "" {
		return 0, errors.New("invalid size")
	}

	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, err
	}
	if parsed < 0 {
		return 0, errors.New("size must be >= 0")
	}

	return int64(parsed * float64(multiplier)), nil
}

// normalizeBasePath 规范化基础路径
// 确保路径以 / 开头，不以 / 结尾
// 空字符串或 "/" 返回空字符串（表示根路径）
func normalizeBasePath(basePath string) string {
	basePath = strings.TrimSpace(basePath)
	if basePath == "" || basePath == "/" {
		return ""
	}
	// 确保以 / 开头
	if !strings.HasPrefix(basePath, "/") {
		basePath = "/" + basePath
	}
	// 移除末尾的 /
	basePath = strings.TrimSuffix(basePath, "/")
	return basePath
}
