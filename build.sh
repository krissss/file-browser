#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)

# 接受 base path 参数，默认为 '/'
BASE_PATH="${1:-/}"

cd "$ROOT_DIR/web"

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm not found. Install: corepack enable" >&2
  exit 1
fi

pnpm install
VITE_BASE_PATH="$BASE_PATH" pnpm run build

cd "$ROOT_DIR"

go build -o file-browser ./cmd/file-browser
