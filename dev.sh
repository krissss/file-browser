#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
RUNTIME_DIR="$ROOT_DIR/runtime"

ROOT_PATH=${ROOT_PATH:-.}
HOST=${HOST:-127.0.0.1}
PORT=${PORT:-3000}
WEB_PORT=${WEB_PORT:-5173}

cd "$ROOT_DIR"
mkdir -p "$RUNTIME_DIR"

if ! command -v air >/dev/null 2>&1; then
  GOPATH_BIN="$(go env GOPATH)/bin"
  if [ -x "$GOPATH_BIN/air" ]; then
    export PATH="$GOPATH_BIN:$PATH"
  else
    echo "air not found. Install: go install github.com/air-verse/air@latest" >&2
    exit 1
  fi
fi

export FILE_BROWSER_PATH="$ROOT_PATH"
export FILE_BROWSER_HOST="$HOST"
export FILE_BROWSER_PORT="$PORT"
air -c .air.toml >"$RUNTIME_DIR/file-browser-air.log" 2>&1 &
AIR_PID=$!
trap 'kill $AIR_PID' EXIT

cd "$ROOT_DIR/web"

if [ ! -d "node_modules" ]; then
  pnpm install
fi

pnpm run dev -- --host "$HOST" --port "$WEB_PORT" --strictPort
