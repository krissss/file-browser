package server

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestMinInt64(t *testing.T) {
	tests := []struct {
		name     string
		a        int64
		b        int64
		expected int64
	}{
		{"a < b", 1, 2, 1},
		{"a > b", 5, 3, 3},
		{"a == b", 4, 4, 4},
		{"negative values", -5, 3, -5},
		{"both negative", -10, -5, -10},
		{"zero values", 0, 0, 0},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := minInt64(tt.a, tt.b)
			if result != tt.expected {
				t.Errorf("minInt64(%d, %d) = %d, want %d", tt.a, tt.b, result, tt.expected)
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
		{"other error", errors.New("some error"), http.StatusBadRequest},
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

func TestWriteJSON(t *testing.T) {
	tests := []struct {
		name       string
		status     int
		payload    any
		wantStatus int
		wantBody   string
	}{
		{
			name:       "simple object",
			status:     http.StatusOK,
			payload:    map[string]string{"message": "hello"},
			wantStatus: http.StatusOK,
			wantBody:   `{"message":"hello"}`,
		},
		{
			name:       "array",
			status:     http.StatusOK,
			payload:    []string{"a", "b", "c"},
			wantStatus: http.StatusOK,
			wantBody:   `["a","b","c"]`,
		},
		{
			name:       "created status",
			status:     http.StatusCreated,
			payload:    map[string]int{"id": 1},
			wantStatus: http.StatusCreated,
			wantBody:   `{"id":1}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			writeJSON(w, tt.status, tt.payload)

			if w.Code != tt.wantStatus {
				t.Errorf("writeJSON status = %d, want %d", w.Code, tt.wantStatus)
			}

			contentType := w.Header().Get("Content-Type")
			if contentType != "application/json; charset=utf-8" {
				t.Errorf("Content-Type = %s, want application/json; charset=utf-8", contentType)
			}

			// Trim newline from JSON encoder output
			body := w.Body.String()
			if body != tt.wantBody+"\n" {
				t.Errorf("writeJSON body = %q, want %q", body, tt.wantBody+"\n")
			}
		})
	}
}

func TestWriteError(t *testing.T) {
	w := httptest.NewRecorder()
	writeError(w, http.StatusBadRequest, "INVALID_PATH", "path is invalid")

	if w.Code != http.StatusBadRequest {
		t.Errorf("writeError status = %d, want %d", w.Code, http.StatusBadRequest)
	}

	contentType := w.Header().Get("Content-Type")
	if contentType != "application/json; charset=utf-8" {
		t.Errorf("Content-Type = %s, want application/json; charset=utf-8", contentType)
	}

	expected := `{"error":"path is invalid","code":"INVALID_PATH"}` + "\n"
	if w.Body.String() != expected {
		t.Errorf("writeError body = %q, want %q", w.Body.String(), expected)
	}
}

func TestWriteErrorWithMeta(t *testing.T) {
	w := httptest.NewRecorder()
	meta := map[string]any{"path": "/test", "reason": "not found"}
	writeErrorWithMeta(w, http.StatusNotFound, "NOT_FOUND", "resource not found", meta)

	if w.Code != http.StatusNotFound {
		t.Errorf("writeErrorWithMeta status = %d, want %d", w.Code, http.StatusNotFound)
	}

	// Check that the response contains the expected fields
	body := w.Body.String()
	if body == "" {
		t.Error("writeErrorWithMeta body is empty")
	}
}
