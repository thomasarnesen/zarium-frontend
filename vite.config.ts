import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        sourcemapExcludeSources: false
      }
    }
  },
  server: {
    port: 5176,
    strictPort: true,
    cors: true
  },
  optimizeDeps: {
    include: ['@stripe/stripe-js'],
    exclude: ['fsevents']
  },
  // Add this to ensure proper path handling in production
  base: '/'
});