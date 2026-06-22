import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api/* to the Express server so the browser never talks to the
    // football API directly — keeps the API key server-side.
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
