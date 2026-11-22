import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the Vite dev server forwards /api to the FastAPI backend,
// so the browser never makes cross-origin requests.
const apiTarget = process.env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
  preview: {
    port: 4173,
    proxy: { '/api': { target: apiTarget, changeOrigin: true } },
  },
})
