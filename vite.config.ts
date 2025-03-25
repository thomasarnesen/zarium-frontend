import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import autoprefixer from 'autoprefixer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProd = mode === 'production';

  return {
    plugins: [react()],
    
    build: {
      // Disable source maps in production for better performance and security
      sourcemap: !isProd,
      // Improve build performance
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd
        }
      },
      // Improve chunking strategy
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            stripe: ['@stripe/stripe-js']
          },
          // Only include source in maps during development
          sourcemapExcludeSources: isProd
        }
      },
      // Reduce build size
      chunkSizeWarningLimit: 1000
    },
    
    server: {
      port: 5176,
      strictPort: true,
      cors: true,
      hmr: {
        overlay: true
      }
    },
    
    optimizeDeps: {
      include: ['@stripe/stripe-js'],
      exclude: ['fsevents']
    },
    
    // Add this to ensure proper path handling in production
    base: '/',
    
    // Improved CSS handling with enhanced autoprefixer settings
    css: {
      devSourcemap: true,
      postcss: {
        plugins: [
          require('tailwindcss'),
          require('autoprefixer')({
            overrideBrowserslist: [
              "defaults",
              "not IE 11",
              "> 1%", 
              "last 2 versions",
              "Firefox ESR",
              "Safari >= 10"
            ],
            grid: true
          })
        ]
      }
    },
    
    // Better error handling
    logLevel: 'info'
  };
});