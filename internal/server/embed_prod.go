//go:build !dev

package server

import "embed"

//go:embed web/dist/* web/dist/assets/*
var embeddedDist embed.FS
