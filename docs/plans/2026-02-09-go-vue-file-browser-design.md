# Go + Vue 文件浏览器重构设计

## 目标

- 提供 `file-browser --path=./ --port=3000` 形式的 CLI 启动方式。
- 单一 Go 二进制，内嵌前端静态资源，运行时无需额外依赖。
- 功能对齐现有版本：文件浏览、预览（文本/代码/Markdown/图片）、下载、主题切换、大文件优化。
- 允许隐藏文件，不跟随符号链接。
- 代码简洁、易读、易维护。

## 范围与非目标

- 范围：仅实现浏览与预览，不支持上传、编辑或删除。
- 非目标：多用户权限、鉴权系统、复杂搜索与索引。

## 架构

后端使用 Go 标准库 `net/http`。前端使用 Vue 3 + Vite 构建，产物 `web/dist` 由 Go 的 `embed` 内嵌。服务启动后同时提供 API 与静态资源：

- 静态资源：`/` 返回 `index.html`，其余静态资源走内嵌文件系统。
- API：`/api/files`、`/api/preview`、`/api/image`、`/api/download`。

CLI 提供：

- `--path` 根目录（必填，默认 `.`）。
- `--port` 端口（默认 3000）。
- `--host` 绑定地址（默认 `127.0.0.1`）。
- `--preview-max` 预览上限（默认 10MB，`0` 表示不限制）。

## 后端设计

### 路由

- `GET /api/files?path=/sub`：返回目录列表。
- `GET /api/preview?path=/file.txt[&offset=0&limit=65536]`：返回文本/Markdown/代码内容。
- `GET /api/image?path=/img.png`：返回图片内容。
- `GET /api/download?path=/file.bin`：下载文件。

### 核心规则

- 使用 `filepath.Clean`、`filepath.Join` 与根目录前缀校验，阻止路径穿越。
- 使用 `Lstat` 拒绝符号链接。
- 允许隐藏文件（不过滤 `.` 开头文件/目录）。
- `preview-max` 限制文本预览。超过时返回 `413` 并带 `maxBytes` 字段。
- MIME 类型由 `net/http` 与扩展名判断，图片走白名单。

### 错误处理

统一 JSON 响应：

```json
{ "error": "message", "code": "SOME_CODE" }
```

- 400：非法参数或路径。
- 403：越界路径或符号链接。
- 404：路径不存在。
- 413：超过 `preview-max`。
- 415：不支持的图片类型。
- 500：未处理错误。

## 前端设计

### 组件

- `FileList`：目录与文件列表，点击进入或预览。
- `Breadcrumbs`：面包屑导航。
- `PreviewPanel`：文本/Markdown/代码高亮/图片预览。
- `Toolbar`：下载、主题切换。

### 数据流

- 初始请求 `GET /api/files?path=/` 获取根目录。
- 点击目录后重新请求对应路径。
- 点击文件后根据扩展名请求 `preview` 或 `image`。
- 大文件按 `offset/limit` 分段加载或提示下载。

## 构建与发布

- 前端：`vite build` 输出到 `web/dist`。
- 后端：`go build` 生成 `file-browser`，内嵌 `web/dist`。
- 可选 `make build`，统一前端构建与后端编译。

## 测试

- 后端：`httptest` 覆盖路径安全、隐藏文件、符号链接拒绝、大小限制、MIME 类型与错误码。
- 前端：`vitest` 覆盖路径处理与核心 UI 逻辑（轻量）。
- CLI：参数解析最小化用例。

## 里程碑

1. 搭建 Go 服务与 CLI。
2. 实现文件 API 与安全策略。
3. 搭建 Vue 前端与 API 对接。
4. 内嵌前端产物并完成打包。
5. 补齐测试与文档。
