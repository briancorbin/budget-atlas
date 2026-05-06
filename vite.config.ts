// Use vitest/config so the `test` key is typed without depending on a
// triple-slash directive (tsconfig.node.json has an explicit `types` array
// that suppresses ambient lookups). vitest/config re-exports vite's
// defineConfig with the test field merged in.
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  base: './', // works for static hosts and GitHub Pages out of the box
  // Vitest reads this same config; tests are colocated as `*.test.ts` next
  // to the source they cover. Pure-function libs only — no jsdom needed.
  test: {
    include: ['src/**/*.test.ts'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true, // fail instead of silently drifting to 5174/5175
    // Allow Cloudflare quick-tunnel hostnames so `yarn tunnel` works for
    // testing on phones / over cellular. Vite blocks unknown Host headers
    // by default as a DNS-rebinding mitigation; the wildcard scopes the
    // exception to trycloudflare.com only.
    allowedHosts: ['dev.thebudgetatlas.com', '.trycloudflare.com'],
    // Proxy /api/* to the deployed Cloudflare Worker so the dev server
    // can fetch real audit data without running a local Worker. The
    // backend has no auth on reads (the data is public), so this is
    // safe; the write endpoint is gated by AUDIT_WRITE_TOKEN regardless
    // of where the request comes from.
    proxy: {
      '/api': {
        target: 'https://thebudgetatlas.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
