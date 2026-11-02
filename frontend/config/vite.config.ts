import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// ═══════════════════════════════════════════════════════════════════════════════
//  ZYRO AI — v1.6.5 — Vite Configuration
//  © 2026 John Ruenz, Philippines
// ═══════════════════════════════════════════════════════════════════════════════

// Structure:
// - package.json: frontend/ (root)
// - node_modules: frontend/ (root)
// - config files: frontend/config/
// - index.html: frontend/public/
// - source code: frontend/src/

export default defineConfig({
  // Config file is in config/ folder, resolve paths relative to parent
  root: path.resolve(__dirname, '..'),
  publicDir: 'public',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '..', 'src')
    }
  },
  server: {
    port: 7004,
    proxy: {
      '/api': {
        target: 'http://localhost:5004',
        changeOrigin: true,
      }
    }
  },
  build: {
    // Output directory relative to project root
    outDir: 'dist',
    emptyOutDir: true,
    // Explicitly specify index.html location (Option C: index.html in public/)
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, '..', 'public', 'index.html')
      }
    }
  }
})