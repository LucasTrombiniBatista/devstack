import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  // Caminhos relativos: o mesmo build serve no GitHub Pages (em subpasta) e dentro do Tauri.
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(Date.now().toString(36)),
  },
  build: {
    // Lista dos arquivos gerados, que o service worker guarda para o modo offline.
    manifest: 'asset-manifest.json',
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
