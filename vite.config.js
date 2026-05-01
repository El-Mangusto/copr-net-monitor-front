import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 4200,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist'
  }
})