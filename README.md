# File Browser

一个现代化的 Web 文件浏览器应用，支持浏览、预览和下载本地文件系统中的文件。

![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black)
![React](https://img.shields.io/badge/React-19.2.3-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4.1-38BDF8)
![pnpm](https://img.shields.io/badge/pnpm-yes-9A12EF)

## 特性

### 📂 文件浏览
- 直观的文件夹和文件列表展示
- 显示文件大小和修改时间
- 面包屑导航，快速切换目录
- 移动端优先的响应式设计

### 👁️ 文件预览
- **文本文件**: 支持多种编程语言和文本格式
- **图片预览**: JPG、PNG、GIF、SVG、WebP 等
- **Markdown 渲染**: 支持 GitHub Flavored Markdown
- **代码高亮**: 基于 Prism.js 的语法高亮
- **大文件优化**: 自动检测大文件（>50KB），优化渲染性能

### 🎨 用户体验
- 明亮/暗黑主题切换
- 现代紫色主题设计
- 流畅的动画和过渡效果
- 最大化预览窗口，提升查看体验
- 加载更多功能，渐进式显示大文件

### 🚀 性能
- 基于 Next.js 16 的 Turbopack，开发体验极速
- 动态导入，减少初始加载体积
- 大文件分块加载，避免卡顿
- 代码分割，按需加载

## 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) (App Router)
- **UI 库**: [React 19](https://react.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS 4.x](https://tailwindcss.com/)
- **包管理器**: [pnpm](https://pnpm.io/)
- **打包工具**: Turbopack
- **语法高亮**: [react-syntax-highlighter](https://react-syntax-highlighter.github.io/)
- **Markdown 渲染**: [react-markdown](https://github.com/remarkjs/react-markdown)

## 快速开始

### 环境要求

- Node.js >= 18.17.0
- pnpm >= 8.0.0

### 安装

```bash
# 克隆项目
git clone <repository-url>
cd file-browser

# 安装依赖
pnpm install
```

### 配置

创建 `.env.local` 文件设置要浏览的根目录：

```bash
# 可选：设置文件系统根目录（默认为项目目录）
FILE_BROWSER_ROOT=/path/to/your/directory
```

### 开发

```bash
# 启动开发服务器
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建

```bash
# 创建生产构建
pnpm build

# 启动生产服务器
pnpm start
```

## Docker 部署

### 使用 Docker Compose（推荐）

1. **构建镜像**（可选，使用预构建镜像）
```bash
docker build -t file-browser:local .
```

2. **配置环境变量**
```bash
# 复制示例配置文件
cp .env.example .env

# 编辑配置，设置要浏览的目录
vim .env
```

3. **启动服务**
```bash
# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 使用 Docker 直接运行

```bash
# 构建镜像
docker build -t file-browser:latest .

# 运行容器
docker run -d \
  --name file-browser \
  -p 3000:3000 \
  -e FILE_BROWSER_ROOT=/path/to/your/files \
  -v /path/to/your/files:/data:ro \
  krisss/file-browser:latest
```

### 从 Docker Hub 拉取镜像

```bash
docker pull krisss/file-browser:latest

docker run -d \
  --name file-browser \
  -p 3000:3000 \
  -e FILE_BROWSER_ROOT=/data \
  -v /path/to/files:/data:ro \
  krisss/file-browser:latest
```

### 使用 PM2 部署

1. **安装 PM2**
```bash
npm install -g pm2
```

2. **创建 ecosystem.config.js**
```javascript
module.exports = {
  apps: [{
    name: 'file-browser',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3000',
    instances: 1,
    autorestart: true,
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      FILE_BROWSER_ROOT: '/path/to/your/files'
    }
  }]
};
```

3. **启动服务**
```bash
# 构建
pnpm build

# 启动
pm2 start ecosystem.config.js

# 保存进程列表
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs file-browser
```


## 使用指南

### 基本操作

1. **浏览文件**: 点击文件夹进入，点击文件预览
2. **返回上级**: 点击面包屑导航或 ".." 返回上级目录
3. **切换主题**: 点击右上角主题图标切换明亮/暗黑模式
4. **预览文件**: 点击文件名打开预览窗口

### 预览功能

#### Markdown 文件
- 默认显示渲染预览
- 可切换到原文查看
- 支持 GFM（GitHub Flavored Markdown）
- 代码块自动语法高亮

#### 代码文件
- 支持语法高亮预览
- 可切换到原文查看
- 支持的语言：JavaScript、TypeScript、Python、Go、Rust 等
- 大文件自动优化，使用原文模式

#### 大文件处理
- 自动检测文件大小
- 大于 50KB 的文件默认使用原文模式
- 代码高亮支持"加载更多"功能，渐进式显示

### 下载文件

在预览窗口点击"Download"按钮即可下载文件。

## 项目结构

```
file-browser/
├── app/
│   ├── api/              # API 路由
│   │   ├── files/        # 文件列表 API
│   │   ├── preview/     # 文件预览 API
│   │   ├── image/       # 图片预览 API
│   │   └── download/    # 文件下载 API
│   ├── globals.css      # 全局样式和 CSS 变量
│   ├── layout.tsx       # 根布局
│   └── page.tsx         # 主页面
├── components/
│   └── SimpleFileList.tsx  # 文件列表组件
├── docs/                # 项目文档
├── .claude/             # Claude AI 配置
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

## API 路由

### GET /api/files
获取指定目录的文件列表。

**参数**:
- `path`: 目录路径（相对于根目录）

**响应**:
```json
[
  {
    "name": "example.txt",
    "path": "/example.txt",
    "type": "file",
    "extension": "txt",
    "size": 1024,
    "modified": "2024-02-06T10:00:00.000Z"
  }
]
```

### GET /api/preview
获取文件内容用于预览。

**参数**:
- `path`: 文件路径

**限制**:
- 文件大小不超过 1MB
- 仅支持文本文件

### GET /api/image
获取图片文件。

**参数**:
- `path`: 图片文件路径

**支持格式**: JPG、PNG、GIF、SVG、WebP、BMP、ICO

### GET /api/download
下载文件。

**参数**:
- `path`: 文件路径

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `FILE_BROWSER_ROOT` | 文件系统根目录 | 项目目录 |
| `PORT` | 应用端口 | 3000 |
| `NODE_ENV` | 运行环境 | development |

## 开发指南

### 添加新的文件类型支持

1. 在 `app/api/preview/route.ts` 的 `isTextFile` 函数中添加扩展名
2. 在 `components/SimpleFileList.tsx` 的 `isCodeFile` 函数中添加代码文件扩展名
3. 在 `getLanguage` 函数中添加语言映射

### 自定义主题

编辑 `app/globals.css` 中的 CSS 变量：

```css
:root {
  --accent: #8b5cf6;          /* 主题色 */
  --bg-primary: #ffffff;      /* 主背景色 */
  --text-primary: #111827;    /* 主文本色 */
  /* ... */
}
```

### 性能优化建议

- 使用 `React.memo` 包装纯展示组件
- 大文件列表考虑虚拟滚动
- 图片预览使用懒加载
- 代码分割减少初始包大小

## 安全性

- 所有文件路径都经过安全验证，防止路径遍历攻击
- 仅允许浏览指定根目录下的文件
- 不支持文件上传（当前版本）
- 文件预览限制大小（1MB）

## 已知问题

- 暂不支持文件上传功能
- 大于 1MB 的文本文件无法预览
- 二进制文件无法预览

## 发布版本

### 创建版本标签并发布 Docker 镜像

```bash
# 1. 创建版本标签
git tag v1.0.0

# 2. 推送标签到 GitHub
git push origin v1.0.0

# 3. GitHub Actions 会自动：
#    - 构建新的 Docker 镜像
#    - 推送到 Docker Hub (krisss/file-browser:latest, :v1.0.0, :v1, :v1.0)
```

### 版本命名规范

- 主版本：`v1.0.0` - 重大更新
- 次版本：`v1.1.0` - 新功能
- 修订版本：`v1.0.1` - Bug 修复

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 更新日志

### v1.0.0 (2026-02-06)
- 初始版本发布
- 实现文件浏览、预览和下载功能
- 支持 Markdown 和代码高亮
- 主题切换功能
- 移动端响应式设计

---

Made with ❤️ using [Next.js](https://nextjs.org/)
