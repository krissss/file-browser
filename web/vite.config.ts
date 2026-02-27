import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: '', // 使用相对路径，让浏览器根据 <base> 标签解析
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:3000'
    }
  },
  build: {
    outDir: '../internal/server/web/dist',
    emptyOutDir: true
  }
})
