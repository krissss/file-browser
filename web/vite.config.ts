import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '',  // 使用相对路径，让浏览器根据 <base> 标签解析
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
