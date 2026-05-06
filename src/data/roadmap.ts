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
    status: 'planned',
    summary:
      'Layer optional per-line inputs — gym, dining out, groceries, hobbies — on top of the Modest/Moderate/Comfortable lever. Simple lever stays as the default; expand for users modeling their actual spending.',
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
      'Surface alternate Medicaid tracks the model omits — SSI-linked, aged (65+), and pregnancy (often 200%+ FPL even in non-expansion states). Plus state waiver programs. (The 138% FPL Medicaid cliff is now visualized in the income-sweep curve.)',
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
    title: 'Rethink the "Start with someone real" section',
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
    id: 129,
    title: 'Asymmetric Medicaid value vs. post-cliff cost',
    category: 'Benefits & safety net',
    status: 'planned',
    summary:
      "Today the model conflates two different things into a single number (cityData.healthFamily, sourced from KFF's Employer Health Benefits Survey): (a) the dollar VALUE of Medicaid/CHIP coverage when a household qualifies, and (b) the household's healthcare EXPENSE when they don't. Setting these equal makes the cliff drop on the Discretionary line equal the cliff drop on the Take-home + benefits line — they're the same magnitude, just measured from different angles. In reality the two diverge: Medicaid is meaningfully better than typical employer coverage ($0 deductible, $0 copays, broader pediatric benefits) so its real actuarial value is HIGHER than a worker would pay for an equivalent plan; AND a household losing Medicaid often lands on an ACA marketplace plan that costs MORE than the modeled employer premium. Splitting these into separate values (medicaidValue, chipValue, postCliffCost) would make the Discretionary cliff legitimately differ in size from the Take-home + benefits cliff — capturing a real economic asymmetry. Likely sources: ACA marketplace median premium data (Healthcare.gov/state exchanges), MEPS for actuarial value of Medicaid, KFF for employer comparisons.",
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
