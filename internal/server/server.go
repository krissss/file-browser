package server

import (
	"bytes"
	"embed"
	"errors"
	"io/fs"
	"net/http"
	"path"
	"strings"
)

//go:embed web/dist/* web/dist/assets/*
var embeddedDist embed.FS

type Server struct {
	cfg    Config
	static fs.FS
	index  []byte
}

func New(cfg Config) (*Server, error) {
	sub, err := fs.Sub(embeddedDist, "web/dist")
	if err != nil {
		return nil, err
	}
	index, err := fs.ReadFile(sub, "index.html")
	if err != nil {
		return nil, err
	}

	return &Server{
		cfg:    cfg,
		static: sub,
		index:  index,
	}, nil
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/files", s.handleFiles)
	mux.HandleFunc("/api/preview", s.handlePreview)
	mux.HandleFunc("/api/image", s.handleImage)
	mux.HandleFunc("/api/download", s.handleDownload)
	mux.HandleFunc("/", s.handleStatic)
	return mux
}

func (s *Server) handleStatic(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	requestPath := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
	if requestPath == "" || requestPath == "." {
		s.serveIndex(w, r)
		return
	}

	file, err := s.static.Open(requestPath)
	if err != nil {
		s.serveIndex(w, r)
		return
	}
	defer file.Close()

	info, err := file.Stat()
	if err != nil || info.IsDir() {
		s.serveIndex(w, r)
		return
	}

	data, err := fs.ReadFile(s.static, requestPath)
	if err != nil {
		w.WriteHeader(http.StatusNotFound)
		return
	}

	http.ServeContent(w, r, info.Name(), info.ModTime(), bytes.NewReader(data))
}

func (s *Server) serveIndex(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(s.index)
}

var errAccessDenied = errors.New("access denied")
