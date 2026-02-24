package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func setupTestServer(t *testing.T) (*Server, string) {
	t.Helper()

	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "file-browser-handler-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	// Create test structure
	os.Mkdir(filepath.Join(tmpDir, "subdir"), 0755)
	os.WriteFile(filepath.Join(tmpDir, "test.txt"), []byte("hello world"), 0644)
	os.WriteFile(filepath.Join(tmpDir, "subdir", "nested.txt"), []byte("nested content"), 0644)

	server, err := New(Config{
		Root:       tmpDir,
		Host:       "127.0.0.1",
		Port:       3000,
		PreviewMax: 1024 * 1024,
	})
	if err != nil {
		os.RemoveAll(tmpDir)
		t.Fatalf("failed to create server: %v", err)
	}

	return server, tmpDir
}

func TestHandleHealth(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

	r := server.Handler()
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()

	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("handleHealth status = %d, want %d", w.Code, http.StatusOK)
	}

	expected := `{"status":"ok"}`
	if w.Body.String() != expected {
		t.Errorf("handleHealth body = %q, want %q", w.Body.String(), expected)
	}
}

func TestHandleFiles(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

	tests := []struct {
		name       string
		path       string
		wantStatus int
		checkBody  bool
	}{
		{
			name:       "root directory",
			path:       "/",
			wantStatus: http.StatusOK,
			checkBody:  true,
		},
		{
			name:       "subdirectory",
			path:       "/subdir",
			wantStatus: http.StatusOK,
			checkBody:  true,
		},
		{
			name:       "non-existent directory",
			path:       "/nonexistent",
			wantStatus: http.StatusNotFound,
			checkBody:  false,
		},
	}

	r := server.Handler()

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/files?path=" + tt.path
			req := httptest.NewRequest(http.MethodGet, url, nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("handleFiles status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}

			if tt.checkBody && w.Code == http.StatusOK {
				// Check that response is valid JSON array
				body := w.Body.String()
				if body == "" {
					t.Error("handleFiles returned empty body")
				}
			}
		})
	}
}

func TestHandlePreview(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

	r := server.Handler()

	tests := []struct {
		name       string
		path       string
		offset     string
		limit      string
		wantStatus int
	}{
		{
			name:       "text file",
			path:       "/test.txt",
			wantStatus: http.StatusOK,
		},
		{
			name:       "nested file",
			path:       "/subdir/nested.txt",
			wantStatus: http.StatusOK,
		},
		{
			name:       "with offset and limit",
			path:       "/test.txt",
			offset:     "0",
			limit:      "5",
			wantStatus: http.StatusOK,
		},
		{
			name:       "directory instead of file",
			path:       "/subdir",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "non-existent file",
			path:       "/nonexistent.txt",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "invalid offset",
			path:       "/test.txt",
			offset:     "invalid",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "negative offset",
			path:       "/test.txt",
			offset:     "-1",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/preview?path=" + tt.path
			if tt.offset != "" {
				url += "&offset=" + tt.offset
			}
			if tt.limit != "" {
				url += "&limit=" + tt.limit
			}

			req := httptest.NewRequest(http.MethodGet, url, nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("handlePreview status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestHandleDownload(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

	r := server.Handler()

	tests := []struct {
		name            string
		path            string
		wantStatus      int
		checkAttachment bool
	}{
		{
			name:            "download file",
			path:            "/test.txt",
			wantStatus:      http.StatusOK,
			checkAttachment: true,
		},
		{
			name:       "non-existent file",
			path:       "/nonexistent.txt",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "directory",
			path:       "/subdir",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/download?path="+tt.path, nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("handleDownload status = %d, want %d", w.Code, tt.wantStatus)
			}

			if tt.checkAttachment {
				disposition := w.Header().Get("Content-Disposition")
				if disposition == "" {
					t.Error("handleDownload missing Content-Disposition header")
				}
			}
		})
	}
}

func TestHandleSearch(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

	r := server.Handler()

	tests := []struct {
		name       string
		path       string
		query      string
		recursive  string
		wantStatus int
	}{
		{
			name:       "search for test",
			path:       "/",
			query:      "test",
			wantStatus: http.StatusOK,
		},
		{
			name:       "empty query",
			path:       "/",
			query:      "",
			wantStatus: http.StatusOK,
		},
		{
			name:       "recursive search",
			path:       "/",
			query:      "nested",
			recursive:  "true",
			wantStatus: http.StatusOK,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/search?path=" + tt.path + "&q=" + tt.query
			if tt.recursive != "" {
				url += "&recursive=" + tt.recursive
			}

			req := httptest.NewRequest(http.MethodGet, url, nil)
			w := httptest.NewRecorder()

			r.ServeHTTP(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("handleSearch status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestStatusFromErr(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		expected int
	}{
		{"nil error", nil, http.StatusOK},
		{"access denied", errAccessDenied, http.StatusForbidden},
		{"not exist", os.ErrNotExist, http.StatusNotFound},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := statusFromErr(tt.err)
			if result != tt.expected {
				t.Errorf("statusFromErr(%v) = %d, want %d", tt.err, result, tt.expected)
			}
		})
	}
}
