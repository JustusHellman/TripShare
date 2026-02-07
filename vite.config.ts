
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages deploys to a subfolder (the repo name), so we must set the base path.
  // This ensures assets like /index.js are correctly mapped to /HereAndThere/index.js
  base: '/HereAndThere/',
  define: {
    // This allows process.env to work in the browser during the build
    'process.env': process.env
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
