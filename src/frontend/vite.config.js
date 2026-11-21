import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Flask API runs on port 5000. The proxy keeps browser requests on the
// same origin during development, so the frontend uses relative `/api` URLs.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
})
