// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  build: {
    // Disable source maps in production (eller behold dem hvis du trenger debugging)
    sourcemap: process.env.NODE_ENV !== 'production',
    
    // Simplified rollup options - bare det nødvendige
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
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
  
  // Ensure proper path handling
  base: '/'
});