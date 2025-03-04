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
    port: 5176, // Match your current port
    strictPort: true, // Allow fallback to other ports if needed
    cors: true
  },
  optimizeDeps: {
    include: ['@stripe/stripe-js'],
    exclude: ['fsevents']
  }
});