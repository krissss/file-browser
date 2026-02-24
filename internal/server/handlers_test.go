package server

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// HandlerTestSuite 使用 testify suite 管理测试生命周期
type HandlerTestSuite struct {
	suite.Suite
	server *Server
	tmpDir string
	router *gin.Engine
}

// SetupSuite 在所有测试之前运行
func (s *HandlerTestSuite) SetupSuite() {
	// 创建临时目录
	tmpDir, err := os.MkdirTemp("", "file-browser-handler-test-*")
	require.NoError(s.T(), err)
	s.tmpDir = tmpDir

	// 创建测试文件结构
	require.NoError(s.T(), os.Mkdir(filepath.Join(tmpDir, "subdir"), 0755))
	require.NoError(s.T(), os.WriteFile(filepath.Join(tmpDir, "test.txt"), []byte("hello world"), 0644))
	require.NoError(s.T(), os.WriteFile(filepath.Join(tmpDir, "subdir", "nested.txt"), []byte("nested content"), 0644))

	// 创建服务器
	server, err := New(Config{
		Root:       tmpDir,
		Host:       "127.0.0.1",
		Port:       3000,
		PreviewMax: 1024 * 1024,
	})
	require.NoError(s.T(), err)
	s.server = server
	s.router = server.Handler()
}

// TearDownSuite 在所有测试之后运行
func (s *HandlerTestSuite) TearDownSuite() {
	if s.tmpDir != "" {
		assert.NoError(s.T(), os.RemoveAll(s.tmpDir))
	}
}

// makeRequest 辅助函数
func (s *HandlerTestSuite) makeRequest(method, url string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, url, nil)
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, req)
	return w
}

func (s *HandlerTestSuite) TestHandleHealth() {
	w := s.makeRequest(http.MethodGet, "/healthz")

	assert.Equal(s.T(), http.StatusOK, w.Code)
	assert.JSONEq(s.T(), `{"status":"ok"}`, w.Body.String())
}

func (s *HandlerTestSuite) TestHandleFiles_RootDirectory() {
	w := s.makeRequest(http.MethodGet, "/api/files?path=/")

	assert.Equal(s.T(), http.StatusOK, w.Code)
	assert.NotEmpty(s.T(), w.Body.String())
	// 验证返回的是 JSON 数组
	assert.JSONEq(s.T(), w.Body.String(), w.Body.String()) // 验证是有效 JSON
}

func (s *HandlerTestSuite) TestHandleFiles_Subdirectory() {
	w := s.makeRequest(http.MethodGet, "/api/files?path=/subdir")

	assert.Equal(s.T(), http.StatusOK, w.Code)
}

func (s *HandlerTestSuite) TestHandleFiles_NonExistent() {
	w := s.makeRequest(http.MethodGet, "/api/files?path=/nonexistent")

	assert.Equal(s.T(), http.StatusNotFound, w.Code)
}

func (s *HandlerTestSuite) TestHandlePreview_TextFile() {
	w := s.makeRequest(http.MethodGet, "/api/preview?path=/test.txt")

	assert.Equal(s.T(), http.StatusOK, w.Code)
	assert.Contains(s.T(), w.Body.String(), "content")
	assert.Contains(s.T(), w.Body.String(), "hello world")
}

func (s *HandlerTestSuite) TestHandlePreview_NestedFile() {
	w := s.makeRequest(http.MethodGet, "/api/preview?path=/subdir/nested.txt")

	assert.Equal(s.T(), http.StatusOK, w.Code)
	assert.Contains(s.T(), w.Body.String(), "nested content")
}

func (s *HandlerTestSuite) TestHandlePreview_WithOffsetAndLimit() {
	w := s.makeRequest(http.MethodGet, "/api/preview?path=/test.txt&offset=0&limit=5")

	assert.Equal(s.T(), http.StatusOK, w.Code)
}

func (s *HandlerTestSuite) TestHandlePreview_Directory() {
	w := s.makeRequest(http.MethodGet, "/api/preview?path=/subdir")

	assert.Equal(s.T(), http.StatusBadRequest, w.Code)
}

func (s *HandlerTestSuite) TestHandlePreview_NonExistent() {
	w := s.makeRequest(http.MethodGet, "/api/preview?path=/nonexistent.txt")

	assert.Equal(s.T(), http.StatusNotFound, w.Code)
}

func (s *HandlerTestSuite) TestHandlePreview_InvalidOffset() {
	w := s.makeRequest(http.MethodGet, "/api/preview?path=/test.txt&offset=invalid")

	assert.Equal(s.T(), http.StatusBadRequest, w.Code)
}

func (s *HandlerTestSuite) TestHandlePreview_NegativeOffset() {
	w := s.makeRequest(http.MethodGet, "/api/preview?path=/test.txt&offset=-1")

	assert.Equal(s.T(), http.StatusBadRequest, w.Code)
}

func (s *HandlerTestSuite) TestHandleDownload_File() {
	w := s.makeRequest(http.MethodGet, "/api/download?path=/test.txt")

	assert.Equal(s.T(), http.StatusOK, w.Code)
	assert.Contains(s.T(), w.Header().Get("Content-Disposition"), "attachment")
	assert.Contains(s.T(), w.Header().Get("Content-Disposition"), "test.txt")
}

func (s *HandlerTestSuite) TestHandleDownload_NonExistent() {
	w := s.makeRequest(http.MethodGet, "/api/download?path=/nonexistent.txt")

	assert.Equal(s.T(), http.StatusNotFound, w.Code)
}

func (s *HandlerTestSuite) TestHandleDownload_Directory() {
	w := s.makeRequest(http.MethodGet, "/api/download?path=/subdir")

	assert.Equal(s.T(), http.StatusBadRequest, w.Code)
}

func (s *HandlerTestSuite) TestHandleSearch_WithQuery() {
	w := s.makeRequest(http.MethodGet, "/api/search?path=/&q=test")

	assert.Equal(s.T(), http.StatusOK, w.Code)
}

func (s *HandlerTestSuite) TestHandleSearch_EmptyQuery() {
	w := s.makeRequest(http.MethodGet, "/api/search?path=/&q=")

	assert.Equal(s.T(), http.StatusOK, w.Code)
	assert.JSONEq(s.T(), `[]`, w.Body.String())
}

func (s *HandlerTestSuite) TestHandleSearch_Recursive() {
	w := s.makeRequest(http.MethodGet, "/api/search?path=/&q=nested&recursive=true")

	assert.Equal(s.T(), http.StatusOK, w.Code)
}

func (s *HandlerTestSuite) TestStatusFromErr() {
	tests := []struct {
		name     string
		err      error
		expected int
	}{
		{"nil error", nil, http.StatusOK},
		{"access denied", errAccessDenied, http.StatusForbidden},
		{"not exist", os.ErrNotExist, http.StatusNotFound},
		{"other error", assert.AnError, http.StatusBadRequest},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			assert.Equal(s.T(), tt.expected, statusFromErr(tt.err))
		})
	}
}

// 运行 suite
func TestHandlerSuite(t *testing.T) {
	suite.Run(t, new(HandlerTestSuite))
}
