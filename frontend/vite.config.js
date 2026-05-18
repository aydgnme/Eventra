import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@frontend': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    exclude: ['**/node_modules/**', '**/e2e/**', '**/dist/**', '**/.{idea,git,cache,output,temp}/**'],
  },
  server: {
    host: true,
    watch: {
      usePolling: true,
      interval: 300,
    },
    proxy: {
      '/api': {
        // Docker: VITE_API_TARGET=http://gateway:5000
        // Local dev (docker-compose): gateway is on host port 5050
        target: process.env.VITE_API_TARGET ?? 'http://localhost:5050',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
