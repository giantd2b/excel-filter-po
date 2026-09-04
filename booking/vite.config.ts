import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served under the NestJS API at /booking (apps/api/public/booking)
export default defineConfig({
  plugins: [react()],
  base: '/booking/',
  build: {
    outDir: '../apps/api/public/booking',
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
});
