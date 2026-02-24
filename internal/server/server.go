package server

import (
	"bytes"
	"errors"
	"io/fs"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
)

type Server struct {
	cfg    Config
	static fs.FS
	index  []byte
}

func New(cfg Config) (*Server, error) {
	sub, err := fs.Sub(embeddedDist, "web/dist")
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			sub = embeddedDist
		} else {
			return nil, err
		}
	}
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

func (s *Server) Handler() *gin.Engine {
	r := gin.New()
	r.Use(gin.Recovery())

	// API routes
	r.GET("/api/files", s.handleFiles)
	r.GET("/api/search", s.handleSearch)
	r.GET("/api/preview", s.handlePreview)
	r.GET("/api/image", s.handleImage)
	r.GET("/api/download", s.handleDownload)
	r.GET("/healthz", s.handleHealth)

	// Static files and SPA fallback
	r.NoRoute(s.handleStatic)

	return r
}

func (s *Server) handleStatic(c *gin.Context) {
	requestPath := strings.TrimPrefix(path.Clean("/"+c.Request.URL.Path), "/")
	if requestPath == "" || requestPath == "." {
		s.serveIndex(c)
		return
	}

	file, err := s.static.Open(requestPath)
	if err != nil {
		s.serveIndex(c)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil || info.IsDir() {
		s.serveIndex(c)
		return
	}

	data, err := fs.ReadFile(s.static, requestPath)
	if err != nil {
		c.Status(404)
		return
	}

	httpServeContent(c, info.Name(), info.ModTime(), bytes.NewReader(data))
}

func (s *Server) serveIndex(c *gin.Context) {
	c.Data(200, "text/html; charset=utf-8", s.index)
}

var errAccessDenied = errors.New("access denied")
