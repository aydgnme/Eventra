import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Bind to 0.0.0.0 for Docker
    proxy: {
      '/api': {
        // Docker: VITE_API_TARGET=http://gateway:5000
        // Local dev: VITE_API_TARGET=http://localhost:5051
        target: process.env.VITE_API_TARGET ?? 'http://localhost:5051',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
