import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = ['.cosmoplat.cn', '.cosmoplat.com', '.cosmoplat.net', '.monkeycode-ai.online']
const proxy = {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
  },
}

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts,
    proxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    allowedHosts,
    proxy,
  },
})
