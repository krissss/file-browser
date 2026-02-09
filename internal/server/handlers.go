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
)

type fileEntry struct {
	Name      string `json:"name"`
	Path      string `json:"path"`
	Type      string `json:"type"`
	Extension string `json:"extension,omitempty"`
	Size      int64  `json:"size"`
	Modified  string `json:"modified"`
}

type previewResponse struct {
	Path     string `json:"path"`
	Name     string `json:"name"`
	Content  string `json:"content"`
	Size     int64  `json:"size"`
	Modified string `json:"modified"`
	Type     string `json:"type"`
	IsBinary bool   `json:"isBinary"`
	Offset   int64  `json:"offset,omitempty"`
	Limit    int64  `json:"limit,omitempty"`
	HasMore  bool   `json:"hasMore"`
}

func (s *Server) handleFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	reqPath := r.URL.Query().Get("path")
	absPath, relPath, err := s.resolvePath(reqPath)
	if err != nil {
		writeError(w, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	entries, err := os.ReadDir(absPath)
	if err != nil {
		writeError(w, statusFromErr(err), "READ_DIR_FAILED", err.Error())
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
			item.Extension = fileExtension(entry.Name())
		}
		items = append(items, item)
	}

	sort.Slice(items, func(i, j int) bool {
		if items[i].Type != items[j].Type {
			return items[i].Type == "dir"
		}
		return strings.ToLower(items[i].Name) < strings.ToLower(items[j].Name)
	})

	writeJSON(w, http.StatusOK, items)
}

func (s *Server) handlePreview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	reqPath := r.URL.Query().Get("path")
	absPath, relPath, err := s.resolvePath(reqPath)
	if err != nil {
		writeError(w, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	info, err := os.Stat(absPath)
	if err != nil {
		writeError(w, statusFromErr(err), "STAT_FAILED", err.Error())
		return
	}
	if info.IsDir() {
		writeError(w, http.StatusBadRequest, "NOT_A_FILE", "path is a directory")
		return
	}

	ext := fileExtension(info.Name())

	offset, limit, err := parseOffsetLimit(r, s.cfg.PreviewMax)
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_RANGE", err.Error())
		return
	}

	file, err := os.Open(absPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "READ_FAILED", "failed to open file")
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
		readLimit = minInt64(readLimit, s.cfg.PreviewMax)
	}

	remaining := info.Size() - offset
	if readLimit > remaining {
		readLimit = remaining
	}

	content := make([]byte, readLimit)
	n, err := file.ReadAt(content, offset)
	if err != nil && !errors.Is(err, io.EOF) {
		writeError(w, http.StatusInternalServerError, "READ_FAILED", "failed to read file")
		return
	}

	resp := previewResponse{
		Path:     path.Join("/", relPath),
		Name:     info.Name(),
		Content:  string(content[:n]),
		Size:     info.Size(),
		Modified: info.ModTime().UTC().Format(time.RFC3339),
		Type:     ext,
		IsBinary: !isTextFile(ext),
		Offset:   offset,
		Limit:    readLimit,
		HasMore:  offset+int64(n) < info.Size(),
	}

	writeJSON(w, http.StatusOK, resp)
}

func (s *Server) handleImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	reqPath := r.URL.Query().Get("path")
	absPath, _, err := s.resolvePath(reqPath)
	if err != nil {
		writeError(w, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	info, err := os.Stat(absPath)
	if err != nil {
		writeError(w, statusFromErr(err), "STAT_FAILED", err.Error())
		return
	}
	if info.IsDir() {
		writeError(w, http.StatusBadRequest, "NOT_A_FILE", "path is a directory")
		return
	}

	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(info.Name())), ".")
	if !isImageFile(ext) {
		writeError(w, http.StatusUnsupportedMediaType, "UNSUPPORTED_IMAGE", "file is not a supported image")
		return
	}

	file, err := os.Open(absPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "READ_FAILED", "failed to open file")
		return
	}
	defer file.Close()

	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (s *Server) handleDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}

	reqPath := r.URL.Query().Get("path")
	absPath, _, err := s.resolvePath(reqPath)
	if err != nil {
		writeError(w, statusFromErr(err), "INVALID_PATH", err.Error())
		return
	}

	info, err := os.Stat(absPath)
	if err != nil {
		writeError(w, statusFromErr(err), "STAT_FAILED", err.Error())
		return
	}
	if info.IsDir() {
		writeError(w, http.StatusBadRequest, "NOT_A_FILE", "path is a directory")
		return
	}

	file, err := os.Open(absPath)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "READ_FAILED", "failed to open file")
		return
	}
	defer file.Close()

	w.Header().Set("Content-Disposition", "attachment; filename=\""+info.Name()+"\"")
	http.ServeContent(w, r, info.Name(), info.ModTime(), file)
}

func parseOffsetLimit(r *http.Request, maxLimit int64) (int64, int64, error) {
	q := r.URL.Query()
	offsetStr := q.Get("offset")
	limitStr := q.Get("limit")

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
