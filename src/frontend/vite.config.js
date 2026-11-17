import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The Flask API will be added in a later stage. Keeping a relative proxy
// placeholder here makes the switch from mock data to the REST API simple.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
