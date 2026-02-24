package main

import (
	"fmt"
	"log"
	"reflect"
	"strings"

	"file-browser/internal/server"
)

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
	cfg, err := server.ParseConfig()
	if err != nil {
		log.Fatal(err)
	}

	srv, err := server.New(cfg)
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("file-browser: %s", formatConfig(cfg))
	r := srv.Handler()
	if err := r.Run(cfg.Addr()); err != nil {
		log.Fatal(err)
	}
}
