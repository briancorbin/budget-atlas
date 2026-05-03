# Budget Atlas — Project Context for Claude

This file is intended to be pasted into the **Project instructions** of a Claude.ai project, so Claude has full context when helping iterate on this codebase. It's also useful documentation in its own right.

---

## What this is

The Budget Atlas is an interactive React app that lets users explore how Americans at different income levels live across different US cities and household configurations. It models federal/state/FICA taxes, cost of living, childcare, and discretionary income for single, married, head-of-household, and cohabitating-dual-earner households.

The aesthetic is deliberately editorial — think _The Atlantic_ meets _Bloomberg Terminal_ — not a SaaS dashboard. Cream background, deep red accent, Fraunces serif headlines, IBM Plex body and mono. Data-dense without feeling cluttered.

## Tech stack

- **React 18** + **TypeScript** (strict mode)
- **Vite** for dev server and build
- **Recharts** for charts (waterfall, pie)
- **No CSS framework** — inline styles using a theme token object. This is a deliberate choice for a data-heavy single-page tool; resist the urge to add Tailwind unless the app outgrows this approach.
- **No state management library** — `useState` and `useMemo` are sufficient. If state grows complex, prefer lifting state to `BudgetExplorer.tsx` before reaching for Zustand or Redux.

## Project layout

The repo is organized into three layers, each with a clear responsibility:

```
src/data/        Reference data (tax brackets, city costs, scenarios). No logic.
src/lib/         Pure functions (tax math, formatting, budget composition). No React.
src/components/  React UI. Each major section is its own file.
```

When adding a feature, ask: which layer does this belong in? A new tax credit goes in `lib/tax.ts` and is wired into `lib/budget.ts`. A new city goes in `data/cities.ts`. A new chart or visualization gets its own component file.

## Calculation correctness

Tax math is the foundation of this app. Be careful with:

- **Progressive brackets**: only the dollars within each bracket are taxed at that bracket's rate. The `progressiveTax` helper in `lib/tax.ts` handles this; never compute "marginal rate × full income" anywhere.
- **Standard deduction**: subtracted before brackets apply.
- **FICA per person**: Social Security has a per-person wage base. Two earners at $200K each pay more SS than one at $400K. Always call `calcFICA(incomeA) + calcFICA(incomeB)` for dual-earner households, not `calcFICA(totalIncome)`.
- **Refundable credits**: CTC is refundable up to $1,700/child (2026 OBBBA); EITC is fully refundable. Net federal tax can be negative for low-income families with children. The `computeBudget` function intentionally allows this.
- **Filing status × dual-earner combinations**: married → MFJ joint return; single/HoH + 2 incomes → each files separately as singles. These produce different totals (marriage bonus for asymmetric, marriage penalty for two equal high earners >$770K combined).

When making changes that touch tax math, sanity-check with a quick mental example before declaring it done.

## Style conventions

- **TypeScript strict mode is on**; respect it. No `any` without a comment explaining why.
- **Functions over classes**. No class components.
- **`@/` path alias** points to `src/`. Use it for imports rather than long relative paths.
- **Keep components small**. The `BudgetExplorer` is the orchestrator; everything else is a section that takes a `BudgetResult` (and maybe input setters) and renders.
- **Inline styles use theme tokens** from `src/theme.ts`. Don't hard-code colors.
- **Money is formatted through `fmt` / `fmtSigned`**. Don't `toString()` a dollar amount and add `$`.
- **Cite all data**. Every numeric value the model displays must trace to a `Source` constant. All sources live in the central registry at `src/data/sources.ts` — don't define `Source` literals elsewhere. Use the `<Cite>` component for inline indicators. When adding new data — a new tax year, a new city, a new feature with new numbers like 401k limits — fetch the source at the same time. Don't ship "round numbers I made up". If a value is genuinely an approximation, label it as such honestly rather than fake-citing.
- **Any change to a source = a paired row in `reviewed.tsv`.** Adding, updating a URL, updating the underlying data, removing, or just affirmatively reviewing — every state transition on a source in `src/data/sources.ts` gets a paired row in `audit/links/reviewed.tsv` in the same PR, dated today, with your handle, with notes describing what you verified or did. The registry never changes silently. A source whose latest state-change isn't paired with a row gets flagged as overdue by the staleness audit on day one, by design: it forces the question "did a human actually open this URL?" If the answer is no (e.g., AI-proposed citation that was merged without verification, or a URL change made without re-reading the destination), the audit surfaces it immediately. No `addedAt` grace period, no exceptions for "small" edits.
- **Every data-driven page renders `<PageSources>`** at the bottom. It's the reusable footer that lists "Sources backing this view" + the dotted-underline citation list + a link to the full bibliography on `/sources`. Pass it the array of `Source` objects relevant to that page. Exception: the `/sources` page itself, which IS the bibliography.
- **Every resolved audit issue writes a row to `audit/links/reviewed.tsv`.** This is the unified resolution log — the durable "this got handled" record, regardless of whether the resolution was "validated as-is," "URL updated," "data corrected," or "citation removed." Code changes (sources.ts edit, data-file edit, removal) happen alongside but `reviewed.tsv` is always the canonical entry point for "what's been resolved."

## Adding a new city

1. Open `src/data/cities.ts`.
2. Add an entry following the same shape (name, state code, tier, rent1, rent3, groceries, etc.).
3. Use realistic 2025–26 medians from RentCafe / Zillow / BLS. Round to the nearest $50 or $100.
4. The dropdown picks it up automatically.

## Adding a new scenario

1. Open `src/data/scenarios.ts`.
2. Add an entry with a descriptive `label`, the income(s), filing status, city id, kids, and lifestyle.
3. Include `incomeB` if it's a dual-earner scenario.

## Updating tax brackets for a new tax year

1. `src/data/federalTax.ts` — replace the 2026 numbers.
2. `src/data/states.ts` — update state rates and minimum wages.
3. `src/components/Masthead.tsx` — bump the "Vol. 2026" label.
4. `src/components/Notes.tsx` — update the data citation footer.

## What's deliberately NOT in the model

These are real things real households deal with, but the model omits them for tractability. If asked to add them, suggest a data-driven minimum approach rather than a hand-wavy estimate:

- 401(k) / retirement pre-tax contributions
- HSA / FSA pre-tax contributions
- Student loan payments
- Mortgage / homeownership (vs. renting)
- Investment income / capital gains
- ACA marketplace health insurance (model assumes employer-sponsored)
- Self-employment income / SE tax
- ITIN / non-resident filing
- Detailed EITC nuances (investment income tests, age 25–64 childless rule)

## Useful tasks to ask Claude for

- "Add a 401(k) contribution input that reduces federal/state taxable income"
- "Add a homeownership toggle that swaps rent for mortgage + property tax + maintenance"
- "Add a city — Portland, OR with realistic 2026 cost data"
- "Refactor state taxes from flat rate to graduated brackets for the top 10 states"
- "Add unit tests for `lib/tax.ts` using Vitest"
- "Add a scenario comparison view that lets you save and compare multiple budgets side by side"

When working on big changes, prefer making them on a feature branch and propose them as a PR description.
