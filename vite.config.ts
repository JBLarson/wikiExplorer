import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom'],
          'graph': ['react-force-graph-3d'],
          'state': ['zustand', '@tanstack/react-query'],
        }
      }
    }
  },
  // Force cache invalidation on dev server restart
  cacheDir: '.vite',
  optimizeDeps: {
    force: true  // Force re-optimization on restart
  }
})