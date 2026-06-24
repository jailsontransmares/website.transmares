import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve(__dirname, 'hub'),
  publicDir: resolve(__dirname, 'public/hub'),
  build: {
    outDir: resolve(__dirname, 'dist-hub'),
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'hub/index.html')
    }
  }
});
