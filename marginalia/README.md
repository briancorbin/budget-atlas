# Marginalia

Companion publication to [The Budget Atlas](https://thebudgetatlas.com).
Weekly notes from working with AI on the Atlas — what worked, where I
faltered, the good, the bad, the weird, the ugly.

Lives at **marginalia.thebudgetatlas.com**.

## Format

Every post has a **Raw / Edited** toggle at the top.

- **Edited** — the narrative reflection, copy-edited collaboratively.
  Includes a "Field Notes" section consolidating the week's AI-tooling
  observations grouped by theme.
- **Raw** — immutable transcript: my words plus any Claude prompts that
  preceded them, plus verbatim journal entries from the week.

The toggle is the load-bearing transparency device — readers can verify
the editorial framing against the source material.

## Stack

Standalone Vite + React + TypeScript app, isolated from the Atlas's
build. Posts are TSX modules in `src/posts/` (no markdown layer for v0 —
TSX gives type-checked content with first-class formatting). Theme
tokens are copied from the Atlas's `src/theme.ts`; if either gets out of
sync it should be obvious in the visual.

```bash
yarn install     # install deps
yarn dev         # dev server
yarn build       # static output to dist/
yarn typecheck   # tsc --noEmit
```

## Deploy (one-time setup, then automatic per push)

The Atlas's main site is on Cloudflare Pages. Marginalia uses a
**second** Cloudflare Pages project on the same account, configured to
build from this `marginalia/` subdirectory:

1. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to
   Git → select `TheBudgetAtlas/thebudgetatlas`.
2. **Build settings:**
   - Framework preset: `None` (we drive Vite manually)
   - Build command: `corepack enable && yarn install --immutable && yarn build`
   - Build output directory: `dist`
   - Root directory: `marginalia`
   - Environment variables: `NODE_VERSION=22`
3. **Custom domain:** add `marginalia.thebudgetatlas.com`. Cloudflare
   will create the CNAME automatically since the apex is already on
   Cloudflare DNS.
4. Enable Cloudflare Web Analytics on the new Pages project (same
   privacy posture as the Atlas — see [/privacy](https://thebudgetatlas.com/privacy)).

That's it. Pushes to `main` trigger a build; preview deploys are created
for PRs.

## Adding a post

1. Create `src/posts/post-N.tsx` exporting a `Post` with `slug`,
   `number`, `title`, `date`, `dek`, `editorial`, optionally
   `fieldNotes`, and `raw`.
2. Add it to `src/posts/index.ts` (newest first).
3. Append the new entry to `public/rss.xml` and `public/sitemap.xml`.
   These are hand-maintained for v0 — automate when it's annoying.

## Conventions

- **Raw is immutable after publish.** The editorial half can be
  revised; the Raw half is the historical record. Editing it
  retroactively collapses the entire transparency device.
- **Substance comes from Brian.** AI assistants on this repo can
  copy-edit and propose structural shape, but must not invent
  observations or claims. See `CLAUDE.md` for the full rule.
- **Field Notes synthesis is allowed** — opening framing paragraph,
  per-section throughlines, and a closing "What I'm watching for"
  section are sanctioned because Raw is one toggle away (so
  synthesis can be verified, not laundered).
