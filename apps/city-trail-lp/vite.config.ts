import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      port: 4175,
      host: '0.0.0.0',
      proxy: {
        // Dify API プロキシ（CORS回避）
        '/api/dify': {
          target: 'https://api.dify.ai',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/dify/, ''),
          headers: {
            'Origin': 'https://api.dify.ai',
          },
        },
      },
    },
    plugins: [
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
