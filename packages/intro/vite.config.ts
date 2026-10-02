import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

const packageRoot = fileURLToPath(new URL('.', import.meta.url))
const captureRoot = fileURLToPath(new URL('./capture', import.meta.url))

export default defineConfig({
  root: packageRoot,
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    open: '/capture/',
  },
  build: {
    outDir: `${packageRoot}/dist`,
    emptyOutDir: true,
    rollupOptions: {
      input: `${captureRoot}/index.html`,
    },
  },
})
