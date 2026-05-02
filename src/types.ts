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
  /** Short citation label, e.g. "IRS Rev. Proc. 2025-32". */
  label: string;
  /** Canonical URL the citation resolves to. */
  url: string;
  /** Optional retrieval / publication date in ISO form. */
  date?: string;
}
