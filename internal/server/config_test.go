package server

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseBytes(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		expected    int64
		expectError bool
	}{
		{"empty string", "", 0, true},
		{"zero", "0", 0, false},
		{"bytes only", "1024", 1024, false},
		{"KB suffix", "1KB", 1024, false},
		{"K suffix", "2K", 2048, false},
		{"MB suffix", "1MB", 1024 * 1024, false},
		{"M suffix", "2M", 2 * 1024 * 1024, false},
		{"GB suffix", "1GB", 1024 * 1024 * 1024, false},
		{"G suffix", "1G", 1024 * 1024 * 1024, false},
		{"lowercase suffix", "1kb", 1024, false},
		{"with spaces", "1 KB", 1024, false},
		{"decimal value", "1.5MB", int64(1.5 * 1024 * 1024), false},
		{"negative value", "-1KB", 0, true},
		{"invalid suffix", "1XB", 0, true},
		{"invalid number", "abc", 0, true},
		{"only suffix", "KB", 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := parseBytes(tt.input)

			if tt.expectError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

func TestConfigAddr(t *testing.T) {
	tests := []struct {
		name     string
		cfg      Config
		expected string
	}{
		{
			name:     "default values",
			cfg:      Config{Host: "127.0.0.1", Port: 3000},
			expected: "127.0.0.1:3000",
		},
		{
			name:     "custom values",
			cfg:      Config{Host: "0.0.0.0", Port: 8080},
			expected: "0.0.0.0:8080",
		},
		{
			name:     "localhost",
			cfg:      Config{Host: "localhost", Port: 5000},
			expected: "localhost:5000",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, tt.cfg.Addr())
		})
	}
}
