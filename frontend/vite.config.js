import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
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
      manifest: {
        name: 'Habi - Aplikacja do śledzenia nawyków',
        short_name: 'Habi',
        description: 'Śledź swoje nawyki z pomocą wirtualnej małpki Habi',
        theme_color: '#FFD23F',
        background_color: '#FFF8DC',
        display: 'standalone',
        scope: '/habi-app/',
        start_url: '/habi-app/',
        icons: [
          {
            src: '/habi-app/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/habi-app/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: '/habi-app/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx']
  }
})