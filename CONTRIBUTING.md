# Contributing to The Budget Atlas

Thanks for considering a contribution. The Budget Atlas is a free, donation-supported public-good project — a deliberately editorial tool for understanding how Americans actually live on what they earn. Contributions from anyone are welcome: data updates, new cities, bug fixes, accessibility improvements, documentation, or new features from the [roadmap](https://github.com/briancorbin/budget-atlas/issues).

## Ground rules

1. **Every numeric value must be cited.** This is the single most important convention in the project. Tax brackets, rent medians, grocery indices, minimum wages, contribution limits, benefit thresholds — anything the model displays must trace back to a primary source (IRS, BLS, state revenue department, RentCafe / Zillow, etc.) recorded as a `Source` constant in the same data file. Use the `<Cite>` component for inline indicators. The README's Sources section is the canonical master list. Don't ship "round numbers I made up." If a value is genuinely an approximation, label it as such honestly rather than fake-citing.
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
