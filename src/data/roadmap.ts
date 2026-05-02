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
  | 'UX & navigation';

export interface RoadmapItem {
  id: number;
  title: string;
  category: RoadmapCategory;
  status: RoadmapStatus;
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
      'Input weekly working hours and surface derived metrics: time for personal childcare vs hired help, free time for own pursuits, sleep budget. Shows the time cost of work alongside the dollar take-home.',
  },
  {
    id: 2,
    title: 'Untaxed income input',
    category: 'Tax modeling',
    status: 'planned',
    summary:
      'Add an input for tips or cash income that flows into take-home and lifestyle budgeting but bypasses federal/state/FICA. Common in restaurant, gig, and cash-based trades. Notes the legal grey area of underreporting.',
  },
  {
    id: 3,
    title: 'Per-child ages',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Optional expand from the 0–4 kids slider into per-child ages. Childcare cost varies massively by age (infant care often ~2× preschool), and the Child Tax Credit cuts off at 17 — both are currently averaged out.',
  },
  {
    id: 4,
    title: '401(k) / HSA / FSA pre-tax contributions',
    category: 'Tax modeling',
    status: 'planned',
    summary:
      'Pre-tax retirement and health-savings contributions reduce federal and state taxable income. Currently the model assumes none, which materially overstates tax for higher-income households who max their 401(k) — a $7K+ gap at the 32% marginal bracket.',
  },
  {
    id: 5,
    title: 'Lifestyle granularity',
    category: 'Cost of living',
    status: 'planned',
    summary:
      'Layer optional per-line inputs on top of the Modest/Moderate/Comfortable lever — gym, dining out, grocery budget, hobbies. Keep the simple lever as the default; expand for users who want to model their actual spending.',
  },
  {
    id: 6,
    title: 'Job-based location comparison',
    category: 'Geography',
    status: 'planned',
    summary:
      'Pick a job type (software engineer, bartender, nanny, etc.) and see what the same job pays across cities, with cost-of-living adjusted take-home. Answers "would I be better off moving?". Requires BLS occupational wage data by metro.',
  },
  {
    id: 7,
    title: 'Filing-status comparison (MFJ vs MFS vs Single vs HoH)',
    category: 'Tax modeling',
    status: 'planned',
    summary:
      'Today filing status is single, married (always MFJ), or head of household. Two pieces here: (1) add Married Filing Separately as a real filing status with its own brackets, ~half the standard deduction, EITC disqualification, and tighter credit phase-outs. (2) Build a side-by-side comparison view that shows the same household run through every applicable filing status — Single vs MFJ vs MFS for couples, Single vs HoH for single parents — with the dollar delta on each row. Plus surface the qualifying-person and "considered unmarried" rules for HoH (often misunderstood: cost-of-keeping-up-home > 50%, qualifying child or relative living with you more than half the year, etc.) so users see when HoH is actually available.',
  },
  {
    id: 8,
    title: 'Shareable configuration links',
    category: 'Sharing',
    status: 'planned',
    summary:
      'Encode the household state into a URL hash (#income=…) so a specific scenario can be shared. Also a copy-able short code for paste-into-chat. No backend required.',
  },
  {
    id: 9,
    title: 'SNAP refinements',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      'Add shelter and childcare deductions to the SNAP net-income formula (real SNAP subtracts both before applying the 30% multiplier; meaningful in high-rent metros and for working parents). Plus a calculation breakdown UI and a cliff visualization for the income threshold.',
  },
  {
    id: 10,
    title: 'Medicaid / CHIP refinements',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      'Surface alternate Medicaid tracks the model omits — SSI-linked (disabled), aged (65+), and pregnancy (often up to 200%+ FPL even in non-expansion states). Plus state waiver programs like Georgia\'s Pathways to Coverage, and a visualization of the Medicaid cliff at 138% FPL.',
  },
  {
    id: 11,
    title: 'Open-ended location selection',
    category: 'Geography',
    status: 'in-progress',
    startedAt: '2026-05-01',
    progress: 60,
    summary:
      'Phase 1 (shipped): state-first picker with searchable typeahead and statewide-average fallback for any of the 51 jurisdictions, even ones without a curated city. Phase 2 (planned): per-locality custom overrides for rent, groceries, healthcare, etc. Phase 3 (planned): round-trip via shareable links.',
  },
  {
    id: 12,
    title: 'Student loan payments',
    category: 'Cost of living',
    status: 'planned',
    summary:
      'Add an input for monthly student loan payment, with optional balance + rate + standard 10-year payment estimate. Model income-driven repayment (IDR / SAVE / PAYE) where payments scale with discretionary income above a poverty multiple. Pick up the $2,500/yr student loan interest deduction (above-the-line, phased out at ~$80K single / $165K joint).',
  },
  {
    id: 18,
    title: 'Rethink the "Start with someone real" section',
    category: 'UX & navigation',
    status: 'planned',
    summary:
      'The scenario picker shipped early as a friendly entry point — half a dozen archetype households with one-line bios. As the model has grown (graduated state brackets, benefits, statewide fallbacks, more inputs), the section feels increasingly cluttered and the archetypes feel less load-bearing now that anyone can model their own situation directly. Open questions: keep it as a quick-start carousel, fold it into a smaller "examples" link, replace it with a guided onboarding flow, or drop it entirely in favor of sensible defaults? Worth a design pass once it gets in the way of something concrete rather than refactoring preemptively.',
  },
  {
    id: 17,
    title: 'Expanded dependents',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Today the household model is "adults + kids 0–4" and assumes kids age out at 18. In reality plenty of households support an adult special-needs child, an elderly parent who lives with them, or a sibling between jobs. Add a "other dependents" input that flows into household size (rent, groceries, utilities), tax math (Credit for Other Dependents — $500 nonrefundable per qualifying non-child dependent), and optionally their own income contribution if they work. Surfaces the real cost of multigenerational and care-giving households, and the modest tax offset that exists for them.',
  },
  {
    id: 16,
    title: 'Housing-footprint preferences',
    category: 'Household detail',
    status: 'planned',
    summary:
      'Let households override the default bedroom-count assumption. Today the model picks 1BR / 1BR+20% / 3BR rigidly from adults+kids; in reality plenty of families share bedrooms (two kids in a 2BR with bunkbeds, three kids splitting a room, a couple staying in a studio, multigenerational households doubling up). Add a "bedrooms" override so users can pick smaller or larger than the default — surfaces the rent savings of trading space for togetherness, or the premium of wanting a dedicated room per kid.',
  },
  {
    id: 15,
    title: 'Community suggestions & contributions',
    category: 'Sharing',
    status: 'planned',
    summary:
      'A lightweight path for visitors to suggest new roadmap items, flag bad data, or contribute fixes — without needing a GitHub account. Likely a "Suggest an idea" form that opens a pre-filled GitHub issue, plus clear CONTRIBUTING docs for adding cities, sources, or local resources via PR. Goal: turn the roadmap from a one-person backlog into a place anyone can shape.',
  },
  {
    id: 14,
    title: 'Local resources directory',
    category: 'Geography',
    status: 'planned',
    summary:
      'Surface community resources for the selected location: food banks, shelters, free clinics, diaper banks, utility-assistance programs, legal aid, workforce centers. Seeded from public directories (211, FoodPantries.org, HUD shelter lists) and expandable as a community-driven layer where users can submit additions for their city. Shows alongside benefits so a household sees both the formal safety net and the local one.',
  },
  {
    id: 19,
    title: 'Dedicated sources page',
    category: 'UX & navigation',
    status: 'planned',
    summary:
      'Today citations live inline next to the values that use them, plus a rotating footer block, plus a Sources section in the README. That works for "where did this number come from" but not for "show me everything this site is built on." Build a dedicated /sources page that pulls every Source constant in the codebase into one organized reference: grouped by type (federal tax, state tax, SNAP, Medicaid, CHIP, cost of living, minimum wage, etc.), with a state-by-state breakdown for the per-jurisdiction sources. Each entry shows the agency, the URL, what it covers, and last-checked date. Goal: make the editorial credibility legible — anyone landing on the site can see the whole bibliography in one place, the way a real reference work would have one.',
  },
  {
    id: 13,
    title: 'Homeownership / mortgage',
    category: 'Cost of living',
    status: 'planned',
    summary:
      'Today everyone rents. Add an "I own" toggle that swaps rent for full PITI (principal, interest, property tax, insurance) plus HOA and a 1%/yr maintenance reserve. State-specific effective property tax rates (TX ~1.6%, NJ ~2.2%, HI ~0.3%). Shows that owning often looks cheaper monthly until you net out maintenance and opportunity cost of the down payment.',
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
      'Every state attaches its own Department of Revenue / Taxation, SNAP agency, Medicaid agency, and CHIP program citation. The page footer rotates the current state\'s sources alongside the cross-state aggregators.',
  },
  {
    title: 'Benefits & safety net',
    shippedAt: '2026-05-01',
    summary:
      'SNAP, Medicaid, and CHIP eligibility — with state-specific BBCE thresholds, Medicaid expansion vs. coverage-gap branching, and CHIP\'s state-set income limits. Claimed benefits adjust the budget.',
  },
];
