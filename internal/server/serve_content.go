package server

import (
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// httpServeContent 封装 http.ServeContent 以适配 Gin 框架
// 自动处理 Range 请求、Content-Type 检测和缓存头
func httpServeContent(c *gin.Context, name string, modTime time.Time, content io.ReadSeeker) {
	http.ServeContent(c.Writer, c.Request, name, modTime, content)
}
