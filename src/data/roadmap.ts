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
    title: 'Pre-tax 401(k) / HSA / FSA',
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
      'Per-leaf user overrides in the detail view — type any leaf to your actual value, share-link round-trips it. The Modest/Moderate/Comfortable dial stays a global lever; overrides stick across dial toggles. Shipped with per-leaf elasticities, three-column comparison, and drill-down (#239).',
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
    title: 'Filing-status comparison',
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
      'Surface alternate Medicaid tracks the model omits — SSI-linked, aged 65+, pregnancy ≥200% FPL — plus state waivers. Offset CHIP value by state-charged premiums (varies; TX ~$35-50/mo, PA up to ~$56/mo/child) for families above ~150% FPL — today CHIP value omits these.',
  },
  {
    id: 11,
    title: 'Open-ended location selection',
    category: 'Geography',
    status: 'in-progress',
    startedAt: '2026-05-01',
    progress: 70,
    summary:
      'Phase 1 (shipped): state-first picker, statewide-average fallback for all 51 jurisdictions. Phase 2 (in motion): per-locality overrides — state-external sources (III/FCC/EIA/NCES/ACS) wired, EIA state electricity is the first per-cell fill. Phase 3: shareable-link round-trip.',
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
    title: 'Community contributions',
    category: 'Sharing',
    status: 'in-progress',
    startedAt: '2026-05-04',
    progress: 40,
    summary:
      "A lightweight path for visitors to suggest items, flag bad data, or contribute without a GitHub account. Bad-data flagging shipped via the audit:report issue template. Still ahead: 'Suggest an idea' form opening a pre-filled issue, plus CONTRIBUTING docs.",
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
      'Today every dollar is treated as W-2 wages. Add types taxed differently — Social Security, pensions, traditional 401(k), Roth withdrawals, long-term capital gains, muni bond interest, unemployment, SE income. Likely shipped in waves; SS + retirement first.',
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
    status: 'in-progress',
    startedAt: '2026-05-08',
    progress: 25,
    summary:
      'Tenure axis (renter / owner-mortgage / owner-no-mortgage) landed on BudgetInput; owner-only leaves are $0 placeholders. UI hidden until full mortgage math lands. Still ahead: PITI + HOA + 1%/yr maintenance reserve, state-specific property tax (TX ~1.6%, NJ ~2.2%, HI ~0.3%).',
  },
  {
    id: 126,
    title: 'Guided benefit application',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      "When the model says a household qualifies for SNAP / Medicaid / CHIP / EITC, the next question is 'how do I apply?' A guided flow could surface the application form, documents needed, and state portal URL — turning 'you qualify' into 'here's the next step,' without leaving the page.",
  },
  {
    id: 242,
    title: 'Adjacent benefit programs',
    category: 'Benefits & safety net',
    summary:
      "Programs adjacent to the Atlas model — unemployment for a laid-off worker, WIC for a new parent, LIHEAP for utility arrears, VITA/Free File at tax time, SSDI/SSI for disabled adults. Contextual callouts triggered by household state, plus #126's guided-application treatment.",
    status: 'planned',
  },
  {
    id: 243,
    title: 'Implicit marginal tax rate view',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      'Plot the slope of the discretionary curve — the marginal rate the household actually faces (benefit phase-outs and credit reductions, not just income-tax brackets). Each cliff shows as a spike ≥100% then an elevated plateau through recovery. Companion to the cliff curve.',
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
    id: 244,
    title: 'Medicaid value vs cliff cost',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      'The model conflates Medicaid/CHIP value when qualifying with healthcare expense post-cliff (one cityData.healthFamily number). Reality diverges: Medicaid is actuarially better than employer coverage; post-cliff ACA often costs more. Split into medicaidValue / chipValue / postCliffCost.',
  },
  {
    id: 131,
    title: 'BLS CEX line-item COL schema',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-09',
    summary:
      'Four-axis synthetic blend — income quintile (smoothed), geography (MSA/division/region), CU size, family composition — drives 26 line-item leaves grouped under 7 rollups with per-leaf elasticity tiers. State-external sources registered (III/FCC/EIA/NCES/ACS); first per-cell fill via EIA. Per-leaf calc tooltips expose the trace.',
  },
  {
    id: 239,
    title: 'Drill-down monthly cost view',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      'Condensed the 15-line cost-of-living view into 7 rollups (Essentials/Mixed/Lifestyle), each expandable. Per-cell geo-granularity badges (MSA/division/region) and inline quintile context in the detail view. Three-column comparison + per-leaf overrides under #5.',
  },
  {
    id: 248,
    title: 'Expand income thermometer',
    category: 'Geography',
    status: 'planned',
    summary:
      'Expand the income thermometer (#187) beyond a fixed national + regional view: scope toggles (national / region / state / MSA where available), comparison mode (Midwest vs. NYC, two cities side-by-side), richer per-scope anchors (median + mean + percentile floors).',
  },
  {
    id: 247,
    title: 'State-level median income marker',
    category: 'Geography',
    status: 'planned',
    summary:
      'The thermometer overlays Census-region averages today. State-level is more useful — MS vs MA vs CA are different stories within their regions. Pull median household income by state from Census ACS 1-year (2024); state marker supersedes regional when present.',
  },
  {
    id: 240,
    title: 'Essentials vs. lifestyle split',
    category: 'Cost of living',
    status: 'shipped',
    shippedAt: '2026-05-08',
    summary:
      "Discretionary today is misnamed — it's the surplus after deducting every line including lifestyle, not income minus necessities. Split CEX into essentials vs. lifestyle and surface both: discretionary = take-home − essentials, surplus = discretionary − lifestyle.",
  },
  {
    id: 246,
    title: 'Two-sided discretionary plan',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Today the model allocates surplus (savings/vacation/splurge/emergency) only when discretionary is positive. Generalize: when negative, surface gap-closing levers ranked by impact — claimable benefits, lifestyle step-down, lower-rent tier, transit vs. car — with each dollar delta.',
  },
  {
    id: 245,
    title: 'Demographic + population context',
    category: 'Cost of living',
    status: 'planned',
    summary:
      "Use BLS demographic data we already mirror (race, age, education, occupation, composition, tenure) to show where the user's income sits (quintile + percentile), how households at the same income spend differently across cuts, and side-by-side geographic comparisons.",
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
