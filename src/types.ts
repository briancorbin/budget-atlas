export type FilingStatus = 'single' | 'married' | 'head';
export type Lifestyle = 'modest' | 'moderate' | 'comfortable';

export type StateCode =
  | 'AL'
  | 'AK'
  | 'AZ'
  | 'AR'
  | 'CA'
  | 'CO'
  | 'CT'
  | 'DE'
  | 'FL'
  | 'GA'
  | 'HI'
  | 'ID'
  | 'IL'
  | 'IN'
  | 'IA'
  | 'KS'
  | 'KY'
  | 'LA'
  | 'ME'
  | 'MD'
  | 'MA'
  | 'MI'
  | 'MN'
  | 'MS'
  | 'MO'
  | 'MT'
  | 'NE'
  | 'NV'
  | 'NH'
  | 'NJ'
  | 'NM'
  | 'NY'
  | 'NC'
  | 'ND'
  | 'OH'
  | 'OK'
  | 'OR'
  | 'PA'
  | 'RI'
  | 'SC'
  | 'SD'
  | 'TN'
  | 'TX'
  | 'UT'
  | 'VT'
  | 'VA'
  | 'WA'
  | 'WV'
  | 'WI'
  | 'WY'
  | 'DC';

export interface StateInfo {
  name: string;
  /**
   * State income tax brackets per filing status. Flat-tax states use a single
   * `[Infinity, rate]` bracket; no-tax states use `[Infinity, 0]`. Same
   * `progressiveTax` machinery as federal.
   */
  brackets: Record<FilingStatus, readonly TaxBracket[]>;
  /**
   * State standard deduction per filing status. Subtracted from gross before
   * brackets apply. States without a standard deduction use 0 (some use a
   * personal exemption instead, which we approximate inside the brackets).
   */
  stdDeduction: Record<FilingStatus, number>;
  /** 2026 minimum hourly wage. Federal $7.25 floor where state has none. */
  min: number;
  /**
   * Authoritative source for this state's brackets and standard deduction —
   * typically the state Department of Revenue / Taxation. Cited in the
   * walkthrough header. The Tax Foundation aggregator remains in the page
   * footer as a cross-state cross-reference.
   */
  taxSource: Source;
}

export interface CityInfo {
  name: string;
  state: StateCode;
  /**
   * `'curated'` = hand-researched per-city profile sourced from RentCafe / Zillow / etc.
   * `'statewide'` = state-level fallback used when no curated city exists for a state.
   * Defaults to `'curated'` if omitted (back-compat).
   */
  kind?: 'curated' | 'statewide';
  tier: 'Very High' | 'High' | 'Moderate' | 'Lower' | 'Very Low';
  /** Local income tax (NYC, some Ohio cities, some PA municipalities). */
  localTax: number;
  rent1: number; // 1BR median monthly rent
  rent3: number; // 3BR family-sized monthly rent
  groceries: number; // per person, monthly
  utilities: number; // monthly
  transit: number; // monthly transit pass
  carCost: number; // total monthly car cost (loan + ins + gas + maint)
  childcareInfant: number; // per child, monthly
  childcarePreschool: number;
  healthSingle: number; // employer plan + OOP, monthly
  healthFamily: number;
}

export interface Scenario {
  id: string;
  label: string;
  income: number;
  /** Optional second-earner income. When > 0, household is treated as dual-earner. */
  incomeB?: number;
  filing: FilingStatus;
  city: string;
  kids: number;
  lifestyle: Lifestyle;
  /**
   * One-line editorial takeaway shown next to the scenario in the picker.
   * Should teach something specific the household reveals about how the system
   * works (a marriage bonus/penalty, a benefit cliff, a credit phase-out, the
   * effect of state tax structure, etc.) — not a generic descriptor. Required
   * because every scenario should earn its place in the picker.
   */
  takeaway: string;
}

export interface BudgetInput {
  incomeA: number;
  incomeB?: number;
  /**
   * True when the household has a second adult (married, or cohabitating
   * with a partner). Drives household size independently of `incomeB` —
   * a stay-at-home spouse still counts as a second adult.
   */
  hasPartner?: boolean;
  filing: FilingStatus;
  city: string;
  kids: number;
  lifestyle: Lifestyle;
  /**
   * Set of benefit program IDs the household is claiming. Eligibility is
   * computed separately; this only controls whether the program's effect
   * is applied to the budget. Unknown / ineligible IDs are ignored.
   */
  claimedBenefits?: ReadonlySet<string>;
}

export interface BudgetResult {
  grossIncome: number;
  incomeA: number;
  incomeB: number;
  hasSecondIncome: boolean;
  adults: number;
  householdSize: number;
  // Tax components
  federalTax: number; // post-credits, can be negative (refund)
  fedTaxRaw: number; // pre-credits
  ctc: number;
  eitc: number;
  stateTax: number;
  localTax: number;
  fica: number;
  totalTaxes: number;
  taxableIncome: number;
  // Net & monthly
  netIncome: number;
  monthlyNet: number;
  // Expenses
  expenses: Record<string, number>;
  totalExpenses: number;
  // Premium-only portion of the healthcare expense (KFF employer-share,
  // monthly). The rest of the Healthcare line is CEX out-of-pocket.
  // Surfaced so benefit checks can isolate the premium — CHIP value is
  // the kids' premium share specifically, not premium + OOP.
  healthcarePremium: number;
  discretionary: number;
  annualDiscretionary: number;
  // Benefits applied (per-program monthly benefit actually used in this calc)
  benefitsApplied: Record<string, number>;
  totalBenefits: number;
  // Suggested allocation of surplus
  suggestedSavings: number;
  suggestedVacation: number;
  suggestedSplurge: number;
  suggestedEmergency: number;
  // References
  cityData: CityInfo;
  stateData: StateInfo;
  // BLS CEX provenance: which geographic granularity (msa / division /
  // region) sourced each CEX-derived expense line. Surfaced in the
  // drill-down UI so readers can see "this came from your MSA" vs
  // "...your division." Unpopulated for transit-mode transportation
  // (not CEX) and for line items where MSA data isn't broken out.
  cexProvenance: Readonly<Partial<Record<string, 'msa' | 'division' | 'region'>>>;
  // Income quintile the household landed in, per BLS Table 1101 thresholds.
  incomeQuintile: 'q1' | 'q2' | 'q3' | 'q4' | 'q5';
}

export type TaxBracket = readonly [number, number]; // [cap, rate]

/**
 * Reference for a piece of data shown in the app. Every numeric value the
 * model displays should be traceable to a Source. Where the value is an
 * approximation rather than a published statistic, label it as such honestly
 * (e.g. label: "Approximate / illustrative") rather than fake-citing.
 *
 * See README "Sources" section for the master list.
 */
export interface Source {
  /**
   * Stable slug that identifies the source across URL changes. Review history
   * in `audit/links/reviewed.tsv` is keyed by this — so when a URL moves
   * (agency restructures, slug rename), prior reviews still attach to the
   * source. Top-level entries use their record key (e.g. `irs-rev-proc-2025-32`);
   * state-keyed maps synthesize ids like `state-dor-ca`, `state-snap-tx`.
   */
  id: string;
  /** Short citation label, e.g. "IRS Rev. Proc. 2025-32". */
  label: string;
  /** Canonical URL the citation resolves to. */
  url: string;
  /** Optional retrieval / publication date in ISO form. */
  date?: string;
  /**
   * Trust tier of the source — distance from the publisher of the underlying
   * data and the methodology character behind it.
   *
   *   - `'primary'`     — direct from the agency / data publisher / statutory
   *                       text. Includes federal agencies on their own data
   *                       (IRS, BLS, SSA, HUD, eCFR) AND state agencies on
   *                       their own programs (state DORs, state SNAP /
   *                       Medicaid / CHIP portals).
   *   - `'reference'`   — peer-respected third-party interpretation,
   *                       methodology document, or original research-org
   *                       survey (KFF, EPI, CBPP, Tax Foundation, NCSL,
   *                       AAA, HUD Handbook, Child Care Aware).
   *   - `'commercial'`  — commercial or crowd-sourced data product —
   *                       methodology proprietary or community-driven, not
   *                       peer-reviewed (Zillow, RentCafe, Care.com, Numbeo).
   */
  tier?: 'primary' | 'reference' | 'commercial';
  /** Audit attribution: who added this citation to the registry (handle / name). */
  addedBy?: string;
  /** Audit attribution: when this citation was added (YYYY-MM-DD). */
  addedAt?: string;
}
