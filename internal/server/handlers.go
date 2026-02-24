package server

import (
	"errors"
	"io"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

// fileEntry 文件/目录信息，用于 API 响应
type fileEntry struct {
	Name     string `json:"name"`     // 文件名
	Path     string `json:"path"`     // 相对路径（以 / 开头）
	Type     string `json:"type"`     // 类型：file 或 dir
	Size     int64  `json:"size"`     // 文件大小（字节）
	Modified string `json:"modified"` // 修改时间（RFC3339 格式）
}

// previewResponse 文件预览响应
type previewResponse struct {
	Path     string `json:"path"`               // 相对路径
	Name     string `json:"name"`               // 文件名
	Content  string `json:"content"`            // 文件内容（文本）
	Size     int64  `json:"size"`               // 文件总大小
	Modified string `json:"modified"`           // 修改时间
	Offset   int64  `json:"offset,omitempty"`   // 读取偏移量
	Limit    int64  `json:"limit,omitempty"`    // 读取限制
	HasMore  bool   `json:"hasMore"`            // 是否还有更多内容
}

// errorResponse 错误响应
type errorResponse struct {
	Error string `json:"error"` // 错误消息
	Code  string `json:"code"`  // 错误代码
}

// abortWithError 中断请求并返回错误响应
func abortWithError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, errorResponse{Error: message, Code: code})
}

// statusFromErr 根据错误类型返回对应的 HTTP 状态码
func statusFromErr(err error) int {
	if err == nil {
		return http.StatusOK
	}
	if errors.Is(err, errAccessDenied) {
		return http.StatusForbidden // 403: 访问被拒绝（路径遍历攻击）
	}
	if errors.Is(err, os.ErrNotExist) {
		return http.StatusNotFound // 404: 文件或目录不存在
	}
	return http.StatusBadRequest // 400: 其他错误
}

// handleFiles 处理目录列表请求
// GET /api/files?path=/some/path
// 返回指定目录下的文件和子目录列表，按类型（目录优先）和名称排序
func (s *Server) handleFiles(c *gin.Context) {
	reqPath := c.Query("path")
	absPath, relPath, err := s.resolvePath(reqPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	// 读取目录内容
	entries, err := os.ReadDir(absPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "READ_DIR_FAILED", err.Error())
		return
	}

	// 构建文件列表，跳过符号链接（安全考虑）
	items := make([]fileEntry, 0, len(entries))
	for _, entry := range entries {
		// 跳过符号链接，防止符号链接攻击
		if entry.Type()&os.ModeSymlink != 0 {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		itemPath := path.Join("/", relPath, entry.Name())
		item := fileEntry{
			Name:     entry.Name(),
			Path:     itemPath,
			Modified: info.ModTime().UTC().Format(time.RFC3339),
		}
		if info.IsDir() {
			item.Type = "dir"
		} else {
			item.Type = "file"
			item.Size = info.Size()
		}
		items = append(items, item)
	}

	// 排序：目录优先，然后按名称（忽略大小写）排序
	sort.Slice(items, func(i, j int) bool {
		if items[i].Type != items[j].Type {
			return items[i].Type == "dir"
		}
		return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
	})

	c.JSON(http.StatusOK, items)
}

// handlePreview 处理文件预览请求
// GET /api/preview?path=/file.txt&offset=0&limit=1024
// 返回文件内容（文本），支持分页
func (s *Server) handlePreview(c *gin.Context) {
	reqPath := c.Query("path")
	absPath, relPath, err := s.resolvePath(reqPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	// 检查文件状态
	info, err := os.Stat(absPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "STAT_FAILED", err.Error())
		return
	}
	if info.IsDir() {
		abortWithError(c, http.StatusBadRequest, "NOT_A_FILE", "path is a directory")
		return
	}

	// 解析分页参数
	offset, limit, err := parseOffsetLimit(c, s.cfg.PreviewMax)
	if err != nil {
		abortWithError(c, http.StatusBadRequest, "INVALID_RANGE", err.Error())
		return
	}

	// 打开文件
	file, err := os.Open(absPath)
	if err != nil {
		abortWithError(c, http.StatusInternalServerError, "READ_FAILED", "failed to open file")
		return
	}
	defer file.Close()

	// 计算实际读取范围
	if offset < 0 {
		offset = 0
	}
	if offset > info.Size() {
		offset = info.Size()
	}

	readLimit := limit
	if readLimit == 0 {
		readLimit = info.Size()
	}
	// 限制最大预览大小
	if s.cfg.PreviewMax > 0 {
		readLimit = min(readLimit, s.cfg.PreviewMax)
	}

	remaining := info.Size() - offset
	if readLimit > remaining {
		readLimit = remaining
	}

	// 读取文件内容
	content := make([]byte, readLimit)
	n, err := file.ReadAt(content, offset)
	if err != nil && !errors.Is(err, io.EOF) {
		abortWithError(c, http.StatusInternalServerError, "READ_FAILED", "failed to read file")
		return
	}

	// 构建响应
	resp := previewResponse{
		Path:     path.Join("/", relPath),
		Name:     info.Name(),
		Content:  string(content[:n]),
		Size:     info.Size(),
		Modified: info.ModTime().UTC().Format(time.RFC3339),
		Offset:   offset,
		Limit:    readLimit,
		HasMore:  offset+int64(n) < info.Size(),
	}

	c.JSON(http.StatusOK, resp)
}

// handleImage 处理图片请求
// GET /api/image?path=/image.png
// 直接返回图片内容，支持 HTTP 缓存
func (s *Server) handleImage(c *gin.Context) {
	reqPath := c.Query("path")
	absPath, _, err := s.resolvePath(reqPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	info, err := os.Stat(absPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "STAT_FAILED", err.Error())
		return
	}
	if info.IsDir() {
		abortWithError(c, http.StatusBadRequest, "NOT_A_FILE", "path is a directory")
		return
	}

	file, err := os.Open(absPath)
	if err != nil {
		abortWithError(c, http.StatusInternalServerError, "READ_FAILED", "failed to open file")
		return
	}
	defer file.Close()

	httpServeContent(c, info.Name(), info.ModTime(), file)
}

// handleHealth 健康检查端点
// GET /healthz
func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// handleDownload 处理文件下载请求
// GET /api/download?path=/file.txt
// 设置 Content-Disposition 头，触发浏览器下载
func (s *Server) handleDownload(c *gin.Context) {
	reqPath := c.Query("path")
	absPath, _, err := s.resolvePath(reqPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	info, err := os.Stat(absPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "STAT_FAILED", err.Error())
		return
	}
	if info.IsDir() {
		abortWithError(c, http.StatusBadRequest, "NOT_A_FILE", "path is a directory")
		return
	}

	file, err := os.Open(absPath)
	if err != nil {
		abortWithError(c, http.StatusInternalServerError, "READ_FAILED", "failed to open file")
		return
	}
	defer file.Close()

	// 设置下载头，触发浏览器下载行为
	c.Header("Content-Disposition", "attachment; filename=\""+info.Name()+"\"")
	httpServeContent(c, info.Name(), info.ModTime(), file)
}

// parseOffsetLimit 解析分页参数
// 返回 offset 和 limit，并进行边界检查
func parseOffsetLimit(c *gin.Context, maxLimit int64) (int64, int64, error) {
	offsetStr := c.Query("offset")
	limitStr := c.Query("limit")

	var offset int64
	var limit int64
	var err error

	if offsetStr != "" {
		offset, err = strconv.ParseInt(offsetStr, 10, 64)
		if err != nil {
			return 0, 0, errors.New("invalid offset")
		}
	}

	if limitStr != "" {
		limit, err = strconv.ParseInt(limitStr, 10, 64)
		if err != nil {
			return 0, 0, errors.New("invalid limit")
		}
	}

	// 参数校验
	if limit < 0 || offset < 0 {
		return 0, 0, errors.New("offset/limit must be >= 0")
	}
	// 限制最大读取量
	if maxLimit > 0 && limit > maxLimit {
		limit = maxLimit
	}

	return offset, limit, nil
}

// handleSearch 处理搜索请求
// GET /api/search?path=/&q=keyword&recursive=true
// 在指定目录下搜索包含关键词的文件/目录
func (s *Server) handleSearch(c *gin.Context) {
	reqPath := c.Query("path")
	query := strings.TrimSpace(c.Query("q"))
	recursive := c.Query("recursive") == "true"

	// 空查询返回空结果
	if query == "" {
		c.JSON(http.StatusOK, []fileEntry{})
		return
	}

	absPath, relPath, err := s.resolvePath(reqPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	var results []fileEntry
	queryLower := strings.ToLower(query) // 不区分大小写搜索

	// 根据参数选择搜索模式
	if recursive {
		results = s.searchRecursive(absPath, relPath, queryLower, 100)
	} else {
		results = s.searchDir(absPath, relPath, queryLower)
	}

	// 排序：目录优先，然后按名称排序
	sort.Slice(results, func(i, j int) bool {
		if results[i].Type != results[j].Type {
			return results[i].Type == "dir"
		}
		return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
	})

	c.JSON(http.StatusOK, results)
}

// searchDir 在单个目录下搜索（非递归）
func (s *Server) searchDir(absPath, relPath, queryLower string) []fileEntry {
	entries, err := os.ReadDir(absPath)
	if err != nil {
		return nil
	}

	var results []fileEntry
	for _, entry := range entries {
		// 跳过符号链接
		if entry.Type()&os.ModeSymlink != 0 {
			continue
		}

		// 匹配文件名（不区分大小写）
		nameLower := strings.ToLower(entry.Name())
		if !strings.Contains(nameLower, queryLower) {
			continue
		}

		info, err := entry.Info()
		if err != nil {
			continue
		}

		itemPath := path.Join("/", relPath, entry.Name())
		item := fileEntry{
			Name:     entry.Name(),
			Path:     itemPath,
			Modified: info.ModTime().UTC().Format(time.RFC3339),
		}
		if info.IsDir() {
			item.Type = "dir"
		} else {
			item.Type = "file"
			item.Size = info.Size()
		}
		results = append(results, item)
	}

	return results
}

// searchRecursive 递归搜索目录树
// maxResults 限制最大结果数量，防止性能问题
func (s *Server) searchRecursive(absPath, relPath, queryLower string, maxResults int) []fileEntry {
	var results []fileEntry

	filepath.WalkDir(absPath, func(walkPath string, d os.DirEntry, err error) error {
		if err != nil {
			return nil // 忽略错误继续
		}

		// 跳过符号链接
		if d.Type()&os.ModeSymlink != 0 {
			return nil
		}

		// 达到最大结果数，停止搜索
		if len(results) >= maxResults {
			return filepath.SkipAll
		}

		// 匹配文件名
		nameLower := strings.ToLower(d.Name())
		if strings.Contains(nameLower, queryLower) {
			info, err := d.Info()
			if err == nil {
				relItemPath := filepath.Join(relPath, strings.TrimPrefix(walkPath, absPath))
				item := fileEntry{
					Name:     d.Name(),
					Path:     path.Join("/", filepath.ToSlash(relItemPath)),
					Modified: info.ModTime().UTC().Format(time.RFC3339),
				}
				if d.IsDir() {
					item.Type = "dir"
				} else {
					item.Type = "file"
					item.Size = info.Size()
				}
				results = append(results, item)
			}
		}

		return nil
	})

	return results
}
