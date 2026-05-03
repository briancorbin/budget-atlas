import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './', // works for static hosts and GitHub Pages out of the box
  server: {
    host: true,
    port: 5173,
    strictPort: true, // fail instead of silently drifting to 5174/5175
    // Allow Cloudflare quick-tunnel hostnames so `yarn tunnel` works for
    // testing on phones / over cellular. Vite blocks unknown Host headers
    // by default as a DNS-rebinding mitigation; the wildcard scopes the
    // exception to trycloudflare.com only.
    allowedHosts: ['dev.thebudgetatlas.com', '.trycloudflare.com'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
