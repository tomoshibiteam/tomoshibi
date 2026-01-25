import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const base = isDev ? '/' : '/mobile/';

  return {
    base,
    server: {
      host: "0.0.0.0",
      port: 4176,
      proxy: {
        '/api/dify': {
          target: 'http://127.0.0.1',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dify/, ''),
        },
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      isDev && componentTagger(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'pwa-icon.png'],
        manifest: {
          name: 'TOMOSHIBI | 街歩き×謎解きプラットフォーム',
          short_name: 'TOMOSHIBI',
          description: 'AIで街歩きクエストを生成し、現地で物語と謎解きを楽しむTOMOSHIBIのモバイルアプリ。',
          theme_color: '#006633',
          background_color: '#f0e6d8',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/mobile/',
          scope: '/mobile/',
          icons: [
            {
              src: 'pwa-icon.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable'
            },
            {
              src: 'pwa-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
