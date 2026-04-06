import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
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
