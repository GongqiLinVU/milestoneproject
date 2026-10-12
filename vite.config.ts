import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local dev AND local preview both forward /api/* to a separate `vercel dev`
// instance (started by scripts/dev-with-api.sh) that serves api/*.ts functions.
// Vite itself keeps serving the frontend, which avoids vercel.json's catch-all
// SPA rewrite swallowing Vite's own module/asset requests. This proxy is a
// LOCAL convenience only — it changes nothing about hosted production routing,
// which is handled by vercel.json on Vercel.
const apiProxy = {
  '/api': {
    target: process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:3010',
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  // dev server (`vite`): serves source modules + proxies /api.
  server: { proxy: apiProxy },
  // production preview (`vite preview`): serves the built dist/ + proxies /api,
  // so the production bundle can be exercised locally against the same local
  // API functions. Local serving is NOT proof of hosted production acceptance.
  preview: { proxy: apiProxy },
});
