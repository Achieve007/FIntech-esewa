import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Merchant frontend on 5175 (admin uses 5174, backend 5000)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
})
