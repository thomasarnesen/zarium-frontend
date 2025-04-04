// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
 
  build: {
    sourcemap: process.env.NODE_ENV !== 'production',
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
    proxy: {
      // Generell proxy for alle API-kall som håndterer alle ruter
      '/api': {
        target: 'https://zarium-app-ddbnb4egcpf4e6b0.westeurope-01.azurewebsites.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path,
        configure: (proxy) => {
          // Fikse cookies for autentisering
          proxy.on('proxyRes', function(proxyRes: any) {
            const cookies = proxyRes.headers['set-cookie'];
            if (cookies) {
              // @ts-ignore - Ignorer typefeil her
              proxyRes.headers['set-cookie'] = cookies.map((cookie: string) => 
                cookie.replace(/Domain=.+?;/, 'Domain=localhost;')
              );
            }
          });
        }
      }
    }
  },
 
  optimizeDeps: {
    include: ['@stripe/stripe-js'],
    exclude: ['fsevents']
  },
 
  base: '/'
});