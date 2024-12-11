// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  // Vite 默认处理静态资源，确保正确处理 .glsl 文件
  assetsInclude: ['**/*.glsl'],
})