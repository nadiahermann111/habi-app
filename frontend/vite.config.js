import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}']
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Habi - Aplikacja do śledzenia nawyków',
        short_name: 'Habi',
        description: 'Śledź swoje nawyki z pomocą wirtualnej małpki Habi',
        theme_color: '#FFD23F',
        background_color: '#FFF8DC',
        display: 'standalone',
        scope: '/NAZWA-TWOJEGO-REPO/', // ⚠️ ZMIEŃ NA NAZWĘ SWOJEGO REPO
        start_url: '/NAZWA-TWOJEGO-REPO/', // ⚠️ ZMIEŃ NA NAZWĘ SWOJEGO REPO
        icons: [
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-72x72.png', // ⚠️ Dodano base path
            sizes: '72x72',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: '/NAZWA-TWOJEGO-REPO/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      }
    })
  ],
  base: '/habi-app/', // ⚠️ ZMIEŃ NA NAZWĘ SWOJEGO REPO
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  }
})