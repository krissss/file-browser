package server

import (
	"errors"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

const (
	defaultHost             = "127.0.0.1"
	defaultPort             = 3000
	defaultPreviewMax       = 1 * 1024 * 1024
)

type Config struct {
	Root       string
	Host       string
	Port       int
	PreviewMax int64
}

func (c Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func ParseConfig() (Config, error) {
	var cfg Config

	fs := flag.NewFlagSet(os.Args[0], flag.ContinueOnError)
	fs.StringVar(&cfg.Root, "path", ".", "root path to serve")
	fs.StringVar(&cfg.Host, "host", defaultHost, "host to bind")
	fs.IntVar(&cfg.Port, "port", defaultPort, "port to listen on")
	previewMax := fs.String("preview-max", "1MB", "max preview size (e.g. 1MB, 512KB)")

	applyEnvDefaults(fs)
	if err := fs.Parse(os.Args[1:]); err != nil {
		return Config{}, err
	}

	maxBytes, err := parseBytes(*previewMax)
	if err != nil {
		return Config{}, fmt.Errorf("invalid --preview-max: %w", err)
	}

	if cfg.Root == "" {
		return Config{}, errors.New("--path is required")
	}

	absRoot, err := filepath.Abs(cfg.Root)
	if err != nil {
		return Config{}, fmt.Errorf("resolve root: %w", err)
	}

	info, err := os.Lstat(absRoot)
	if err != nil {
		return Config{}, fmt.Errorf("root not accessible: %w", err)
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return Config{}, errors.New("root path cannot be a symlink")
	}
	if !info.IsDir() {
		return Config{}, errors.New("root path must be a directory")
	}

	cfg.Root = absRoot
	if maxBytes <= 0 {
		maxBytes = defaultPreviewMax
	}
	cfg.PreviewMax = maxBytes

	return cfg, nil
}

func applyEnvDefaults(fs *flag.FlagSet) {
	fs.VisitAll(func(f *flag.Flag) {
		key := "FILE_BROWSER_" + strings.ToUpper(strings.ReplaceAll(f.Name, "-", "_"))
		if v, ok := os.LookupEnv(key); ok {
			_ = f.Value.Set(v)
			f.DefValue = v
		}
	})
}

func parseBytes(input string) (int64, error) {
	value := strings.TrimSpace(strings.ToUpper(input))
	if value == "" {
		return 0, errors.New("empty size")
	}
	if value == "0" {
		return 0, nil
	}

	multiplier := int64(1)
	for _, suffix := range []struct {
		s string
		m int64
	}{
		{"KB", 1024},
		{"K", 1024},
		{"MB", 1024 * 1024},
		{"M", 1024 * 1024},
		{"GB", 1024 * 1024 * 1024},
		{"G", 1024 * 1024 * 1024},
	} {
		if strings.HasSuffix(value, suffix.s) {
			multiplier = suffix.m
			value = strings.TrimSuffix(value, suffix.s)
			break
		}
	}

	value = strings.TrimSpace(value)
	if value == "" {
		return 0, errors.New("invalid size")
	}

	parsed, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return 0, err
	}
	if parsed < 0 {
		return 0, errors.New("size must be >= 0")
	}

	return int64(parsed * float64(multiplier)), nil
}
