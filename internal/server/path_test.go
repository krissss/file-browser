package server

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/stretchr/testify/suite"
)

// PathTestSuite 路径测试套件
type PathTestSuite struct {
	suite.Suite
	tmpDir string
	server *Server
}

func (s *PathTestSuite) SetupSuite() {
	// 创建临时目录
	tmpDir, err := os.MkdirTemp("", "file-browser-path-test-*")
	require.NoError(s.T(), err)
	s.tmpDir = tmpDir

	// 创建测试文件结构
	require.NoError(s.T(), os.Mkdir(filepath.Join(tmpDir, "subdir"), 0755))
	require.NoError(s.T(), os.WriteFile(filepath.Join(tmpDir, "test.txt"), []byte("hello"), 0644))

	s.server = &Server{cfg: Config{Root: tmpDir}}
}

func (s *PathTestSuite) TearDownSuite() {
	if s.tmpDir != "" {
		assert.NoError(s.T(), os.RemoveAll(s.tmpDir))
	}
}

func (s *PathTestSuite) TestResolvePath_RootPath() {
	absPath, relPath, err := s.server.resolvePath("/")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "", relPath)
	assert.Equal(s.T(), s.tmpDir, absPath)
}

func (s *PathTestSuite) TestResolvePath_EmptyPath() {
	absPath, relPath, err := s.server.resolvePath("")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "", relPath)
	assert.Equal(s.T(), s.tmpDir, absPath)
}

func (s *PathTestSuite) TestResolvePath_SimpleDirectory() {
	absPath, relPath, err := s.server.resolvePath("/subdir")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "subdir", relPath)
	assert.Equal(s.T(), filepath.Join(s.tmpDir, "subdir"), absPath)
}

func (s *PathTestSuite) TestResolvePath_FilePath() {
	absPath, relPath, err := s.server.resolvePath("/test.txt")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "test.txt", relPath)
	assert.Equal(s.T(), filepath.Join(s.tmpDir, "test.txt"), absPath)
}

func (s *PathTestSuite) TestResolvePath_DoubleDotInPath() {
	absPath, relPath, err := s.server.resolvePath("/subdir/../test.txt")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "test.txt", relPath)
	assert.Equal(s.T(), filepath.Join(s.tmpDir, "test.txt"), absPath)
}

func (s *PathTestSuite) TestResolvePath_PathWithSpaces() {
	absPath, relPath, err := s.server.resolvePath("  /test.txt  ")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "test.txt", relPath)
	assert.Equal(s.T(), filepath.Join(s.tmpDir, "test.txt"), absPath)
}

func (s *PathTestSuite) TestResolvePath_MultipleSlashes() {
	absPath, relPath, err := s.server.resolvePath("///test.txt")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "test.txt", relPath)
	assert.Equal(s.T(), filepath.Join(s.tmpDir, "test.txt"), absPath)
}

func (s *PathTestSuite) TestResolvePath_DotPath() {
	absPath, relPath, err := s.server.resolvePath(".")

	assert.NoError(s.T(), err)
	assert.Equal(s.T(), "", relPath)
	assert.Equal(s.T(), s.tmpDir, absPath)
}

// SymlinkTestSuite 符号链接测试套件
type SymlinkTestSuite struct {
	suite.Suite
	tmpDir        string
	regularFile   string
	symlinkPath   string
	symlinkExists bool
}

func (s *SymlinkTestSuite) SetupSuite() {
	// 创建临时目录
	tmpDir, err := os.MkdirTemp("", "file-browser-symlink-test-*")
	require.NoError(s.T(), err)
	s.tmpDir = tmpDir

	// 创建常规文件
	s.regularFile = filepath.Join(tmpDir, "regular.txt")
	require.NoError(s.T(), os.WriteFile(s.regularFile, []byte("content"), 0644))

	// 创建目录
	require.NoError(s.T(), os.Mkdir(filepath.Join(tmpDir, "subdir"), 0755))

	// 尝试创建符号链接
	s.symlinkPath = filepath.Join(tmpDir, "link")
	if err := os.Symlink(s.regularFile, s.symlinkPath); err == nil {
		s.symlinkExists = true
	}
}

func (s *SymlinkTestSuite) TearDownSuite() {
	if s.tmpDir != "" {
		assert.NoError(s.T(), os.RemoveAll(s.tmpDir))
	}
}

func (s *SymlinkTestSuite) TestEnsureNoSymlink_EmptyPath() {
	err := ensureNoSymlink(s.tmpDir, "")
	assert.NoError(s.T(), err)
}

func (s *SymlinkTestSuite) TestEnsureNoSymlink_RegularFile() {
	err := ensureNoSymlink(s.tmpDir, "regular.txt")
	assert.NoError(s.T(), err)
}

func (s *SymlinkTestSuite) TestEnsureNoSymlink_Directory() {
	err := ensureNoSymlink(s.tmpDir, "subdir")
	assert.NoError(s.T(), err)
}

func (s *SymlinkTestSuite) TestEnsureNoSymlink_Symlink() {
	if !s.symlinkExists {
		s.T().Skip("symlinks not supported on this system")
	}

	err := ensureNoSymlink(s.tmpDir, "link")
	assert.ErrorIs(s.T(), err, errAccessDenied)
}

// 运行测试套件
func TestPathSuite(t *testing.T) {
	suite.Run(t, new(PathTestSuite))
}

func TestSymlinkSuite(t *testing.T) {
	suite.Run(t, new(SymlinkTestSuite))
}
