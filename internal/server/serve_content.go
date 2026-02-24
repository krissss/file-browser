package server

import (
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// httpServeContent wraps http.ServeContent for Gin context
func httpServeContent(c *gin.Context, name string, modTime time.Time, content io.ReadSeeker) {
	http.ServeContent(c.Writer, c.Request, name, modTime, content)
}
