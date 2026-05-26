import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_APP_BASE || '/',
  server: {
    host: '127.0.0.1',
    proxy: {
      '/auth': {
        target: 'https://cehqcehqsupabase.supabase.co',
        changeOrigin: true,
        secure: true
      },
      '/rest': {
        target: 'https://cehqcehqsupabase.supabase.co',
        changeOrigin: true,
        secure: true
      }
    }
  }
})
