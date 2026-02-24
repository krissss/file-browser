package server

import (
	"os"
	"path/filepath"
	"testing"
)

func TestResolvePath(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "file-browser-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create some test files and directories
	os.Mkdir(filepath.Join(tmpDir, "subdir"), 0755)
	os.WriteFile(filepath.Join(tmpDir, "test.txt"), []byte("hello"), 0644)

	server := &Server{cfg: Config{Root: tmpDir}}

	tests := []struct {
		name        string
		reqPath     string
		wantRelPath string
		wantErr     bool
		errType     error
	}{
		{
			name:        "root path",
			reqPath:     "/",
			wantRelPath: "",
			wantErr:     false,
		},
		{
			name:        "empty path",
			reqPath:     "",
			wantRelPath: "",
			wantErr:     false,
		},
		{
			name:        "simple directory",
			reqPath:     "/subdir",
			wantRelPath: "subdir",
			wantErr:     false,
		},
		{
			name:        "file path",
			reqPath:     "/test.txt",
			wantRelPath: "test.txt",
			wantErr:     false,
		},
		{
			name:        "double dot in path",
			reqPath:     "/subdir/../test.txt",
			wantRelPath: "test.txt",
			wantErr:     false,
		},
		{
			name:        "path with spaces",
			reqPath:     "  /test.txt  ",
			wantRelPath: "test.txt",
			wantErr:     false,
		},
		{
			name:        "multiple slashes",
			reqPath:     "///test.txt",
			wantRelPath: "test.txt",
			wantErr:     false,
		},
		{
			name:        "dot path",
			reqPath:     ".",
			wantRelPath: "",
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			absPath, relPath, err := server.resolvePath(tt.reqPath)

			if tt.wantErr {
				if err == nil {
					t.Errorf("resolvePath(%q) expected error, got nil", tt.reqPath)
					return
				}
				if tt.errType != nil && err != tt.errType {
					t.Errorf("resolvePath(%q) error = %v, want %v", tt.reqPath, err, tt.errType)
				}
				return
			}

			if err != nil {
				t.Errorf("resolvePath(%q) unexpected error: %v", tt.reqPath, err)
				return
			}

			if relPath != tt.wantRelPath {
				t.Errorf("resolvePath(%q) relPath = %q, want %q", tt.reqPath, relPath, tt.wantRelPath)
			}

			expectedAbs := filepath.Join(tmpDir, tt.wantRelPath)
			if absPath != expectedAbs {
				t.Errorf("resolvePath(%q) absPath = %q, want %q", tt.reqPath, absPath, expectedAbs)
			}
		})
	}
}

func TestEnsureNoSymlink(t *testing.T) {
	// Create a temporary directory for testing
	tmpDir, err := os.MkdirTemp("", "file-browser-symlink-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	// Create a regular file
	regularFile := filepath.Join(tmpDir, "regular.txt")
	os.WriteFile(regularFile, []byte("content"), 0644)

	// Create a directory
	subDir := filepath.Join(tmpDir, "subdir")
	os.Mkdir(subDir, 0755)

	// Create a symlink (only if supported)
	symlinkPath := filepath.Join(tmpDir, "link")
	symlinkCreated := true
	if err := os.Symlink(regularFile, symlinkPath); err != nil {
		// Symlinks might not be supported on this system
		symlinkCreated = false
	}

	tests := []struct {
		name    string
		root    string
		rel     string
		wantErr bool
		skip    bool
	}{
		{
			name:    "empty path",
			root:    tmpDir,
			rel:     "",
			wantErr: false,
		},
		{
			name:    "regular file",
			root:    tmpDir,
			rel:     "regular.txt",
			wantErr: false,
		},
		{
			name:    "directory",
			root:    tmpDir,
			rel:     "subdir",
			wantErr: false,
		},
		{
			name:    "symlink",
			root:    tmpDir,
			rel:     "link",
			wantErr: true,
			skip:    !symlinkCreated,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.skip {
				t.Skip("symlinks not supported on this system")
			}

			err := ensureNoSymlink(tt.root, tt.rel)

			if tt.wantErr {
				if err == nil {
					t.Errorf("ensureNoSymlink(%q, %q) expected error, got nil", tt.root, tt.rel)
				}
				return
			}

			if err != nil {
				t.Errorf("ensureNoSymlink(%q, %q) unexpected error: %v", tt.root, tt.rel, err)
			}
		})
	}
}
