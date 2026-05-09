/**
 * Public-facing roadmap of planned features. Mirrored from the project memory
 * file at memory/roadmap_features.md but lives in the codebase so the
 * Roadmap page can render it directly. Keep the two in sync when items
 * land or are added.
 */

export type RoadmapStatus = 'planned' | 'in-progress' | 'shipped';

export type RoadmapCategory =
  | 'Tax modeling'
  | 'Household detail'
  | 'Cost of living'
  | 'Benefits & safety net'
  | 'Geography'
  | 'Sharing'
  | 'UX & navigation'
  | 'Transparency';

export interface RoadmapItem {
  id: number;
  /**
   * Shipped-card titles wrap inside a 300px-wide strip cell with ~180px
   * of effective text width. Aim for ≤ 32 characters so the title takes
   * at most two lines and every card's summary starts at the same
   * vertical position. Three-line titles destroy that alignment in the
   * "Already in the model" strip.
   */
  title: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
  /**
   * One-paragraph editorial blurb shown on the Roadmap page. Aim for
   * ≤ 280 characters (median of existing entries is ~225); push longer
   * only when the item genuinely needs to enumerate sub-items the title
   * can't carry. Tighter is better — the page reads as a scannable list,
   * not a wiki.
   */
  summary: string;
  /** ISO date (YYYY-MM-DD) when status flipped to 'in-progress'. Set this
   *  the same commit that starts work; leave undefined for planned items. */
  startedAt?: string;
  /** Rough completion estimate 0–100 for in-progress items. Honest
   *  finger-in-the-air, not a Jira-precise number. Omit for planned/shipped. */
  progress?: number;
  /** ISO date (YYYY-MM-DD) when status flipped to 'shipped'. Set this in
   *  the same commit that flips status; leave undefined for planned items. */
  shippedAt?: string;
}

export const ROADMAP: readonly RoadmapItem[] = [
  {
    id: 1,
    title: 'Time-budget section',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Input weekly working hours and surface the time cost alongside the dollar take-home — childcare hours, free time, sleep budget. Shows what the money actually trades against.',
  },
  {
    id: 2,
    title: 'Untaxed income input',
    category: 'Tax modeling',
    status: 'planned',
    summary:
      'Add an input for tips or cash income that flows into take-home and lifestyle but bypasses federal/state/FICA. Common in restaurant, gig, and cash-based trades.',
  },
  {
    id: 3,
    title: 'Expanded child options',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Today every kid is the same averaged-out kid. Expand the 0–4 slider into per-child age, school type (public/private/parochial/homeschool), activities, and optional 529 contributions — keeping the simple slider as the default.',
  },
  {
    id: 4,
    title: '401(k) / HSA / FSA pre-tax contributions',
    category: 'Tax modeling',
    status: 'planned',
    summary:
      'Pre-tax retirement and health-savings contributions reduce federal and state taxable income. The model currently assumes none, overstating tax by ~$7K at the 32% bracket for max-out 401(k) contributors.',
  },
  {
    id: 5,
    title: 'Lifestyle granularity',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Per-leaf user overrides land in the detail view: type any leaf to your actual value, share-link round-trips it. Dial keeps the simple Modest/Moderate/Comfortable global lever; overridden leaves stick across dial toggles. Per-leaf elasticities (#210), three-column comparison (#208), and the drill-down (#178) all shipped together — the full lifestyle granularity stack.',
  },
  {
    id: 6,
    title: 'Job-based location comparison',
    category: 'Geography',
    status: 'planned',
    summary:
      'Pick a job type (software engineer, bartender, nanny) and see what the same job pays across cities, cost-of-living adjusted. Answers "would I be better off moving?" Requires BLS occupational wage data by metro.',
  },
  {
    id: 7,
    title: 'Filing-status comparison (MFJ vs MFS vs Single vs HoH)',
    category: 'Tax modeling',
    status: 'planned',
    summary:
      'Add Married Filing Separately as a real filing status, then build a side-by-side view that runs the same household through every applicable status (Single vs MFJ vs MFS, Single vs HoH) with dollar deltas on each row.',
  },
  {
    id: 8,
    title: 'Shareable configuration links',
    category: 'Sharing',
    status: 'shipped',
    shippedAt: '2026-05-05',
    summary:
      'Encode the household state into a URL hash so a specific scenario can be shared. Plus a copy-able short code for paste-into-chat. No backend required.',
  },
  {
    id: 9,
    title: 'SNAP refinements',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      'Add shelter and childcare deductions to the SNAP net-income formula — real SNAP subtracts both before applying the 30% multiplier, meaningful in high-rent metros. Plus a calculation breakdown UI. (The income-sweep cliff visualization shipped separately.)',
  },
  {
    id: 10,
    title: 'Medicaid / CHIP refinements',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      "Surface alternate Medicaid tracks the model omits — SSI-linked, aged (65+), and pregnancy (often 200%+ FPL even in non-expansion states). Plus state waiver programs. Also: state-charged CHIP premiums for families above ~150% FPL (varies by state — TX ~$35–50/mo, PA tiered up to ~$56/mo/child, FL ~$15–20/mo, etc.). Today CHIP value = full kids' share of the family premium with no offset for the small monthly premium real higher-income families actually pay; small but real overstatement near the upper eligibility bands. (The 138% FPL Medicaid cliff is now visualized in the income-sweep curve.)",
  },
  {
    id: 11,
    title: 'Open-ended location selection',
    category: 'Geography',
    status: 'in-progress',
    startedAt: '2026-05-01',
    progress: 60,
    summary:
      'Phase 1 (shipped): state-first picker with searchable typeahead and statewide-average fallback for any of 51 jurisdictions. Phase 2: per-locality custom overrides. Phase 3: round-trip via shareable links.',
  },
  {
    id: 12,
    title: 'Student loan payments',
    category: 'Cost of living',
    status: 'planned',
    summary:
      'Add a monthly student loan input with optional balance + rate. Model income-driven repayment (IDR/SAVE/PAYE) and pick up the $2,500/yr student loan interest deduction (phased out ~$80K single / $165K joint).',
  },
  {
    id: 18,
    title: 'Rethink the scenario picker',
    category: 'UX & navigation',
    status: 'shipped',
    shippedAt: '2026-05-02',
    summary:
      'Demoted from a 13-card top-of-page grid to a stateless dropdown at the top of the Customize panel. Each scenario carries a one-line editorial takeaway, so the picker doubles as a teaching surface.',
  },
  {
    id: 17,
    title: 'Expanded dependents',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Today the model is "adults + kids 0–4." Add an "other dependents" input — adult special-needs child, elderly parent, sibling between jobs — that flows into household size, the $500 Credit for Other Dependents, and optional dependent income.',
  },
  {
    id: 16,
    title: 'Housing-footprint preferences',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Let households override the default bedroom count — two kids in a 2BR, three splitting a room, a couple in a studio, multigenerational doubling-up. Surfaces the rent savings of trading space for togetherness.',
  },
  {
    id: 15,
    title: 'Community suggestions & contributions',
    category: 'Sharing',
    status: 'in-progress',
    startedAt: '2026-05-04',
    progress: 20,
    summary:
      'A lightweight path for visitors to suggest roadmap items, flag bad data, or contribute fixes without needing a GitHub account. Likely a "Suggest an idea" form that opens a pre-filled issue, plus clear CONTRIBUTING docs. Bad-data flagging shipped via the audit:report issue template; suggestion form + ungated contribution path remain.',
  },
  {
    id: 14,
    title: 'Local resources directory',
    category: 'Geography',
    status: 'planned',
    summary:
      'Surface community resources for the selected location — food banks, free clinics, diaper banks, utility assistance, legal aid. Seeded from public directories (211, FoodPantries.org, HUD) and expandable as a community-driven layer.',
  },
  {
    id: 19,
    title: 'Dedicated sources page',
    category: 'UX & navigation',
    status: 'shipped',
    shippedAt: '2026-05-03',
    summary:
      'A /sources page that pulls every Source constant in the codebase into one organized reference, with per-row status indicators (broken / overdue / verified) and tier-aware staleness windows. The whole bibliography in one place.',
  },
  {
    id: 20,
    title: 'Income types taxed differently',
    category: 'Tax modeling',
    status: 'planned',
    summary:
      'Today every dollar is treated as W-2 wages. Add the income types that get taxed differently — Social Security, pensions and traditional 401(k), Roth withdrawals, long-term capital gains, municipal bond interest, unemployment, SE income. Likely shipped in waves; SS + retirement first.',
  },
  {
    id: 206,
    title: 'Marginalia (weekly notes)',
    category: 'Transparency',
    status: 'planned',
    summary:
      "Weekly-cadence microsite for project updates, time-save retros, and lessons learned — same editorial voice as the explorer. Likely static markdown at blog.thebudgetatlas.com (Cloudflare Pages). Working name 'Marginalia' (editorial-margin notes + financial-margin pun); open to alternatives (The Margin, Field Notes, Dispatches).",
  },
  {
    id: 21,
    title: 'Funding transparency dashboard',
    category: 'Transparency',
    status: 'planned',
    summary:
      "A first-class /funding page that turns the project's own money trail into a Budget Atlas-style data product — every dollar in and out with deliverable links, running balance, and explicit allocation. Same citation rigor applied to tax brackets, applied to ourselves.",
  },
  {
    id: 13,
    title: 'Homeownership / mortgage',
    category: 'Cost of living',
    status: 'planned',
    summary:
      'Add an "I own" toggle that swaps rent for full PITI plus HOA and a 1%/yr maintenance reserve. State-specific property tax (TX ~1.6%, NJ ~2.2%, HI ~0.3%). Owning often looks cheaper monthly until you net out maintenance and the down-payment opportunity cost.',
  },
  {
    id: 126,
    title: 'Guided assistance for applying to benefit programs',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      'When the model says a household qualifies for SNAP / Medicaid / CHIP / EITC, the next question is "so how do I actually apply?" Today the page links to the state agency landing and stops there. A guided flow could surface the application form, the documents needed, the benefits portal URL for that specific state, and (where possible) the income/eligibility pre-check the agency runs — turning "you qualify" into "here\'s the next step," without leaving the page.',
  },
  {
    id: 127,
    title: 'Pointers + guided assistance for programs outside the Atlas model',
    category: 'Benefits & safety net',
    summary:
      'The Atlas computes eligibility for SNAP, Medicaid, and CHIP, but plenty of programs sit adjacent to the same life situations and never surface. A laid-off worker should hear about unemployment insurance the moment they tell us their income dropped. A new parent should hear about WIC. A renter behind on utilities should hear about LIHEAP. A household near tax-filing time should hear about VITA / Free File. A disabled adult should hear about SSDI / SSI. Two layers: (1) a contextual "you may also want to look into…" callout that triggers off household state changes — state-specific links to the right portal; and (2) the same guided-application treatment #126 plans for SNAP / Medicaid / CHIP, applied here too — application form, documents needed, portal URL for the user\'s state, and any agency-run pre-check we can surface — so "you might qualify" becomes "here\'s the next step," not just a hyperlink and a shrug.',
    status: 'planned',
  },
  {
    id: 128,
    title: 'Implicit marginal tax rate view',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      'Plot the *slope* of the discretionary curve as its own line — the implicit marginal tax rate the household actually faces, including benefit phase-outs and refundable-credit reductions, not just income-tax brackets. Each cliff would show as a brief spike to ≥100% (every $1 earned costs more than $1) followed by an elevated plateau through the recovery zone. Makes legible why a $4K Medicaid loss takes an $11K raise to climb out of: the marginal keep-rate is much worse than the headline tax bracket suggests once EITC/SNAP phase-downs and untaxed-benefit replacement costs stack up. Companion to the existing cliff curve.',
  },
  {
    id: 166,
    title: 'Sources list filter + search',
    category: 'UX & navigation',
    status: 'planned',
    summary:
      "Today /sources is one long scroll across 230+ citations. Add filter chips (tier, status, group) and free-text search (URL or label) so a reader can ask 'show me all broken citations' or 'show me everything from KFF' without manual scanning.",
  },
  {
    id: 165,
    title: 'Income-sweep cliff curve',
    category: 'Benefits & safety net',
    status: 'shipped',
    shippedAt: '2026-05-05',
    summary:
      'Plots discretionary across a gross-income sweep so benefit cliffs (138% FPL Medicaid, SNAP phase-down, CHIP overshadow) read as visible drops. Pit-zone shading marks income bands where a raise leaves the household worse off net of lost benefits.',
  },
  {
    id: 129,
    title: 'Asymmetric Medicaid value vs. post-cliff cost',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      "Today the model conflates two different things into a single number (cityData.healthFamily, sourced from KFF's Employer Health Benefits Survey): (a) the dollar VALUE of Medicaid/CHIP coverage when a household qualifies, and (b) the household's healthcare EXPENSE when they don't. Setting these equal makes the cliff drop on the Discretionary line equal the cliff drop on the Take-home + benefits line — they're the same magnitude, just measured from different angles. In reality the two diverge: Medicaid is meaningfully better than typical employer coverage ($0 deductible, $0 copays, broader pediatric benefits) so its real actuarial value is HIGHER than a worker would pay for an equivalent plan; AND a household losing Medicaid often lands on an ACA marketplace plan that costs MORE than the modeled employer premium. Splitting these into separate values (medicaidValue, chipValue, postCliffCost) would make the Discretionary cliff legitimately differ in size from the Take-home + benefits cliff — capturing a real economic asymmetry. Likely sources: ACA marketplace median premium data (Healthcare.gov/state exchanges), MEPS for actuarial value of Medicaid, KFF for employer comparisons.",
  },
  {
    id: 131,
    title: 'BLS CEX line-item COL schema',
    category: 'Cost of living',
    status: 'in-progress',
    startedAt: '2026-05-08',
    progress: 80,
    summary:
      'Expand cost-of-living to ~15+ BLS CEX line items with two axes: geographic (city → MSA → division → region) and income (national-quintile shape × geo factor). 15 line items + 2023-2024 geo data + 2024 income-quintile data all landed; model consumes them end-to-end. Still ahead: pull "Telephone services" + "Personal insurance" sub-lines (currently hand formulas), drill-down UI (#178).',
  },
  {
    id: 178,
    title: 'Drill-down monthly cost view',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Condensed the 15-line monthly cost-of-living view to 7 rolled-up categories sectioned Essentials / Mixed / Lifestyle, each expandable to drill into its sub-lines. Per-cell geographic-granularity badges (MSA / division / region) and inline income-quintile context land in the detail view. The drill-down UX with three-column comparison + per-leaf override is the separate #5 follow-on.',
  },
  {
    id: 205,
    title: 'Expand income thermometer',
    category: 'Geography',
    status: 'planned',
    summary:
      'Expand the income thermometer (#187) beyond a fixed national + regional view: scope toggles (national / region / state / MSA where available), comparison mode (Midwest vs. NYC, two cities side-by-side), richer per-scope anchors (median + mean + percentile floors).',
  },
  {
    id: 204,
    title: 'State-level median income marker',
    category: 'Geography',
    status: 'planned',
    summary:
      'The income-position thermometer (#187) currently overlays the BLS Census-region average ($94K South / $97K Midwest / $116K Northeast / $120K West). State-level is the more useful cut — Mississippi vs. Massachusetts vs. California are very different stories within their regions. Pull median household income by state from Census ACS 1-year (2024) and add a state-marker that supersedes the regional one when present. Adds the Census ACS source to the registry with a paired reviewed.tsv row.',
  },
  {
    id: 203,
    title: 'Essentials vs. lifestyle split',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      "Today's 'Discretionary' line is misnamed: it's the surplus AFTER deducting every line including dining out and entertainment, not income minus necessities. Split the BLS CEX line items into essentials (rent, utilities, groceries, healthcare, childcare, utilitarian transport) vs. lifestyle (dining out, entertainment, vehicle upgrades, fashion, furnishings) and surface two numbers: discretionary income (textbook) = take-home − essentials, and surplus = discretionary income − lifestyle. Reframes the cliff curve and unblocks the two-sided plan in #201.",
  },
  {
    id: 202,
    title: 'Smooth CEX quintile transitions',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      "BLS CEX spending shape is a step function across quintile boundaries (q1Max=$29,931, q4Max=$155,924). Crossing a boundary makes modeled expenses jump, producing artifact 'pits' on the cliff curve that look identical to real benefit cliffs. Linear interpolation between published quintile means ($16,658 / $42,925 / $74,474 / $121,548 / $264,510) eliminates the steps; the income axis is now continuous.",
  },
  {
    id: 208,
    title: 'Three-column comparison: BLS / Atlas / You',
    category: 'UX & navigation',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      "Detail-view leaves now show the BLS baseline (raw CEX at the user's quintile/region/size/composition cell) alongside the Atlas-shipped value (BLS × elasticity, with specialized-source overrides for housing/healthcare/childcare). Collapses when numerically identical — moderate dial + no override = single value. Foundation for per-leaf user overrides (#5 / PR10).",
  },
  {
    id: 207,
    title: 'BLS composition cross-tab',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      "Pulled BLS CEX Table 1502 as the fourth axis on the synthetic blend: family-composition (single, married no kids, married + oldest <6 / 6–17 / adult, single parent, other). Captures structural spending differences pure CU size misses — a single parent of 3 and a married couple of 4 are both 4-person CUs but spend very differently. BLS tops at 'any kids' (no exact kid count). Companion to #131; foundation for #208 / #5 / #3.",
  },
  {
    id: 201,
    title: 'Two-sided discretionary plan',
    category: 'Household detail',
    status: 'planned',
    summary:
      "Today the model only allocates surplus (savings / vacation / splurge / emergency) when discretionary is positive. Generalize: when it's negative, surface concrete gap-closing levers ranked by impact — claimable benefits the household isn't using, lifestyle step-down, lower-rent housing tier, transit vs. car, childcare alternatives — with the dollar delta of each. Symmetric guidance whether the household has $400 left over or is $400 short.",
  },
  {
    id: 200,
    title: 'Demographic + population context',
    category: 'Cost of living',
    status: 'planned',
    summary:
      "Use the BLS demographic data we already mirror under audit/data-sources/bls-cex/2024 (race, age, education, occupation, household composition, housing tenure) to show where the user's income sits (quintile + percentile rank), how households at the same income spend differently across demographic cuts, and side-by-side geographic comparisons. The line-item schema (#131) opened the door; this puts the rest of the BLS data we already host to work.",
  },
  {
    id: 209,
    title: 'CU-size scaling for CEX lines',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Every CEX-anchored line now scales by household size (1p / 2p / 3p / 4p / 5p+) using BLS Table 1400. Previously the model used "average CU" (~2.5 people) values regardless of actual household size — overstating singles by ~1.8× and understating families of 4 by ~0.7×. Adds a third axis to the synthetic blend (alongside region/division and income quintile).',
  },
  {
    id: 210,
    title: 'Per-leaf lifestyle elasticities',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Replaced the global ±15-20% lifestyle multiplier with per-leaf elasticities (Low ±5%, Medium ±15%, High ±25%, Zero for config-driven lines). Rent and other contractually-fixed lines no longer modulate with the dial — the editorial principle is "modest means picking fewer bedrooms (a config decision), not paying less for the same unit." Foundation for the full lifestyle drill-down (#5).',
  },
  {
    id: 211,
    title: 'Methodology callouts (explorer)',
    category: 'UX & navigation',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Surfaced two simplifications in the MethodologyNote: (1) Medicaid full/none when claimed; CHIP partial offset for kids (state Medicaid-scope variation acknowledged, not modeled — deepening is #10); (2) synthetic-blend treats income / geo / size as independent (BLS publishes single-axis cross-tabs only).',
  },
  {
    id: 212,
    title: 'Leaf restructure — 26 leaves up from 19',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Split Phone & Internet → Cell + Home internet; Insurance → Renters + Life/disability; Vehicle (ins+maint) → Vehicle insurance + Vehicle maintenance & repair + Vehicle (other expenses). Surfaced Alcohol, Pets, and Travel & lodging as their own leaves. Added 7 new BLSCEXLineItem schema entries (cellularService, lifeInsurance, vehicleInsurance, vehicleMaintRepair, alcohol, otherLodging, pets) extracted from Tables 1101 / 1800 / 2700 / 1400. Cross-vintage drift bound widened <4% → <6% to accommodate vehicleInsurance (~5.8%, real economic drift in 2024).',
  },
  {
    id: 213,
    title: 'Tenure axis (renter / owner / owner-no-mortgage)',
    category: 'Household detail',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      "Added a `tenure` field to BudgetInput, defaulting to 'renter' (existing behavior). Owner-with-mortgage and owner-without-mortgage are real third paths the model now recognizes. Owner-only leaves (Mortgage P&I, Property tax, Homeowners insurance, Maintenance & repairs) are exposed as $0 placeholders — actual mortgage math + per-leaf reasons land with roadmap #13. Stops the model from silently assuming everyone rents.",
  },
  {
    id: 214,
    title: 'State-external sources registry (III, FCC, EIA, NCES, College Board, ACS, DOL NDCP)',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Added 8 new entries to `sources.ts` for state-external data: III (insurance), FCC URS (broadband), EIA state electricity, NCES private school tuition, College Board college pricing, Census ACS B25088/B25103 (owner costs + property tax), DOL NDCP (childcare). Hybrid pattern — one entry per publisher, state context passed at render time. EXPENSE_SOURCE descriptions for Home internet, Renters insurance, Mortgage P&I, Property tax, and Homeowners insurance now reference the concrete planned sources instead of vague placeholders. Per-cell data wiring follows.',
  },
  {
    id: 220,
    title: 'Tenure picker + filing dropdown',
    category: 'UX & navigation',
    status: 'shipped',
    shippedAt: '2026-05-09',
    summary:
      "Added the missing UI control for `BudgetInput.tenure` (renter / owner-mortgage / owner-no-mortgage) — the field had landed in the model in #197 but the user had no way to flip it. Plus harmonized filing-status from native `<select>` to `SearchableSelect` to match the City/State picker family. Tenure round-trips through the share-link via `te=` URL param (omitted when default 'renter'). 2 new tests for tenure round-trip and default suppression.",
  },
  {
    id: 219,
    title: 'EIA state electricity context',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-09',
    summary:
      'First per-cell state-external data wiring — fetched all 51 jurisdictions from EIA Electric Power Monthly Table 5.6.A (Feb 2026 vintage, ¢/kWh residential prices) into a typed data file. `BudgetResult.electricityContext` now exposes the state rate / national avg / state-vs-national factor on every result. NOT applied as a multiplicative factor on the Utilities leaf — CEX division-level signal already captures partial state variation; stacking would double-count. Surfaced for editorial context only ("your state pays X% above/below average") and as the foundation for future careful per-state model adjustments. Utilities source label updated to "BLS CEX (rollup) + EIA state context" (mixed tier).',
  },
  {
    id: 218,
    title: 'Childcare BLS baseline (#208 fill)',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-09',
    summary:
      "Childcare leaf now exposes a BLS baseline alongside its Care.com-derived shipped value. Pulled from Table 1502 'Personal services' subline as the delta between with-kids household composition columns and married-no-kids: ~$454/mo for households with kid <6, ~$118/mo for school-age kids, ~$47/mo for single parents. Useful contrast in the three-column comparison: BLS captures actual spending net of free/family/subsidized care; Care.com captures private-market price. The gap is the editorial reveal.",
  },
  {
    id: 217,
    title: 'Detail-view tooltips use HoverGloss',
    category: 'UX & navigation',
    status: 'shipped',
    shippedAt: '2026-05-09',
    summary:
      "Fixed two new detail-view tooltips (geo-granularity badges and BLS-baseline values) to use the project's `HoverGloss` primitive instead of native `title=` attributes — matches the styled hover popover the rest of the detail view already uses (SourceBadge dots, etc.). The native `title` is browser-flaky and didn't match the visual family. Override clear button keeps native `title` (button accessibility hint, not a content tooltip).",
  },
  {
    id: 216,
    title: 'Lifestyle elasticity calibration',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-09',
    summary:
      'Recalibrated LIFESTYLE_ELASTICITY against CEX q5/q1 spreads per line, with volume/needs subtracted out so the dial captures only lifestyle-driven variance (q5/q1 vehicle-insurance ratio is mostly "high earners own more cars" — volume, not lifestyle). Bumped 9 lines: foodAtHome 0.05→0.08, gasoline 0.05→0.07, vehicleMaintRepair 0.05→0.07, vehicleInsurance 0→0.05, lifeInsurance 0→0.05, personalCare 0.05→0.10, furnishings/householdOperations/pets 0.15→0.20.',
  },
];

/**
 * Things already shipped that the roadmap previously listed. Useful context
 * on the roadmap page so users can see momentum, not just a backlog.
 */
export interface ShippedItem {
  title: string;
  summary: string;
  shippedAt: string;
}

export const SHIPPED: readonly ShippedItem[] = [
  {
    title: 'Graduated state tax brackets',
    shippedAt: '2026-05-01',
    summary:
      'All 51 jurisdictions now use the same progressive-bracket machinery as federal. State-specific standard deductions and per-filing-status brackets where applicable. Replaces the previous flat-effective-rate approximation.',
  },
  {
    title: 'Bracket walkthrough',
    shippedAt: '2026-05-01',
    summary:
      'Click "View bracket walkthrough" under the paycheck chart to see federal and state taxes calculated row by row, with the marginal bracket highlighted and refundable credits reconciled.',
  },
  {
    title: 'Per-state source citations',
    shippedAt: '2026-05-01',
    summary:
      "Every state attaches its own Department of Revenue / Taxation, SNAP agency, Medicaid agency, and CHIP program citation. The page footer rotates the current state's sources alongside the cross-state aggregators.",
  },
  {
    title: 'Benefits & safety net',
    shippedAt: '2026-05-01',
    summary:
      "SNAP, Medicaid, and CHIP eligibility — with state-specific BBCE thresholds, Medicaid expansion vs. coverage-gap branching, and CHIP's state-set income limits. Claimed benefits adjust the budget.",
  },
];
