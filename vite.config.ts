import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
    proxy: {
      '/api/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (['ECONNABORTED', 'ECONNRESET', 'EPIPE', 'ECONNREFUSED'].includes(err.code)) {
              return;
            }
            console.warn('[Vite WS Proxy Error]:', err.message);
          });
        }
      },
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err: any) => {
            if (['ECONNABORTED', 'ECONNRESET', 'EPIPE', 'ECONNREFUSED'].includes(err.code)) {
              return;
            }
            console.warn('[Vite API Proxy Error]:', err.message);
          });
        }
      }
    }
  }
});
