import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/auth': apiUrl,
        '/vehicles': apiUrl,
        '/users': apiUrl,
        '/drivers': apiUrl,
        '/patients': apiUrl,
        '/trips': apiUrl,
      },
    },
  }
})
