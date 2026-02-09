package server

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
)

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

type errorPayload struct {
	Error string `json:"error"`
	Code  string `json:"code"`
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorPayload{Error: message, Code: code})
}

type errorPayloadWithMeta struct {
	Error string         `json:"error"`
	Code  string         `json:"code"`
	Meta  map[string]any `json:"meta"`
}

func writeErrorWithMeta(w http.ResponseWriter, status int, code, message string, meta map[string]any) {
	writeJSON(w, status, errorPayloadWithMeta{Error: message, Code: code, Meta: meta})
}

func statusFromErr(err error) int {
	if err == nil {
		return http.StatusOK
	}
	if errors.Is(err, errAccessDenied) {
		return http.StatusForbidden
	}
	if errors.Is(err, os.ErrNotExist) {
		return http.StatusNotFound
	}
	return http.StatusBadRequest
}

func minInt64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
