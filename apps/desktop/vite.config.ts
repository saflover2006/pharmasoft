import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@repo/database': path.resolve(__dirname, '../../packages/database/src'),
    },
  },
  optimizeDeps: {
    exclude: ['@repo/database'],
  },
})
