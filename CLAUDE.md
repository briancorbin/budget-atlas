# Budget Atlas — Project Context for Claude

This file is intended to be pasted into the **Project instructions** of a Claude.ai project, so Claude has full context when helping iterate on this codebase. It's also useful documentation in its own right.

---

## What this is

The Budget Atlas is an interactive React app that lets users explore how Americans at different income levels live across different US cities and household configurations. It models federal/state/FICA taxes, cost of living, childcare, and discretionary income for single, married, head-of-household, and cohabitating-dual-earner households.

The aesthetic is deliberately editorial — think _The Atlantic_ meets _Bloomberg Terminal_ — not a SaaS dashboard. Cream background, deep red accent, Fraunces serif headlines, IBM Plex body and mono. Data-dense without feeling cluttered.

## Tech stack

- **React 19** + **TypeScript** (strict mode)
- **Vite** for dev server and build
- **Vitest** for unit tests (`src/lib/*.test.ts` live alongside the code)
- **Recharts** for charts (waterfall, pie, cliff curve)
- **Cloudflare Workers + D1** for the link-audit backend (`worker/index.ts`, `worker/schema.sql`). Read-public, write-token-gated. The site itself is otherwise static.
- **Yarn 4** via Corepack (pinned in `package.json#packageManager`). Node 22 (pinned via `.nvmrc`). Don't use npm.
- **No CSS framework** — inline styles using a theme token object. This is a deliberate choice for a data-heavy single-page tool; resist the urge to add Tailwind unless the app outgrows this approach.
- **No state management library** — `useState` and `useMemo` are sufficient. If state grows complex, prefer lifting state to `BudgetExplorer.tsx` (in `src/pages/atlas/`) before reaching for Zustand or Redux.

## Project layout

The repo is organized by responsibility, with UI further split by route:

```
src/data/        Reference data (tax brackets, city costs, scenarios, benefits,
                 poverty thresholds, the sources.ts citation registry). No logic.
src/lib/         Pure functions (tax math, formatting, budget composition,
                 benefits eligibility, cliff curves). No React. Test files live
                 alongside (e.g. tax.test.ts).
src/components/  Cross-page UI primitives only — ui.tsx (Cite, PageSources,
                 etc.) and audit/ (StatusDot, ReportFlag).
src/pages/       One folder per route. atlas/ is the largest (BudgetExplorer +
                 its section components + chrome like Masthead/PageNav/ShareLink).
                 Secondary pages (about/, privacy/, roadmap/, sources/, design-lab/)
                 each hold a single top-level component.
worker/          Cloudflare Worker source — index.ts (audit API endpoints) +
                 schema.sql (D1 tables). Built separately from the static site.
audit/           Link-audit tooling (check.sh, post-run.mjs, seed-issues.mjs)
                 and the human-authored reviewed.tsv. No machine-generated
                 artifacts under version control — those live in D1.
```

When adding a feature, ask: which layer does this belong in? A new tax credit goes in `lib/tax.ts` and is wired into `lib/budget.ts`. A new city goes in `data/cities.ts`. A new chart or visualization on the atlas gets a new component file inside `src/pages/atlas/`. Page-specific UI lives under `src/pages/<route>/`; only put something in `src/components/` if it's actually used across multiple pages.

Subfolders inside `src/lib/` (like `lib/audit/`) and `src/components/` (like `components/audit/`) are reserved for domains dense enough to justify the split — a single feature file stays flat.

## Calculation correctness

Tax math is the foundation of this app. Be careful with:

- **Progressive brackets**: only the dollars within each bracket are taxed at that bracket's rate. The `progressiveTax` helper in `lib/tax.ts` handles this; never compute "marginal rate × full income" anywhere.
- **Standard deduction**: subtracted before brackets apply.
- **FICA per person**: Social Security has a per-person wage base. Two earners at $200K each pay more SS than one at $400K. Always call `calcFICA(incomeA) + calcFICA(incomeB)` for dual-earner households, not `calcFICA(totalIncome)`.
- **Refundable credits**: CTC is refundable up to $1,700/child (2026 OBBBA); EITC is fully refundable. Net federal tax can be negative for low-income families with children. The `computeBudget` function intentionally allows this.
- **Filing status × dual-earner combinations**: married → MFJ joint return; single/HoH + 2 incomes → each files separately as singles. These produce different totals (marriage bonus for asymmetric, marriage penalty for two equal high earners >$770K combined).
- **Benefits eligibility lives in `lib/benefits.ts`** (alongside `data/benefits.ts` for the thresholds). SNAP, Medicaid (with state expansion / non-expansion + state-specific FPL multipliers), and CHIP are all modeled. The cliff-curve view (`lib/cliffs.ts` + `pages/atlas/CliffCurve.tsx`) sweeps income across the eligibility transitions and is sensitive to rounding / threshold-equality edge cases — when changing benefit math, re-render the curve and look for spurious step changes.

When making changes that touch tax or benefits math, sanity-check with a quick mental example before declaring it done. The pinned regression tests in `lib/budget.test.ts` lock down golden-path scenarios.

## Style conventions

- **TypeScript strict mode is on**; respect it. No `any` without a comment explaining why.
- **Functions over classes**. No class components.
- **`@/` path alias** points to `src/`. Use it for imports rather than long relative paths.
- **Keep components small**. The `BudgetExplorer` is the orchestrator; everything else is a section that takes a `BudgetResult` (and maybe input setters) and renders.
- **Inline styles use theme tokens** from `src/theme.ts`. Don't hard-code colors.
- **Money is formatted through `fmt` / `fmtSigned`**. Don't `toString()` a dollar amount and add `$`.
- **Cite all data**. Every numeric value the model displays must trace to a `Source` constant. All sources live in the central registry at `src/data/sources.ts` — don't define `Source` literals elsewhere. Use the `<Cite>` component for inline indicators. When adding new data — a new tax year, a new city, a new feature with new numbers like 401k limits — fetch the source at the same time. Don't ship "round numbers I made up". If a value is genuinely an approximation, label it as such honestly rather than fake-citing.
- **Any change to a source = a paired row in `reviewed.tsv`.** Adding, updating a URL, updating the underlying data, removing, or just affirmatively reviewing — every state transition on a source in `src/data/sources.ts` gets a paired row in `audit/links/reviewed.tsv` in the same PR, dated today, with your handle, with notes describing what you verified or did. Rows are keyed by **source id** — the stable slug (`kff-employer-health-benefits`, `state-dor-ca`) — not URL, so review history follows a citation across URL changes. The registry never changes silently.

  **Each row also declares its `kind`** — what kind of verification happened: `human` (eyes-on-source, no AI assistance) or `ai` (AI was involved in proposing, extracting, or refreshing the entry). The audit's job is to make the level of human involvement transparent, not absent: AI assistance is allowed and useful, especially during active solo development. The `kind` column is the honest record. Don't launder AI work as `human` — if you weren't eyes-on-source, it's `ai`. An earlier three-state vocabulary (`ai-assisted`, `ai-proposed`) parses as backwards-compat but new rows should use `ai`. See `audit/links/reviewed.tsv` header for the full definitions.

  **Community-submitted reports** (the `audit:report` issue template) remain `human`-only — community channels are where bad-faith laundering hurts most, and the form has explicit "no AI" checkboxes.

- **Every data-driven page renders `<PageSources>`** at the bottom. It's the reusable footer that lists "Sources backing this view" + the dotted-underline citation list + a link to the full bibliography on `/sources`. Pass it the array of `Source` objects relevant to that page. Exception: the `/sources` page itself, which IS the bibliography.
- **Every resolved audit issue writes a row to `audit/links/reviewed.tsv`.** This is the unified resolution log — the durable "this got handled" record, regardless of whether the resolution was "validated as-is," "URL updated," "data corrected," or "citation removed." Code changes (sources.ts edit, data-file edit, removal) happen alongside but `reviewed.tsv` is always the canonical entry point for "what's been resolved."

## AI process conventions

`AI_TIME_LOG.md` at the repo root tracks how AI shows up quantitatively (hours per PR). It's maintainer-tracked, surfaced at merge time via the PR template, and CI-enforced.

- **`AI_TIME_LOG.md` — running estimate, updated during the PR; row added in the PR itself.** The `## AI time log` section in the PR description is the running estimate — bump the numbers as you work, when review feedback adds another round, when scope grows. **The row in `AI_TIME_LOG.md` is part of the deliverable**, not stitched in post-merge: append it to the file as part of the PR. **Recompute the "Running totals" section at the bottom of the file when you add or revise rows** (date stamp + Solo / AI / Saved sums + multiplier). CI enforces both: `scripts/check-ai-time-log-row.mjs` fails any PR that doesn't modify `AI_TIME_LOG.md`, and `scripts/check-ai-time-log-totals.mjs` fails when the declared totals drift from the sum of the rows. Escape hatch for trivial PRs (typo fix, Dependabot bump, non-author contribution): include `[skip-time-log]` in any commit message in the PR (skips the row check; the totals check still runs against existing data). Calibration over time is the goal; precision isn't.

The qualitative side — observations about working with AI on this project — used to live at `AI_LEARNINGS.md` in the repo. It moved out: the in-the-moment capture ritual still happens (the PR template prompts for it), but the entries themselves are private notes that feed the public weekly synthesis at **marginalia.thebudgetatlas.com** (a separate publication; see `marginalia/`). The reasoning: keeping the raw observations off the public record removed the unwanted weight of "this is going on the public record" that was making in-the-moment capture feel heavy, while preserving the discipline of capturing observations at the moment they happen. Marginalia is where the thinking gets shared; private notes are where it gets jotted.

The "human substance only" rule from the original `AI_LEARNINGS.md` carries over to **every** Marginalia post and every PR-template AI-learnings prompt. AI assistants must not propose, draft, or synthesize observations on the author's behalf. Light copy-editing of what the author said is fine; inventing substance is not. Open questions ("anything worth jotting from this session?") are fine; leading questions ("what about the X moment — did Y happen?") amount to suggesting an observation. The author drives; the AI listens.

These are project conventions, not personal preferences — they apply to every AI collaborator on this repo. If you find yourself about to write substance the human didn't, stop.

## Adding a new city

1. Open `src/data/cities.ts`.
2. Add an entry following the same shape (name, state code, tier, rent1, rent3, groceries, etc.).
3. Use realistic 2025–26 medians from RentCafe / Zillow / BLS. Round to the nearest $50 or $100.
4. Cite each number against an entry in `CITY_COL_SOURCES` (or add a new source to `src/data/sources.ts` if needed). Any new source = a paired row in `audit/links/reviewed.tsv`.
5. The dropdown picks it up automatically.

## Adding a new scenario

1. Open `src/data/scenarios.ts`.
2. Add an entry with `id`, `label`, the income(s), `filing` status, `city` id, `kids`, `lifestyle`, and a one-line `takeaway` defensible from the model itself (a marriage bonus, a benefit cliff, a phase-out, a state tax effect).
3. Include `incomeB` if it's a dual-earner scenario.

## Updating tax brackets for a new tax year

1. `src/data/federalTax.ts` — replace the 2026 numbers (brackets, std deduction, SS wage base).
2. `src/data/states.ts` — update state rates, brackets, std deductions, and minimum wages.
3. `src/data/sources.ts` — bump the `date` field on `irs-rev-proc-*`, `ssa-wage-base`, `state-dor-*`, etc. for any source whose underlying publication moved. Pair every change with a row in `audit/links/reviewed.tsv`.
4. `src/pages/atlas/Masthead.tsx` — bump the "Vol. 2026" label.
5. `src/pages/atlas/Notes.tsx` — update the data citation footer.

## What's deliberately NOT in the model

These are real things real households deal with, but the model omits them for tractability. If asked to add them, suggest a data-driven minimum approach rather than a hand-wavy estimate:

- 401(k) / retirement pre-tax contributions
- HSA / FSA pre-tax contributions
- Student loan payments
- Mortgage / homeownership (vs. renting)
- Investment income / capital gains
- ACA marketplace health insurance (the model assumes employer-sponsored)
- Self-employment income / SE tax
- ITIN / non-resident filing
- Advanced EITC nuances (investment-income tests, the age 25–64 childless rule). Basic EITC structure with phase-in / plateau / phase-out is modeled.

What _is_ in the model: SNAP eligibility (with state-specific BBCE thresholds), Medicaid (state expansion vs. non-expansion + per-state FPL multipliers), CHIP, EITC (basic), CTC including refundability up to $1,700/child (OBBBA 2026), HHS poverty guidelines, and the cliff curve that visualizes how all of these interact across an income sweep.

## Local development against the audit Worker

Most contributors don't need this — the static site reads from the production audit API by default. Use these only when modifying `worker/index.ts` or the audit pipeline:

```bash
yarn dev:local        # Wrangler worker (localhost:8787) + Vite dev (proxied to it), concurrently
yarn dev:local:fresh  # same, but first applies schema and pulls a fresh prod D1 snapshot
yarn db:sync          # pull prod D1 snapshot into local db
yarn check-links      # run the link audit; POSTs to /api/audit/runs
```

The write-token (`AUDIT_WRITE_TOKEN`) lives in 1Password (vault: "The Budget Atlas") and is mirrored as a Cloudflare Worker secret + GitHub Actions repo secret. `.env.audit` resolves it via `op run` for local CLI use.

## Useful tasks to ask Claude for

- "Add a 401(k) contribution input that reduces federal/state taxable income"
- "Add a homeownership toggle that swaps rent for mortgage + property tax + maintenance"
- "Add a city — Portland, OR with realistic 2026 cost data"
- "Add the ACA marketplace branch as an alternative to employer-sponsored insurance"
- "Add a scenario comparison view that lets you save and compare multiple budgets side by side"
- "Refresh the Sources page UI with X visual change"

When working on big changes, prefer making them on a feature branch and propose them as a PR description.
