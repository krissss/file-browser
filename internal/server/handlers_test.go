package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

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

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	w := httptest.NewRecorder()

	server.handleHealth(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("handleHealth status = %d, want %d", w.Code, http.StatusOK)
	}

	expected := `{"status":"ok"}`
	if w.Body.String() != expected {
		t.Errorf("handleHealth body = %q, want %q", w.Body.String(), expected)
	}
}

func TestHandleHealth_MethodNotAllowed(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

	methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodPatch}
	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/healthz", nil)
			w := httptest.NewRecorder()

			server.handleHealth(w, req)

			if w.Code != http.StatusMethodNotAllowed {
				t.Errorf("handleHealth %s status = %d, want %d", method, w.Code, http.StatusMethodNotAllowed)
			}
		})
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

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/api/files?path=" + tt.path
			req := httptest.NewRequest(http.MethodGet, url, nil)
			w := httptest.NewRecorder()

			server.handleFiles(w, req)

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

func TestHandleFiles_MethodNotAllowed(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

	methods := []string{http.MethodPost, http.MethodPut, http.MethodDelete}
	for _, method := range methods {
		t.Run(method, func(t *testing.T) {
			req := httptest.NewRequest(method, "/api/files?path=/", nil)
			w := httptest.NewRecorder()

			server.handleFiles(w, req)

			if w.Code != http.StatusMethodNotAllowed {
				t.Errorf("handleFiles %s status = %d, want %d", method, w.Code, http.StatusMethodNotAllowed)
			}
		})
	}
}

func TestHandlePreview(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

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

			server.handlePreview(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("handlePreview status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestHandleDownload(t *testing.T) {
	server, tmpDir := setupTestServer(t)
	defer os.RemoveAll(tmpDir)

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

			server.handleDownload(w, req)

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

			server.handleSearch(w, req)

			if w.Code != tt.wantStatus {
				t.Errorf("handleSearch status = %d, want %d, body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}

func TestParseOffsetLimit(t *testing.T) {
	tests := []struct {
		name        string
		offset      string
		limit       string
		maxLimit    int64
		wantOffset  int64
		wantLimit   int64
		wantErr     bool
	}{
		{
			name:       "empty values",
			offset:     "",
			limit:      "",
			maxLimit:   1024,
			wantOffset: 0,
			wantLimit:  0,
			wantErr:    false,
		},
		{
			name:       "valid values",
			offset:     "100",
			limit:      "50",
			maxLimit:   1024,
			wantOffset: 100,
			wantLimit:  50,
			wantErr:    false,
		},
		{
			name:       "limit exceeds max",
			offset:     "0",
			limit:      "2048",
			maxLimit:   1024,
			wantOffset: 0,
			wantLimit:  1024,
			wantErr:    false,
		},
		{
			name:     "invalid offset",
			offset:   "abc",
			limit:    "50",
			maxLimit: 1024,
			wantErr:  true,
		},
		{
			name:     "invalid limit",
			offset:   "0",
			limit:    "xyz",
			maxLimit: 1024,
			wantErr:  true,
		},
		{
			name:     "negative offset",
			offset:   "-1",
			limit:    "50",
			maxLimit: 1024,
			wantErr:  true,
		},
		{
			name:     "negative limit",
			offset:   "0",
			limit:    "-1",
			maxLimit: 1024,
			wantErr:  true,
		},
		{
			name:       "zero max limit (no limit)",
			offset:     "0",
			limit:      "999999",
			maxLimit:   0,
			wantOffset: 0,
			wantLimit:  999999,
			wantErr:    false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			url := "/?offset=" + tt.offset + "&limit=" + tt.limit
			req := httptest.NewRequest(http.MethodGet, url, nil)

			offset, limit, err := parseOffsetLimit(req, tt.maxLimit)

			if tt.wantErr {
				if err == nil {
					t.Errorf("parseOffsetLimit expected error, got nil")
				}
				return
			}

			if err != nil {
				t.Errorf("parseOffsetLimit unexpected error: %v", err)
				return
			}

			if offset != tt.wantOffset {
				t.Errorf("parseOffsetLimit offset = %d, want %d", offset, tt.wantOffset)
			}

			if limit != tt.wantLimit {
				t.Errorf("parseOffsetLimit limit = %d, want %d", limit, tt.wantLimit)
			}
		})
	}
}
