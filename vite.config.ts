import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev only: forward /api/* to a separate `vercel dev` instance
    // (started by scripts/dev-with-api.sh) that serves api/*.ts functions.
    // Vite itself keeps serving the frontend, which avoids vercel.json's
    // catch-all SPA rewrite swallowing Vite's own module/asset requests.
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
    },
  },
});
