FROM node:24-alpine AS web
ENV CI=true
WORKDIR /app
COPY web ./web
RUN corepack enable && mkdir -p /app/internal/server/web/dist \
  && cd web && pnpm install --frozen-lockfile && pnpm run build

FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
COPY --from=web /app/internal/server/web/dist ./internal/server/web/dist
RUN go build -o /out/file-browser ./cmd/file-browser

FROM alpine:3.19
WORKDIR /app
RUN apk add --no-cache curl tzdata
COPY --from=build /out/file-browser /usr/local/bin/file-browser
EXPOSE 3000
ENV FILE_BROWSER_PATH=/data
ENV FILE_BROWSER_HOST=0.0.0.0
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000/healthz >/dev/null || exit 1

ENTRYPOINT ["file-browser"]
