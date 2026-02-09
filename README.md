# File Browser (Go + Vue)

一个单文件可执行的本地文件浏览器：Go 标准库后端 + Vue 3 前端，内嵌静态资源，`file-browser --path=./ --port=3000` 即可启动服务。

## 功能

- 文件/目录浏览，面包屑导航
- 文本、代码、Markdown、图片预览
- 下载文件
- 明暗主题切换
- 大文件分段预览（默认预览上限 1MB，可配置）
- 安全路径校验，禁止符号链接

## 构建

### 本地构建

```bash
# 一键构建
./build.sh

# 或手动构建
# 构建前端
cd web
pnpm install
pnpm run build

# 构建后端
cd ..
go build -o file-browser ./cmd/file-browser
```

## 使用

### 单文件运行

```bash
./file-browser --path=./ --port=3000
```

访问 `http://127.0.0.1:3000`。

### Docker

```bash
docker run -d \
  --name file-browser \
  -p 3000:3000 \
  -v /path/to/files:/data:ro \
  -e FILE_BROWSER_PATH=/data \
  -e FILE_BROWSER_HOST=0.0.0.0 \
  -e FILE_BROWSER_PORT=3000 \
  krisss/file-browser:latest
```

### 常用参数

- `--path` 根目录（默认 `.`）
- `--port` 端口（默认 `3000`）
- `--host` 绑定地址（默认 `127.0.0.1`）
- `--preview-max` 预览上限（默认 `1MB`）

### 环境变量（前缀 FILE_BROWSER_）

- `FILE_BROWSER_PATH`：等同 `--path`
- `FILE_BROWSER_HOST`：等同 `--host`
- `FILE_BROWSER_PORT`：等同 `--port`
- `FILE_BROWSER_PREVIEW_MAX`：等同 `--preview-max`

未显式传参数时，会使用以上环境变量作为默认值；参数优先级高于环境变量。

示例：

```bash
./file-browser --path=/data --host=0.0.0.0 --port=3000 --preview-max=20MB
```

## 开发

前端使用 Vite 开发服务器，`/api` 请求自动代理到本地 Go 服务。

需要安装 `air`：

```bash
go install github.com/air-verse/air@latest
```

```bash
./dev.sh
```

默认：
- API：`http://127.0.0.1:3000`
- 前端：`http://127.0.0.1:5173`

## API

- `GET /api/files?path=/sub` 列出目录
- `GET /api/preview?path=/file.txt[&offset=0&limit=65536]` 文本预览
- `GET /api/image?path=/img.png` 图片预览
- `GET /api/download?path=/file.bin` 文件下载

错误返回：

```json
{ "error": "message", "code": "ERROR_CODE" }
```
