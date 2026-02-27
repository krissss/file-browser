// Package server 提供 file-browser 的 HTTP 服务端实现
package server

import (
	"bytes"
	"errors"
	"io/fs"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

// Server 文件浏览器 HTTP 服务器
type Server struct {
	cfg    Config  // 服务器配置
	static fs.FS   // 嵌入的静态文件系统（前端资源）
	index  []byte  // index.html 内容，用于 SPA 路由回退
}

// New 创建一个新的 Server 实例
// 从嵌入的文件系统中加载前端静态资源
func New(cfg Config) (*Server, error) {
	// 尝试加载 web/dist 子目录
	sub, err := fs.Sub(embeddedDist, "web/dist")
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			sub = embeddedDist
		} else {
			return nil, err
		}
	}

	// 加载 index.html，用于 SPA 路由
	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		index = []byte("<!doctype html><html><body>file-browser</body></html>")
	}

	return &Server{
		cfg:    cfg,
		static: sub,
		index:  index,
	}, nil
}

// Handler 返回配置好的 Gin 引擎，包含所有路由
func (s *Server) Handler() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery()) // 恢复中间件，防止 panic 导致服务崩溃

	// API 路由
	r.GET("/api/files", s.handleFiles)       // 获取目录内容
	r.GET("/api/search", s.handleSearch)     // 搜索文件
	r.GET("/api/preview", s.handlePreview)   // 预览文件内容
	r.GET("/api/image", s.handleImage)       // 获取图片
	r.GET("/api/download", s.handleDownload) // 下载文件
	r.GET("/healthz", s.handleHealth)        // 健康检查

	// 静态文件和 SPA 回退（处理前端路由）
	r.NoRoute(s.handleStatic)

	return r
}

// handleStatic 处理静态文件请求和 SPA 路由回退
// 对于不存在的路径，返回 index.html 让前端路由处理
func (s *Server) handleStatic(c *gin.Context) {
	requestPath := c.Request.URL.Path

	// 如果有基础路径，去除前缀
	if s.cfg.BasePath != "" {
		basePath := s.cfg.BasePath
		if strings.HasPrefix(requestPath, basePath) {
			requestPath = strings.TrimPrefix(requestPath, basePath)
		}
	}

	requestPath = strings.TrimPrefix(path.Clean("/"+requestPath), "/")

	// 根路径直接返回 index.html
	if requestPath == "" || requestPath == "." {
		s.serveIndex(c)
		return
	}

	// 尝试打开静态文件
	file, err := s.static.Open(requestPath)
	if err != nil {
		s.serveIndex(c) // 文件不存在，返回 index.html（SPA 路由）
		return
	}
	defer file.Close()

	// 获取文件信息
	info, err := file.Stat()
	if err != nil || info.IsDir() {
		s.serveIndex(c)
		return
	}

	// 读取并返回静态文件
	data, err := fs.ReadFile(s.static, requestPath)
	if err != nil {
		c.Status(404)
		return
	}

	httpServeContent(c, info.Name(), info.ModTime(), bytes.NewReader(data))
}

// serveIndex 返回 index.html 内容，动态替换 base path 占位符
func (s *Server) serveIndex(c *gin.Context) {
	// 动态替换 __BASE_PATH__ 占位符
	basePath := s.cfg.BasePath
	if basePath == "" {
		basePath = "/" // 根路径
	} else if !strings.HasSuffix(basePath, "/") {
		basePath += "/" // 确保有尾部斜杠
	}

	// 替换占位符
	html := bytes.ReplaceAll(s.index,
		[]byte("__BASE_PATH__/"),
		[]byte(basePath))

	c.Data(200, "text/html; charset=utf-8", html)
}

// errAccessDenied 路径遍历攻击防护错误
var errAccessDenied = errors.New("access denied")
