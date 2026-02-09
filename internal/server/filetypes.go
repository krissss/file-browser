package server

import (
	"path/filepath"
	"strings"
)

var textExtensions = map[string]struct{}{
	"txt": {}, "md": {}, "markdown": {}, "json": {}, "js": {}, "jsx": {}, "ts": {}, "tsx": {}, "mjs": {}, "cjs": {},
	"css": {}, "html": {}, "xml": {}, "yaml": {}, "yml": {}, "ini": {}, "conf": {},
	"py": {}, "rb": {}, "go": {}, "rs": {}, "java": {}, "c": {}, "cpp": {}, "h": {},
	"sh": {}, "bash": {}, "zsh": {}, "sql": {}, "graphql": {}, "gql": {}, "toml": {},
	"env": {}, "gitignore": {}, "eslintrc": {}, "prettierrc": {},
	"lock": {}, "tsconfig": {}, "dockerfile": {}, "makefile": {},
	"proto": {}, "vue": {}, "svelte": {}, "astro": {},
	"cs": {}, "kt": {}, "kts": {}, "swift": {}, "php": {}, "lua": {}, "scala": {}, "groovy": {},
	"clj": {}, "cljs": {}, "cljc": {}, "gradle": {}, "properties": {},
}

var imageExtensions = map[string]struct{}{
	"jpg": {}, "jpeg": {}, "png": {}, "gif": {}, "svg": {}, "webp": {}, "bmp": {}, "ico": {},
}

func isTextFile(ext string) bool {
	_, ok := textExtensions[ext]
	return ok
}

func isImageFile(ext string) bool {
	_, ok := imageExtensions[ext]
	return ok
}

func fileExtension(name string) string {
	if strings.EqualFold(name, "dockerfile") {
		return "dockerfile"
	}
	lower := strings.ToLower(name)
	if strings.HasPrefix(lower, "dockerfile.") {
		return "dockerfile"
	}
	if strings.EqualFold(name, "makefile") || strings.HasPrefix(lower, "makefile.") {
		return "makefile"
	}
	ext := strings.TrimPrefix(strings.ToLower(filepath.Ext(name)), ".")
	return ext
}
