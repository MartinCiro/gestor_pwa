import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: {
    allowedHosts: [
      'localhost',
      '127.0.0.1'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
      '@components': path.resolve(import.meta.dirname, './src/components'),
      '@ui': path.resolve(import.meta.dirname, './src/components/ui'),
      '@views': path.resolve(import.meta.dirname, './src/components/views'),
      '@composables': path.resolve(import.meta.dirname, './src/composables'),
      '@styles': path.resolve(import.meta.dirname, './src/styles'),
      '@utils': path.resolve(import.meta.dirname, './src/utils'),
    },
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // 100MB: fuerza a inlinar imágenes pequeñas
  }
})
