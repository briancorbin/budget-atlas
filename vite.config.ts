// Use vitest/config so the `test` key is typed without depending on a
// triple-slash directive (tsconfig.node.json has an explicit `types` array
// that suppresses ambient lookups). vitest/config re-exports vite's
// defineConfig with the test field merged in.
import { defineConfig, type Plugin } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// On the develop instance (DEPLOY_ENV=develop in the build env), inject a
// noindex meta tag and write a disallow-all robots.txt so search engines
// don't index develop.thebudgetatlas.com.
function noindexOnDevelop(): Plugin {
  const isDevelop = process.env.DEPLOY_ENV === 'develop';
  let outDir = 'dist';
  return {
    name: 'noindex-on-develop',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    transformIndexHtml(html) {
      if (!isDevelop) return html;
      return html.replace(
        '</head>',
        '    <meta name="robots" content="noindex, nofollow" />\n  </head>',
      );
    },
    closeBundle() {
      if (!isDevelop) return;
      fs.writeFileSync(path.resolve(outDir, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
    },
  };
}

export default defineConfig({
  plugins: [react(), noindexOnDevelop()],
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
    // Default target is the deployed develop Worker — UI work hits develop
    // data so prod isn't the staging surface. Three modes:
    //   - `yarn dev`       → develop (this default)
    //   - `yarn dev:local` → local wrangler worker (with local D1)
    //   - `yarn dev:prod`  → production (read-only safe; writes are gated
    //                        by AUDIT_WRITE_TOKEN regardless of origin)
    // Each script sets AUDIT_PROXY_TARGET explicitly; this fallback only
    // kicks in if you run `vite` outside the package scripts.
    proxy: {
      '/api': {
        target: process.env.AUDIT_PROXY_TARGET ?? 'https://develop.thebudgetatlas.com',
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
