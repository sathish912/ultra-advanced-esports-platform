import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'ULTRA ESPORTS',
        short_name: 'ULTRA',
        description: 'Advanced Competitive eSports Platform',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 10000000 // 10MB
      }
    }),
  ],
  resolve: {
    alias: {
      'es-toolkit/compat/get': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/get.js'),
      'es-toolkit/compat/range': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/range.js'),
      'es-toolkit/compat/omit': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/omit.js'),
      'es-toolkit/compat/maxBy': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/maxBy.js'),
      'es-toolkit/compat/sumBy': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/sumBy.js'),
      'es-toolkit/compat/sortBy': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/sortBy.js'),
      'es-toolkit/compat/throttle': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/throttle.js'),
      'es-toolkit/compat/minBy': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/minBy.js'),
      'es-toolkit/compat/last': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/last.js'),
      'es-toolkit/compat/isPlainObject': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/isPlainObject.js'),
      'es-toolkit/compat/uniqBy': path.resolve(import.meta.dirname, 'src/es-toolkit-compat/uniqBy.js'),
    }
  }
})



