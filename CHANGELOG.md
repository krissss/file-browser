# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [v0.2.0] - 2026-02-24

### Added

- 添加前后端单元测试（Vitest + testify）
- Web 组件化架构：拆分 App.vue 为 7 个可复用组件和 3 个 composables
- GitHub Actions 测试工作流

### Changed

- 将 HTTP 框架从 net/http 迁移到 Gin
- 统一 GitHub Actions 中的 Node (24) 和 Go (1.22) 版本
- 添加中文注释提升代码可读性

### Fixed

- 修复 Dockerfile 缺少 go.sum 导致的构建失败

## [v0.1.4] - 2026-02-14

### Added

- 添加目录搜索功能
- 移动端样式优化
- 优化 Markdown 渲染

### Fixed

- 修复变量名遮蔽 path 包的构建错误
- 修复 .gitignore 等配置文件无法预览的问题

### Changed

- 添加项目徽章和 MIT 许可证

## [v0.1.3] - 2026-02-10

### Fixed
- (ci) 避免 CLI 发布工作流中的竞态条件

### Changed
- (release) 简化发布配置，移除包管理相关文件

## [v0.1.2] - 2026-02-10

### Changed
- (web) 拆分文件类型识别和预览渲染器

### Fixed
- 支持带 v 前缀的版本号格式
- (dev) 允许在没有内嵌构建产物的情况下运行
- (web) 修复 Markdown 主题与暗黑模式对齐问题

## [v0.1.1] - 2026-02-09

### Added
- 添加 Changelog 自动化工具和发布流程

### Changed
- 在 AGENTS.md 中添加发布流程说明

### Fixed
- 容器中添加 tzdata 时区数据，使 TZ 环境变量生效

## [v0.1.0] - 2026-02-09

### Added
- Go + Vue 单文件应用，支持文件预览、下载与主题切换。
- Docker 镜像构建与发布流程。
- 健康检查接口 `/healthz` 与容器健康检查。

### Changed
- 更新 README 与构建/开发脚本，以适配 Go + Vue 方案。

[Unreleased]: https://github.com/krissss/file-browser/compare/v0.2.0...HEAD
[v0.2.0]: https://github.com/krissss/file-browser/compare/v0.1.4...v0.2.0
[v0.1.4]: https://github.com/krissss/file-browser/compare/v0.1.3...v0.1.4
[v0.1.3]: https://github.com/krissss/file-browser/compare/v0.1.2...v0.1.3
[v0.1.2]: https://github.com/krissss/file-browser/compare/v0.1.1...v0.1.2
[v0.1.1]: https://github.com/krissss/file-browser/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/krissss/file-browser/releases/tag/v0.1.0
