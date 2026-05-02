# The Budget Atlas

> An interactive examination of how Americans live on what they earn — across cities, tax regimes, and household configurations.

Built on 2026 IRS brackets, state tax data, BLS price indices, and median rents. Models federal, state, and FICA taxes (with proper progressive bracket math), childcare, housing, and discretionary income across single-earner and dual-earner households.

## Quick start

```bash
npm install
npm run dev      # vite dev server, usually http://localhost:5173
npm run build    # production build to dist/
npm run preview  # preview the production build
npm run typecheck
```

Requires Node 20+.

## Project structure

```
src/
├── main.tsx                  React entry
├── App.tsx                   Renders BudgetExplorer
├── index.css                 Reset + body font
├── theme.ts                  Color tokens, fonts, chart palette
├── types.ts                  Shared TS types
│
├── data/                     Reference data — edit these to update for a new tax year
│   ├── federalTax.ts         2026 federal brackets, std deduction, SS wage base, sources
│   ├── states.ts             State graduated brackets, std deductions, min wage, sources
│   ├── cities.ts             ~20 curated city profiles + 51 statewide-default fallbacks + sources
│   └── scenarios.ts          Pre-built archetype households
│
├── lib/                      Pure functions — no React, easy to test
│   ├── format.ts             fmt, fmtSigned, fmtPct
│   ├── tax.ts                progressiveTax, FICA, CTC, EITC
│   └── budget.ts             computeBudget — the main calculation
│
└── components/               Each major UI section in its own file
    ├── BudgetExplorer.tsx    Top-level: holds state, renders sections
    ├── Masthead.tsx          Title block
    ├── Inputs.tsx            ScenarioPicker + CustomizePanel
    ├── Summary.tsx           StatRow + StatusBanner
    ├── IncomeFlow.tsx        Waterfall chart: paycheck → take-home
    ├── ExpenseBreakdown.tsx  Pie + itemized list
    ├── DiscretionaryPlan.tsx 50/20/20/10 split of surplus
    ├── CityComparison.tsx    Side-by-side same-income comparison
    ├── Notes.tsx             Footer notes / commentary
    └── ui.tsx                Stat, SectionTitle, CustomTooltip primitives
```

The split is deliberate: data, calculation, and presentation each live separately, so updating one (e.g. swapping in 2027 tax brackets) doesn't ripple through the others.

## How the math works

**Federal income tax**: progressive brackets per filing status. Standard deduction subtracted before brackets apply. Child Tax Credit ($2,000/child under 17, refundable up to $1,700/child) and EITC (fully refundable, approximated with phase-in/plateau/phase-out) reduce the bill — net federal tax can go negative for low-income families.

**State tax**: real graduated brackets per filing status, with state-specific standard deductions. Same `progressiveTax` machinery as federal. Flat-tax states (CO, IL, PA, etc.) use a single positive bracket; no-tax states (TX, FL, WA, etc.) use a single 0% bracket; high-tax states with detailed schedules (CA, NY, NJ, OR, HI, MN, MA's millionaire surtax, MD, CT, VT, ME, NM, RI, WI, DC) carry their full bracket structure.

**FICA**: per-person calculation. 6.2% Social Security up to $181K wage base, plus 1.45% Medicare on all wages, plus 0.9% Additional Medicare over $200K. Two earners at $200K each pay more SS than one earner at $400K — the per-person cap is preserved.

**Filing status × dual-earner combinations**:

- _Married filing jointly_: combined income, MFJ brackets, single std deduction
- _Cohabitating partners_: each files separately as a single, each gets their own std deduction and brackets
- _Single earner_: standard

## Deployment

The live site is hosted on **Cloudflare Pages** at [thebudgetatlas.com](https://thebudgetatlas.com). Pushes to `main` auto-deploy via Cloudflare's GitHub integration — framework preset "Vite", build command `npm run build`, output directory `dist`, `NODE_VERSION=20`.

The build is fully static and works on any static host. Alternatives that need zero code change (`base: './'` in `vite.config.ts` keeps asset paths relative):

- **Vercel** / **Netlify**: connect the GitHub repo, pick the Vite preset.
- **GitHub Pages**: build with `npm run build`, publish `dist/` via `actions/deploy-pages`.

## Updating for a new tax year

1. Edit `src/data/federalTax.ts` with the new brackets and standard deduction. Update `FEDERAL_TAX_SOURCE.date` to the new IRS Rev. Proc. publication date.
2. Edit `src/data/states.ts` with updated state brackets, std deductions, and minimum wages. Update the `STATE_TAX_SOURCE.date` accordingly.
3. Edit `src/data/cities.ts` if rent or other costs have shifted significantly; update entries in `CITY_COL_SOURCES` if you swap providers.
4. Update the masthead "Vol. 2026" in `src/components/Masthead.tsx`.

## Sources

This is an editorial reference tool. Every numeric value the model displays is traceable to a published source — see the inline `ⁱ` indicators in the app and the consolidated list in the page footer. Source constants live alongside the data they cite (`src/data/federalTax.ts`, `src/data/states.ts`, `src/data/cities.ts`).

### Federal taxes

- **IRS Rev. Proc. 2025-32** ([link](https://www.irs.gov/pub/irs-drop/rp-25-32.pdf)) — 2026 income tax brackets, standard deductions, OBBBA-adjusted CTC parameters
- **SSA Contribution and Benefit Base** ([link](https://www.ssa.gov/oact/cola/cbb.html)) — Social Security wage base

### State taxes

- **Tax Foundation: 2026 State Income Tax Rates and Brackets** ([link](https://taxfoundation.org/data/all/state/state-income-tax-rates/)) — consolidated brackets and flat rates by state. State revenue department pages are more authoritative for any single state; we use Tax Foundation as the cross-state aggregator.
- **NCSL State Minimum Wage Chart** ([link](https://www.ncsl.org/labor-and-employment/state-minimum-wages)) — 2026 effective minimum wages
- **U.S. Dept. of Labor State Minimum Wage Rates** — federal floor reference

### Cost of living (per city)

- **RentCafe National Apartment List** ([link](https://www.rentcafe.com/average-rent-market-trends/us/)) — 1BR / 3BR median rents
- **Zillow Observed Rent Index** ([link](https://www.zillow.com/research/data/)) — cross-check on rent medians
- **BLS Consumer Expenditure Survey** ([link](https://www.bls.gov/cex/)) — groceries, utilities, transportation
- **Care.com Cost of Care Report** ([link](https://www.care.com/c/cost-of-childcare/)) — childcare cost by metro
- **KFF Employer Health Benefits Survey** ([link](https://www.kff.org/health-costs/report/employer-health-benefits-annual-survey/)) — employer-sponsored health insurance premiums
- **Numbeo cost-of-living indices** ([link](https://www.numbeo.com/cost-of-living/)) — third-party cross-check

### Cost of living (statewide fallbacks)

When the user picks a state without a curated city, the model falls back to a **statewide-average** profile derived from these aggregators. Values are deliberately rounded approximations (rent to nearest $50, others to $10) and labeled "approx." in the UI.

- **HUD Fair Market Rents (FY2026)** ([link](https://www.huduser.gov/portal/datasets/fmr.html)) — state-area weighted 1BR / 3BR rents
- **BLS Consumer Expenditure Survey — regional** ([link](https://www.bls.gov/cex/tables.htm)) — groceries + transportation by Census region
- **EIA Residential Energy Consumption** ([link](https://www.eia.gov/consumption/residential/)) — state utility averages
- **Child Care Aware — Price of Care** ([link](https://www.childcareaware.org/state-fact-sheets/)) — state infant + preschool monthly cost
- **KFF Employer Health Benefits — state averages** ([link](https://www.kff.org/health-costs/report/employer-health-benefits-annual-survey/)) — state premium averages
- **AAA Your Driving Costs** ([link](https://newsroom.aaa.com/auto/your-driving-costs/)) — state-adjusted vehicle ownership cost

### Rent calculation logic

The rent _value_ comes from the sources above, but the rule that picks **which** rent (1BR / 1BR×1.2 / 3BR) is its own piece of editorial methodology:

- Solo, no kids → 1BR rent. Grounded in HUD occupancy guidance.
- Couple, no kids → 1BR × 1.2. HUD says two people fit a 1BR; the 20% premium is editorial — Zillow rent-by-bedroom data shows 1BR→2BR runs ~25–30% in most metros, so 1.2× treats the household as "blended" between staying in a 1BR and stepping up to a small 2BR.
- Any kids → 3BR family-sized. Matches HUD FMR's family benchmark and EPI's Family Budget Calculator, both of which use 3BR for households with children regardless of count.
- Lifestyle multiplier: ×0.9 modest, ×1.0 moderate, ×1.15 comfortable. Editorial, not from a single dataset — rough match for the spread between "modest yet adequate" and "comfortable" tiers in EPI / BLS CES decile data.

Sources for the data-grounded parts: **HUD Occupancy Standards** ([link](https://www.hud.gov/sites/dfiles/OCHCO/documents/4350.3.pdf)), **EPI Family Budget Calculator methodology** ([link](https://www.epi.org/resources/budget/budget-factsheets/)), **Zillow Rent by Bedroom** ([link](https://www.zillow.com/research/data/)). The editorial parts (1.2× couple premium, lifestyle multipliers) are flagged as approximations rather than fake-cited.

### A note on precision

City-level numbers are approximate medians, rounded to the nearest $50–$100 for readability. Statewide-average profiles are coarser still — they collapse intra-state variation (Manhattan vs. Buffalo, Bay Area vs. Bakersfield) into a single number. Both are appropriate for an editorial model exploring orders of magnitude — not for personal financial planning. Tax bracket numbers are rounded to clean values; they'll be off from a real return by 1–3% from index-adjustment timing.

## Caveats baked into the model

- Assumes employer-sponsored health insurance (no ACA marketplace pricing)
- Renting only (no mortgage / homeownership math)
- No student loans, no consumer debt servicing
- No 401(k) pre-tax contributions reducing taxable income
- Childcare modeled as a single rate × number of kids — doesn't differentiate infant vs. school-age
- EITC is approximated with the basic structure; real EITC has investment-income tests and more

These would all be reasonable additions. See `lib/budget.ts` for where they'd plug in.

## Contributing

Contributions welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md) for project conventions (the citation requirement, the data/lib/components layer split, tax-math gotchas, recipes for adding cities or tax years).

## License

MIT — see [LICENSE](./LICENSE).
