import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

// On the develop instance (DEPLOY_ENV=develop in the build env), inject a
// noindex meta tag and overwrite robots.txt with a disallow-all so search
// engines don't index develop.marginalia.thebudgetatlas.com. Mirrors the
// Atlas's vite.config.ts plugin.
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
      fs.writeFileSync(
        path.resolve(outDir, 'robots.txt'),
        'User-agent: *\nDisallow: /\n',
      );
    },
  };
}

// Marginalia is built independently from the Atlas. Cloudflare Pages should
// be configured to build from this `marginalia/` subdirectory: `yarn build`
// in this folder, output `marginalia/dist/`.
export default defineConfig({
  plugins: [react(), noindexOnDevelop()],
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
