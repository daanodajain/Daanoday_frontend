import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // New deployment should take over immediately instead of waiting for
      // all tabs to close before the new service worker activates.
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Daanoday Temple Management',
        short_name: 'Daanoday',
        description: 'Multi-tenant temple donation management system',
        theme_color: '#f97316',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
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
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Force the new service worker to activate immediately on deploy,
        // and clear out any old cached assets from previous deployments,
        // instead of leaving a stale version "waiting" until all tabs close.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ddback\.daanoday\.com\//i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-cache'
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})