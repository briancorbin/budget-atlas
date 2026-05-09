import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// Marginalia is built independently from the Atlas. Cloudflare Pages should
// be configured to build from this `marginalia/` subdirectory: `yarn build`
// in this folder, output `marginalia/dist/`.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // ESM-safe alias resolution — `__dirname` is undefined in ESM.
      // Mirrors the Atlas's vite.config.ts pattern.
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
