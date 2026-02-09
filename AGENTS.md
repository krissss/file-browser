# AGENTS

请保持响应简洁，默认使用中文（简体）。

## 项目现状
- 后端：Go 标准库，入口 `cmd/file-browser/main.go`
- 前端：Vue 3 + Vite，目录 `web/`
- 包管理：`pnpm`（仅前端）
- 热更新：`dev.sh`（Go 使用 `air`，前端使用 Vite）
- 构建：`build.sh`（先构建前端，再构建 Go 二进制）

## 工作约定
- 优先修改最少的文件满足需求
- 变更前先说明影响范围
- 涉及构建/运行的改动需更新 README

## 常用命令
- 开发：`./dev.sh`
- 构建：`./build.sh`
- 前端：`cd web && pnpm run dev`

## 注意事项
- `web/` 依赖使用 `pnpm` 管理
- `internal/server/web/dist/` 为构建产物，不纳入版本控制
