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
    // Proxy /api/* to a backend so the dev server can fetch audit data.
    //
    // Default target is the deployed Worker — zero-effort for UI-only
    // work, no need to spin up local infra. When iterating on the
    // backend itself, run `yarn dev:worker` (wrangler in --local mode)
    // and set AUDIT_PROXY_TARGET=http://localhost:8787 in your shell so
    // the proxy hits the local Worker (with its local D1) instead of
    // production. See audit/links/README.md "Local backend" for the
    // full workflow.
    //
    // The backend has no auth on reads (the data is public), so the
    // default of pointing at prod is safe; writes are gated by
    // AUDIT_WRITE_TOKEN regardless of origin.
    proxy: {
      '/api': {
        target: process.env.AUDIT_PROXY_TARGET ?? 'https://thebudgetatlas.com',
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
