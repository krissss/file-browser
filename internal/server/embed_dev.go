//go:build dev

package server

import (
	"io/fs"
	"os"
)

var embeddedDist fs.FS = os.DirFS(".")
