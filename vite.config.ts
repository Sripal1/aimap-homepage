import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/aimap-homepage/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api/oauth': {
        target: 'https://aimap-oauth.sriranga673.workers.dev',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/oauth/, ''),
      },
    },
  },
})
