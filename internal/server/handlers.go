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

type fileEntry struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	Type     string `json:"type"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
}

type previewResponse struct {
	Path     string `json:"path"`
	Name     string `json:"name"`
	Content  string `json:"content"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
	Offset   int64  `json:"offset,omitempty"`
	Limit    int64  `json:"limit,omitempty"`
	HasMore  bool   `json:"hasMore"`
}

type errorResponse struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func abortWithError(c *gin.Context, status int, code, message string) {
	c.AbortWithStatusJSON(status, errorResponse{Error: message, Code: code})
}

func statusFromErr(err error) int {
	if err == nil {
		return http.StatusOK
	}
	if errors.Is(err, errAccessDenied) {
		return http.StatusForbidden
	}
	if errors.Is(err, os.ErrNotExist) {
		return http.StatusNotFound
	}
	return http.StatusBadRequest
}

func (s *Server) handleFiles(c *gin.Context) {
	reqPath := c.Query("path")
	absPath, relPath, err := s.resolvePath(reqPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	entries, err := os.ReadDir(absPath)
	if err != nil {
		abortWithError(c, statusFromErr(err), "READ_DIR_FAILED", err.Error())
		return
	}

	items := make([]fileEntry, 0, len(entries))
	for _, entry := range entries {
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

	sort.Slice(items, func(i, j int) bool {
		if items[i].Type != items[j].Type {
			return items[i].Type == "dir"
		}
		return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
	})

	c.JSON(http.StatusOK, items)
}

func (s *Server) handlePreview(c *gin.Context) {
	reqPath := c.Query("path")
	absPath, relPath, err := s.resolvePath(reqPath)
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

	offset, limit, err := parseOffsetLimit(c, s.cfg.PreviewMax)
	if err != nil {
		abortWithError(c, http.StatusBadRequest, "INVALID_RANGE", err.Error())
		return
	}

	file, err := os.Open(absPath)
	if err != nil {
		abortWithError(c, http.StatusInternalServerError, "READ_FAILED", "failed to open file")
		return
	}
	defer file.Close()

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
	if s.cfg.PreviewMax > 0 {
		readLimit = min(readLimit, s.cfg.PreviewMax)
	}

	remaining := info.Size() - offset
	if readLimit > remaining {
		readLimit = remaining
	}

	content := make([]byte, readLimit)
	n, err := file.ReadAt(content, offset)
	if err != nil && !errors.Is(err, io.EOF) {
		abortWithError(c, http.StatusInternalServerError, "READ_FAILED", "failed to read file")
		return
	}

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

func (s *Server) handleHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

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

	c.Header("Content-Disposition", "attachment; filename=\""+info.Name()+"\"")
	httpServeContent(c, info.Name(), info.ModTime(), file)
}

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

	if limit < 0 || offset < 0 {
		return 0, 0, errors.New("offset/limit must be >= 0")
	}
	if maxLimit > 0 && limit > maxLimit {
		limit = maxLimit
	}

	return offset, limit, nil
}

func (s *Server) handleSearch(c *gin.Context) {
	reqPath := c.Query("path")
	query := strings.TrimSpace(c.Query("q"))
	recursive := c.Query("recursive") == "true"

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
	queryLower := strings.ToLower(query)

	if recursive {
		results = s.searchRecursive(absPath, relPath, queryLower, 100)
	} else {
		results = s.searchDir(absPath, relPath, queryLower)
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].Type != results[j].Type {
			return results[i].Type == "dir"
		}
		return strings.ToLower(results[i].Name) < strings.ToLower(results[j].Name)
	})

	c.JSON(http.StatusOK, results)
}

func (s *Server) searchDir(absPath, relPath, queryLower string) []fileEntry {
	entries, err := os.ReadDir(absPath)
	if err != nil {
		return nil
	}

	var results []fileEntry
	for _, entry := range entries {
		if entry.Type()&os.ModeSymlink != 0 {
			continue
		}

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

func (s *Server) searchRecursive(absPath, relPath, queryLower string, maxResults int) []fileEntry {
	var results []fileEntry

	filepath.WalkDir(absPath, func(walkPath string, d os.DirEntry, err error) error {
		if err != nil {
			return nil
		}

		if d.Type()&os.ModeSymlink != 0 {
			return nil
		}

		if len(results) >= maxResults {
			return filepath.SkipAll
		}

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
