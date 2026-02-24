// file-browser 文件浏览器入口程序
package main

import (
	"fmt"
	"log"
	"reflect"
	"strings"

	"file-browser/internal/server"
)

// formatConfig 将配置格式化为可读字符串，用于日志输出
func formatConfig(cfg server.Config) string {
	value := reflect.ValueOf(cfg)
	typ := value.Type()
	parts := make([]string, 0, typ.NumField())
	for i := 0; i < typ.NumField(); i++ {
		field := typ.Field(i)
		name := toKebab(field.Name)
		parts = append(parts, fmt.Sprintf("%s=%v", name, value.Field(i).Interface()))
	}
	return strings.Join(parts, " ")
}

// toKebab 将驼峰命名转换为 kebab-case
// 例如：PreviewMax -> preview-max
func toKebab(input string) string {
	var b strings.Builder
	for i, r := range input {
		if i > 0 && r >= 'A' && r <= 'Z' {
			b.WriteByte('-')
		}
		b.WriteRune(r)
	}
	return strings.ToLower(b.String())
}

func main() {
	// 解析命令行配置
	cfg, err := server.ParseConfig()
	if err != nil {
		log.Fatal(err)
	}

	// 创建服务器实例
	srv, err := server.New(cfg)
	if err != nil {
		log.Fatal(err)
	}

	// 输出配置信息并启动服务
	log.Printf("file-browser: %s", formatConfig(cfg))
	r := srv.Handler()
	if err := r.Run(cfg.Addr()); err != nil {
		log.Fatal(err)
	}
}
