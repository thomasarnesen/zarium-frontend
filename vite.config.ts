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
    },
    css: {
      devSourcemap: true,
      postcss: {
        plugins: [
          require('tailwindcss'),
          autoprefixer({
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
    }
  }
})