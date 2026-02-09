package server

import (
	"os"
	"path"
	"path/filepath"
	"strings"
)

func (s *Server) resolvePath(reqPath string) (string, string, error) {
	clean := path.Clean("/" + strings.TrimSpace(reqPath))
	if clean == "." {
		clean = "/"
	}
	rel := strings.TrimPrefix(clean, "/")

	abs := filepath.Join(s.cfg.Root, filepath.FromSlash(rel))
	abs = filepath.Clean(abs)

	rootRel, err := filepath.Rel(s.cfg.Root, abs)
	if err != nil {
		return "", "", err
	}
	if rootRel == ".." || strings.HasPrefix(rootRel, ".."+string(os.PathSeparator)) {
		return "", "", errAccessDenied
	}

	if err := ensureNoSymlink(s.cfg.Root, rel); err != nil {
		return "", "", err
	}

	return abs, rel, nil
}

func ensureNoSymlink(root, rel string) error {
	if rel == "" {
		return nil
	}
	parts := strings.Split(rel, "/")
	current := root
	for _, part := range parts {
		if part == "" {
			continue
		}
		current = filepath.Join(current, part)
		info, err := os.Lstat(current)
		if err != nil {
			return err
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return errAccessDenied
		}
	}
	return nil
}
