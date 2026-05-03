# Contributing to The Budget Atlas

Thanks for considering a contribution. The Budget Atlas is a free, donation-supported public-good project — a deliberately editorial tool for understanding how Americans actually live on what they earn. Contributions from anyone are welcome: data updates, new cities, bug fixes, accessibility improvements, documentation, or new features from the [roadmap](https://github.com/TheBudgetAtlas/thebudgetatlas/issues).

## Ground rules

1. **Every numeric value must be cited.** This is the single most important convention in the project. Tax brackets, rent medians, grocery indices, minimum wages, contribution limits, benefit thresholds — anything the model displays must trace back to a `Source` constant in the central registry at [`src/data/sources.ts`](./src/data/sources.ts). Use the `<Cite>` component for inline indicators. The [`/sources`](https://thebudgetatlas.com/sources) page is the public bibliography. Don't ship "round numbers I made up." If a value is genuinely an approximation, label it as such honestly rather than fake-citing — and tag the source with `tier: 'estimate'`.
2. **Be careful with tax math.** Progressive brackets only tax dollars _within_ each bracket at that bracket's rate — never compute "marginal rate × full income." FICA Social Security has a per-person wage base, so dual-earner households need `calcFICA(incomeA) + calcFICA(incomeB)`, not `calcFICA(total)`. The `progressiveTax` helper in `lib/tax.ts` and `computeBudget` in `lib/budget.ts` handle these correctly — extend them rather than reimplementing.
3. **Respect the layer split.** Data, calculation, and presentation each live separately:
   - `src/data/` — reference data only, no logic
   - `src/lib/` — pure functions, no React
   - `src/components/` — React UI; takes a `BudgetResult` and renders
4. **No Tailwind, no CSS framework.** Inline styles using tokens from `src/theme.ts`. Don't hard-code colors. Money goes through `fmt` / `fmtSigned` — never `toString()` a dollar amount and prepend `$`.
5. **TypeScript strict mode is on.** No `any` without a comment explaining why. Functions over classes. Use the `@/` path alias instead of long relative imports.

## Local setup

```bash
yarn install
yarn start          # Vite dev server, usually http://localhost:5173
yarn typecheck
yarn lint
yarn format         # auto-format with Prettier
yarn verify         # typecheck + lint + format check (the gate before opening a PR)
```

Requires Node 20+. Yarn classic (1.x) is the package manager — install via `brew install yarn` or `corepack enable`.

## Common contribution recipes

### Adding a new city

1. Open `src/data/cities.ts`.
2. Add an entry following the existing shape: name, state code, tier, `rent1`, `rent3`, `groceries`, etc.
3. Use realistic 2025–26 medians from RentCafe / Zillow / BLS. Round to the nearest $50 or $100.
4. Cite each number against an entry in `CITY_COL_SOURCES` (or add a new source if needed).
5. The dropdown picks it up automatically.

### Updating tax brackets for a new tax year

1. `src/data/federalTax.ts` — replace federal brackets, standard deduction, SS wage base, and update `FEDERAL_TAX_SOURCE`.
2. `src/data/states.ts` — update state rates, brackets, standard deductions, and minimum wages. Update `STATE_TAX_SOURCE`.
3. `src/components/Masthead.tsx` — bump the "Vol. YYYY" label.
4. `src/components/Notes.tsx` — refresh the data citation footer.
5. Update the README Sources section to match.

### Adding a new pre-built scenario

`src/data/scenarios.ts`. Include a descriptive `label`, the income(s), filing status, city id, kids, and lifestyle. Add `incomeB` if it's a dual-earner scenario.

### Adding a new citation

All citations live in [`src/data/sources.ts`](./src/data/sources.ts) — the single registry. Don't define new `Source` literals outside this file; that defeats the registry and breaks the audit.

When adding a citation, include `addedBy` (your **GitHub username**, no `@` prefix) and `addedAt` (today's date in `YYYY-MM-DD`):

```ts
'irs-rev-proc-2025-32': {
  label: 'IRS Rev. Proc. 2025-32',
  url: 'https://www.irs.gov/pub/irs-drop/rp-25-32.pdf',
  date: '2025-10-09',
  tier: 'original',
  addedBy: 'your-handle',
  addedAt: '2026-MM-DD',
},
```

**Same PR must also append a row to [`audit/links/reviewed.tsv`](./audit/links/reviewed.tsv).** Any change to a source — adding, URL update, data correction, removal, or just affirmative review — pairs with a row. The registry never changes silently. Format:

```
id<TAB>YYYY-MM-DD<TAB>your-handle<TAB>kind<TAB>brief notes describing what you verified or did
```

`id` is the stable source slug from `src/data/sources.ts` (the outer key in `SOURCES`, or `state-${kind}-${code}` for state-agency maps). `kind` is `human` (eyes-on-source, no AI assistance) or `ai` (AI was involved in proposing, extracting, or refreshing the entry). Be honest — if you weren't eyes-on-source, it's `ai`.

A source whose latest state-change isn't paired with a row will be flagged as overdue by the [staleness audit](./audit/staleness/README.md) immediately — by design. The asymmetry catches AI-proposed citations that get merged without an honest provenance row, URL updates made without re-reading the destination, and any human edits where the verification step was skipped. Every category should be visible.

The `addedBy` / `addedAt` fields surface in [`audit/links/status.md`](./audit/links/status.md). They DON'T change when an existing citation's URL gets updated (the citation is the same; the URL just moved). They DO get filled when a new citation is introduced.

### Auditing a cited link

The project runs a public link audit because citations rot — agencies reorganize URLs, PDFs disappear, content gets superseded. Anyone can re-run it:

```bash
yarn check-links
```

This extracts every URL from `src/data/sources.ts`, hits each with curl, and writes a dated TSV to `audit/links/results/`. Status code reference and full philosophy live in [`audit/links/README.md`](./audit/links/README.md).

**The unified rule:** every resolved audit issue — `audit:link` from the nightly bot or `audit:report` from a community submission — writes exactly one row to `audit/links/reviewed.tsv`, regardless of outcome. Whether the resolution was "URL was moved and we updated it," "data needed correction," or "citation was retired," the row in `reviewed.tsv` is the durable record. Code changes (`sources.ts` edit, data-file edit, removal) ride along in the same PR. The PR's `Closes #N` in the description auto-closes the originating issue.

The community-submission form is for **reporting problems only** — broken URLs, drifted content, citations that should be replaced or removed. Affirmative "this is still correct" reviews are reserved for periodic sweeps by maintainers and trusted reviewers, who enter rows directly to `reviewed.tsv` (no issue lifecycle).

**Community-submitted reports must be 100% human** — no AI assistance. Open the URL yourself, read enough to verify the claim, write notes in your own words. The issue form has a required checkbox confirming this. Maintainer rows in `reviewed.tsv` can use either `kind=human` or `kind=ai`, marked honestly — the audit's job is to make the level of human involvement transparent, not absent. AI assistance is fine when it's labelled honestly; what isn't fine is laundering AI work as `human`.

### Updating branding

The favicons and OG share card render from SVG masters at `public/favicon.svg` and `public/og-image.svg`. Edit those, then run:

```bash
yarn render-branding
```

This regenerates all 6 PNGs via `rsvg-convert` + system fontconfig. Prerequisites are documented in `scripts/render-branding.sh`.

## What's deliberately out of scope (for now)

These are real things real households deal with, but the model omits them for tractability. Each is a candidate roadmap item — if you want to tackle one, please open an issue first to discuss the modeling approach before writing code:

- 401(k) / HSA / FSA pre-tax contributions
- Student loan payments
- Mortgage / homeownership (vs. renting)
- Investment income / capital gains
- ACA marketplace health insurance (the model assumes employer-sponsored)
- Self-employment income / SE tax
- ITIN / non-resident filing
- Detailed EITC nuances (investment-income tests, age 25–64 childless rule)

Suggest a data-driven minimum approach rather than hand-wavy estimates.

## Pull request checklist

- [ ] `yarn verify` passes locally
- [ ] Any new numeric values trace back to a cited `Source` constant
- [ ] New components stay small and composable; logic lives in `lib/` not in components
- [ ] No new dependencies unless you've checked there isn't a small inline solution
- [ ] If you touched tax math, sanity-checked with a quick mental example
- [ ] If you touched data, the README Sources section is updated to match
- [ ] Commit messages explain the _why_ (a one-line summary then a paragraph if the reason isn't obvious)

## Code of conduct

Be kind and direct. Disagree with ideas, not people. The project covers personal-finance topics that touch on inequality, family structure, and political choices about taxation — debate the modeling honestly without making it about anyone's personal circumstances.

## License

By contributing you agree that your contributions will be licensed under the project's [MIT license](./LICENSE).

## Questions

Open an issue, or for anything sensitive email brian@thebudgetatlas.com
