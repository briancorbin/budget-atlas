import type { BudgetInput, BudgetResult } from '@/types';
import { getCityData } from '@/data/cities';
import { STATES } from '@/data/states';
import { FEDERAL_BRACKETS_2026, STD_DEDUCTION_2026 } from '@/data/federalTax';
import { progressiveTax, calcFICA, calcChildTaxCredit, calcEITC } from '@/lib/tax';
import { checkChip, checkMedicaid, checkSnap } from '@/lib/benefits';
import {
  cexLineItemSpendingForCity,
  cuSizeBucket,
  quintileFromIncome,
  type BLSCEXLineItem,
  type GeoGranularity,
} from '@/data/cex';

/**
 * Per-line categorization for the essentials vs. lifestyle split (#203).
 * Keys are the labels used in `BudgetResult.expenses` — granular sub-
 * lines, not rolled-up parents. Food and transportation get split into
 * their constituent lines so each one lands cleanly in 'essential' or
 * 'lifestyle': 'Food at home' is essential, 'Food away' / 'Alcohol'
 * are lifestyle; 'Transit' / 'Gasoline' / 'Vehicle insurance' /
 * 'Vehicle maintenance & repair' / 'Vehicle (other expenses)' are
 * essential, 'Vehicle (purchase)' is lifestyle. The ExpenseBreakdown
 * component groups these under "Mixed" rollups in the UI when both
 * kinds appear.
 *
 * Apparel and Personal Care are gray-zone (the BLS lines bundle
 * essentials with discretionary), filed as lifestyle because the
 * discretionary share dominates spending in those categories.
 */
/**
 * Per-line source attribution. Drives the small "source: X" label in
 * the detail-view UI so a reader can tell at a glance whether a number
 * came from BLS CEX, a commercial dataset, or a hand-tuned formula.
 *
 * Healthcare is mixed: the premium component comes from KFF (reference
 * tier), the OOP component from BLS CEX (primary tier). Both are
 * surfaced.
 *
 * Audit gaps: 'Home internet', 'Renters insurance', and 'Transit'
 * currently carry no formal source — Home internet and Renters
 * insurance are flat-value placeholders in this file (FCC Urban Rate
 * Survey and III state-level data are the right replacements); Transit
 * is a per-city curated value in cityData with no published source
 * citation. These are flagged as `tier: 'none'` so the UI can render
 * them honestly rather than pretending they're cited.
 */
export interface ExpenseSource {
  label: string;
  /**
   * The visual tier here labels how a *line* is sourced (not just the
   * tier of a single source). Single-source lines use the underlying
   * source's tier (primary / reference / commercial). Lines that
   * combine multiple sources use 'mixed'. Lines without a formal
   * source use 'none'. This is decoupled from `Source.tier` in
   * sources.ts which classifies individual sources only.
   */
  tier: 'primary' | 'reference' | 'commercial' | 'mixed' | 'none';
  /** Short description shown in the hover popover. */
  description: string;
}

const BLS_CEX: ExpenseSource = {
  label: 'BLS CEX',
  tier: 'primary',
  description:
    'Bureau of Labor Statistics Consumer Expenditure Survey — the primary US-government dataset on household spending. We use Table 1101 (income quintiles) for the income axis and the region / division / MSA cross-tabs for the geographic axis, blended via the synthetic factor (nationalQuintile × geoAllCU/nationalAllCU).',
};

export const EXPENSE_SOURCE: Record<string, ExpenseSource> = {
  Housing: {
    label: 'RentCafe / Zillow',
    tier: 'commercial',
    description:
      "City-specific median rents, hand-curated per city in src/data/cities.ts. RentCafe and Zillow publish monthly market data; values are rounded to the nearest $50–100. 1BR for solo / couple-no-kids, 3BR for any household with kids. Replaces BLS's 'Shelter' line, which is averaged across owners and renters and isn't useful as a renter-specific number. Only populates when tenure is 'renter'; owners see $0 here.",
  },
  'Mortgage P&I': {
    label: 'Census ACS B25088 (planned, #13)',
    tier: 'none',
    description:
      'Mortgage principal + interest. Currently a $0 placeholder — the actual mortgage math (purchase price, down payment, rate, term) lands with roadmap #13. Census ACS Selected Monthly Owner Costs (B25088) is the planned baseline source for the median; cited in `sources.ts` (`census-acs-owner-costs`).',
  },
  'Property tax': {
    label: 'Census ACS B25103 + Tax Foundation (planned, #13)',
    tier: 'none',
    description:
      'Annual property tax / 12. State-level effective rates vary enormously (TX ~1.6%, NJ ~2.2%, HI ~0.3%). Census ACS B25103 (median real-estate taxes paid) and Tax Foundation per-state effective rates are now in `sources.ts`. Currently $0 placeholder; populates with roadmap #13.',
  },
  'Homeowners insurance': {
    label: 'III state-level (planned, #13)',
    tier: 'none',
    description:
      'Homeowners insurance premium. State spread is 5×+ (FL ~$5K/yr, VT ~$1K/yr). III state-level avg expenditure tables (key: `iii-state-insurance` in `sources.ts`) are the planned source. Currently $0 placeholder; populates with roadmap #13.',
  },
  'Maintenance & repairs': {
    label: 'Roadmap #13 (placeholder)',
    tier: 'none',
    description:
      "Owner maintenance reserve, conventionally ~1% of home value per year. Currently $0 placeholder; populates with roadmap #13. CEX bundles this with HO insurance under 'Maintenance, repairs, insurance, and other expenses' on owned dwellings — when #13 lands, that bundle gets unbundled (insurance via III, maintenance from CEX residual).",
  },
  Utilities: BLS_CEX,
  'Cell service': BLS_CEX,
  'Home internet': {
    label: 'FCC Urban Rate Survey (planned)',
    tier: 'none',
    description:
      'Flat $70/mo placeholder for residential broadband. The FCC Urban Rate Survey is now in `sources.ts` (key: `fcc-urban-rate-survey`) — wiring the actual benchmark values to this leaf is the next step. The placeholder reflects FCC URS median (~$60–80/mo); the source is cited even before the per-cell data lands.',
  },
  'Renters insurance': {
    label: 'III state-level (planned)',
    tier: 'none',
    description:
      'Flat $25/mo placeholder. The Insurance Information Institute is now in `sources.ts` (key: `iii-state-insurance`) — wiring the actual state-level avg expenditure to this leaf is the next step. III publishes state-level renters insurance averages from NAIC data; storm-risk states (TX/MS/OK) run higher than the placeholder, low-risk states lower.',
  },
  'Life & disability insurance': {
    label: 'BLS CEX',
    tier: 'primary',
    description:
      'BLS CEX "Life and other personal insurance" subline of "Personal insurance and pensions." The pensions sub-line is intentionally NOT pulled — it overlaps with FICA (Social Security tax, already modeled) and pre-tax retirement contributions (roadmap #4), so consuming the parent rollup would double-count.',
  },
  'Housekeeping Supplies': BLS_CEX,
  Healthcare: {
    label: 'KFF (premium) + BLS CEX (OOP)',
    tier: 'mixed',
    description:
      "Healthcare splits two ways. The premium portion comes from KFF Employer Health Benefits Survey (worker share of an employer-sponsored plan, single vs. family). The out-of-pocket portion (deductibles, copays, drugs, supplies) comes from BLS CEX with insurance premium explicitly excluded — so KFF and BLS are added without double-counting. Benefit handling: when claimed AND eligible, Medicaid zeros the entire Healthcare line; CHIP offsets the kids' premium share only (adults' premium + the household's OOP stay). State-level variation in adult Medicaid scope (dental, vision, orthodontics range from comprehensive to emergency-only) isn't modeled in v1; finer state-by-state coverage modeling is roadmap #10.",
  },
  Childcare: {
    label: 'Care.com',
    tier: 'commercial',
    description:
      "Care.com Cost of Care Report — annual commercial survey of US childcare costs. We use the preschool monthly value × kids × 0.85 (mix-of-ages discount for after-school / part-time). Note: BLS's Education line includes a small daycare share that overlaps slightly with this — see issue #190.",
  },
  Education: BLS_CEX,
  'Food at home': BLS_CEX,
  'Food away': BLS_CEX,
  Alcohol: BLS_CEX,
  Transit: {
    label: 'Transit-agency rates',
    tier: 'none',
    description:
      "Hand-curated monthly transit-pass costs per city in src/data/cities.ts (e.g. NYC OMNY $132, SF Muni $81). Sourced from each city's transit agency website but not formally cited in our sources registry — known audit gap.",
  },
  Gasoline: BLS_CEX,
  'Vehicle insurance': BLS_CEX,
  'Vehicle maintenance & repair': BLS_CEX,
  'Vehicle (other expenses)': {
    label: 'BLS CEX (residual)',
    tier: 'primary',
    description:
      'CEX "Other vehicle expenses" rollup minus the surfaced vehicle insurance and maintenance subleaves. Captures finance charges, vehicle rentals/leases, and other miscellaneous vehicle expenses BLS bundles together but doesn\'t individually publish at our schema depth.',
  },
  'Vehicle (purchase)': BLS_CEX,
  Apparel: BLS_CEX,
  Entertainment: {
    label: 'BLS CEX (excl. Pets)',
    tier: 'primary',
    description:
      'BLS CEX "Entertainment" rollup with the Pets subline subtracted out — the surfaced Pets leaf already carries that spending, so leaving it in Entertainment would double-count. Toys, hobbies, and playground equipment stay in Entertainment.',
  },
  Pets: BLS_CEX,
  'Personal Care': BLS_CEX,
  'Household Operations': BLS_CEX,
  Furnishings: BLS_CEX,
  'Travel & lodging': BLS_CEX,
};

export const EXPENSE_CATEGORY: Record<string, 'essential' | 'lifestyle'> = {
  Housing: 'essential',
  'Mortgage P&I': 'essential',
  'Property tax': 'essential',
  'Homeowners insurance': 'essential',
  'Maintenance & repairs': 'essential',
  Utilities: 'essential',
  'Cell service': 'essential',
  'Home internet': 'essential',
  'Renters insurance': 'essential',
  'Life & disability insurance': 'essential',
  'Housekeeping Supplies': 'essential',
  Healthcare: 'essential',
  Childcare: 'essential',
  Education: 'essential',
  'Food at home': 'essential',
  'Food away': 'lifestyle',
  Alcohol: 'lifestyle',
  Transit: 'essential',
  Gasoline: 'essential',
  'Vehicle insurance': 'essential',
  'Vehicle maintenance & repair': 'essential',
  'Vehicle (other expenses)': 'essential',
  'Vehicle (purchase)': 'lifestyle',
  Apparel: 'lifestyle',
  Entertainment: 'lifestyle',
  Pets: 'lifestyle',
  'Personal Care': 'lifestyle',
  'Household Operations': 'lifestyle',
  Furnishings: 'lifestyle',
  'Travel & lodging': 'lifestyle',
};

/**
 * Per-leaf lifestyle elasticities for CEX-anchored line items. Each
 * value is the ± fraction at the modest / comfortable extremes; the
 * applied multiplier is `1 + elasticity * lifestyleSign` where
 * lifestyleSign is -1 / 0 / +1 for modest / moderate / comfortable.
 *
 * Replaces the previous global ±15-20% multiplier with per-line
 * elasticities. Justification per tier:
 *
 *   Low (±5%) — demand-driven by household size and needs; some
 *     compression possible (cheaper grocery store, cooler thermostat,
 *     less driving) but bounded. Backed by CEX q4/q3 spreads on these
 *     lines (~10–15% across adjacent quintiles).
 *
 *   Medium (±15%) — real lifestyle modulation but bounded by the
 *     household's actual needs. CEX spreads ~30–40% across quintiles.
 *
 *   High (±25%) — heavily discretionary; CEX q5/q1 ratios are 4–8× on
 *     these. Modest can genuinely cut deep, comfortable can balloon.
 *
 *   Zero — driven by config (filter at the BudgetInput level), not the
 *     dial. Education is the only such CEX line today (private K–12
 *     vs public is a school-choice decision; college tuition is
 *     life-stage; the dial doesn't move it).
 *
 * Non-CEX leaves (rent, healthcare premium, childcare, transit pass,
 * home internet, renters insurance) don't pass through this map and
 * stay at 1.0× implicitly. Cell service and Life & disability
 * insurance ARE now CEX-anchored (see the leaf restructure) and DO
 * pass through this map at their respective elasticities. The previous ±10% on baseRent is removed:
 * within a given city × bedroom config, "modest" means choosing fewer
 * bedrooms (a different config), not paying less for the same unit.
 * Bedroom-driven housing-footprint preferences are roadmap #16.
 */
export const LIFESTYLE_ELASTICITY: Record<BLSCEXLineItem, number> = {
  // Low elasticity (±5%) — demand-driven, modest compression possible
  foodAtHome: 0.05,
  utilitiesElectricGas: 0.05,
  utilitiesWaterPublic: 0.05,
  cellularService: 0.05, // bounded compression (cheaper plan)
  gasoline: 0.05,
  vehicleOther: 0.05, // catch-all rollup; sublines below carry the real per-line elasticities
  vehicleMaintRepair: 0.05, // wear-driven
  healthcareOOP: 0.05,
  personalCare: 0.05,
  housekeepingSupplies: 0.05,

  // Medium elasticity (±15%) — real lifestyle modulation
  apparel: 0.15,
  furnishings: 0.15,
  householdOperations: 0.15,
  pets: 0.15,

  // High elasticity (±25%) — heavily discretionary; CEX q5/q1 ratios 4–8×
  foodAway: 0.25,
  alcohol: 0.25,
  entertainment: 0.25,
  vehiclePurchase: 0.25,
  otherLodging: 0.25, // travel + vacation lodging

  // Fixed (0%) — contractually-fixed or config-driven; dial doesn't move them
  vehicleInsurance: 0, // premium is contractual within renewal cycle
  lifeInsurance: 0, // premium is contractual
  education: 0, // private vs public is a school-choice config decision
};

/**
 * Given household inputs, compute taxes, expenses, and discretionary income.
 *
 * Tax handling distinguishes three real cases:
 *   1. Married filing jointly — combined income, MFJ brackets, single std deduction
 *   2. Cohabitating partners (single/head + 2 incomes) — each files separately
 *   3. Single earner — current behavior
 *
 * FICA is always computed per-person because Social Security has a per-person
 * wage base cap.
 */
export function computeBudget(input: BudgetInput): BudgetResult {
  const {
    incomeA,
    incomeB = 0,
    hasPartner = false,
    filing,
    city,
    kids,
    lifestyle,
    tenure = 'renter',
    claimedBenefits,
  } = input;
  const cityData = getCityData(city);
  const stateData = STATES[cityData.state];
  const totalIncome = incomeA + incomeB;
  const hasSecondIncome = incomeB > 0;
  // Adults reflects the household composition the user explicitly modeled
  // via the partner toggle. Filing status drives tax math but never
  // household size — a married couple living apart, or filing jointly
  // while modeling one person's budget, both pick "no partner" and get a
  // 1-adult household. Income from a non-toggled partner is already zero.
  const adults = hasPartner ? 2 : 1;

  // ── Tax calculation ──
  let fedTaxRaw: number;
  let taxableIncome: number;
  let ctc: number;
  let eitc: number;

  // State tax: progressive brackets applied to (gross − state std deduction),
  // mirroring the per-earner logic of the federal return. Filing status at
  // the state level follows federal (MFJ → joint state return; cohabitating
  // → each files singly).
  let stateTax: number;

  if (filing === 'married') {
    // MFJ: one combined return regardless of one or two earners
    const std = STD_DEDUCTION_2026.married;
    taxableIncome = Math.max(0, totalIncome - std);
    fedTaxRaw = progressiveTax(taxableIncome, FEDERAL_BRACKETS_2026.married);
    ctc = calcChildTaxCredit(totalIncome, kids, 'married');
    eitc = calcEITC(totalIncome, kids, 'married');

    const stateTaxable = Math.max(0, totalIncome - stateData.stdDeduction.married);
    stateTax = progressiveTax(stateTaxable, stateData.brackets.married);
  } else if (hasSecondIncome) {
    // Cohabitating: each files singly. Person A may file HoH if there are kids.
    const stdA = STD_DEDUCTION_2026[filing];
    const stdB = STD_DEDUCTION_2026.single;
    const taxableA = Math.max(0, incomeA - stdA);
    const taxableB = Math.max(0, incomeB - stdB);
    taxableIncome = taxableA + taxableB;
    const fedRawA = progressiveTax(taxableA, FEDERAL_BRACKETS_2026[filing]);
    const fedRawB = progressiveTax(taxableB, FEDERAL_BRACKETS_2026.single);
    fedTaxRaw = fedRawA + fedRawB;
    // Only one parent can claim each child; primary earner does
    ctc = calcChildTaxCredit(incomeA, kids, filing);
    eitc = calcEITC(incomeA, kids, filing);

    const stateTaxableA = Math.max(0, incomeA - stateData.stdDeduction[filing]);
    const stateTaxableB = Math.max(0, incomeB - stateData.stdDeduction.single);
    stateTax =
      progressiveTax(stateTaxableA, stateData.brackets[filing]) +
      progressiveTax(stateTaxableB, stateData.brackets.single);
  } else {
    // Single earner
    const std = STD_DEDUCTION_2026[filing];
    taxableIncome = Math.max(0, incomeA - std);
    fedTaxRaw = progressiveTax(taxableIncome, FEDERAL_BRACKETS_2026[filing]);
    ctc = calcChildTaxCredit(incomeA, kids, filing);
    eitc = calcEITC(incomeA, kids, filing);

    const stateTaxable = Math.max(0, incomeA - stateData.stdDeduction[filing]);
    stateTax = progressiveTax(stateTaxable, stateData.brackets[filing]);
  }

  // CTC: $2,000/child, refundable up to $1,700 (2026 OBBBA).
  // EITC: fully refundable. Net federal tax can therefore go negative.
  const ctcRefundableCap = 1700 * kids;
  const taxAfterNonRefundable = Math.max(0, fedTaxRaw - ctc);
  const ctcRefundedExcess = Math.min(ctcRefundableCap, Math.max(0, ctc - fedTaxRaw));
  const federalTax = taxAfterNonRefundable - ctcRefundedExcess - eitc;

  const localTax = totalIncome * (cityData.localTax || 0);
  const fica = calcFICA(incomeA) + (hasSecondIncome ? calcFICA(incomeB) : 0);

  const totalTaxes = federalTax + stateTax + localTax + fica;
  const netIncome = totalIncome - totalTaxes;
  const monthlyNet = netIncome / 12;

  // ── Expenses ──
  // Per-leaf lifestyle elasticities. Replaces the previous global ±15-20%
  // multiplier with per-line elasticities calibrated against CEX q5/q1
  // spreads. Some lines should NOT modulate with the dial: rent in a
  // given city × bedroom config is rent (you'd change config, not pay
  // 80% of rent for being modest); the Insurance leaf (a separate
  // non-CEX line driven by III/state premium data) is contractually
  // fixed; childcare is per-kid not per-lifestyle. Those leaves don't
  // pass through this map (they get applied as 1.0× implicitly). Note
  // `vehicleOther` (auto insurance + maintenance) IS modulated through
  // this map at ±5% because the maintenance side has real lifestyle
  // give; the auto-insurance share is lifestyle-rigid but rolls in here
  // as part of the BLS bundle. Education is keyed here at 0% because
  // it's driven by the school-choice config (private vs public), not
  // the dial.
  //
  // Tier discipline:
  //   Low (±5%) — demand-driven, bounded compression: utilities, food at
  //     home, gasoline, vehicle maint+ins, healthcare OOP, personal care,
  //     housekeeping supplies.
  //   Medium (±15%) — real lifestyle modulation, bounded: apparel,
  //     furnishings.
  //   High (±25%) — heavily discretionary, CEX q5/q1 ratios 4–8×: food
  //     away, entertainment, vehicle purchase.
  //
  // Each value is the ± fraction at the modest/comfortable extremes;
  // moderate (`lifestyleSign === 0`) collapses the formula to 1.0× by
  // construction (`1 + elasticity * 0`) — pinned by the "moderate dial
  // leaves CEX-line spending at 1.0×" test in `per-leaf lifestyle
  // elasticities` (budget.test.ts) which asserts the symmetric-midpoint
  // property `moderate === (modest + comfortable) / 2` on known lines.
  const lifestyleSign = lifestyle === 'modest' ? -1 : lifestyle === 'comfortable' ? 1 : 0;
  const elasticityFor = (item: BLSCEXLineItem): number => LIFESTYLE_ELASTICITY[item];
  const lifestyleMultFor = (item: BLSCEXLineItem): number =>
    1 + elasticityFor(item) * lifestyleSign;
  const householdSize = adults + kids;

  // ── BLS CEX wire-up ─────────────────────────────────────────────────
  // For every line item BLS CEX publishes, derive the household's monthly
  // spend from the (city/MSA × division × region × income-quintile ×
  // CU-size) blend. The lifestyle lever (see LIFESTYLE_ELASTICITY above)
  // applies a per-line ± elasticity on top — symmetric `1 ± elasticity`
  // at the modest/comfortable extremes, 1.0× at moderate. Replaces the
  // previous global ±15-20% modulator with calibrated per-leaf tiers
  // (Low ±5%, Medium ±15%, High ±25%). Gives users a knob inside their
  // quintile without throwing out the BLS shape. CEX values are per
  // consumer-unit per year; we /12
  // for monthly. The CU-size factor (Table 1400) scales each line by the
  // 1p/2p/3p/4p/5+p column relative to the All-CU baseline — a 1-person
  // household lands ~0.55× a 4-person household lands ~1.40× on most
  // diffuse lines. This corrects the systematic bias of using "average
  // CU" (~2.5 people) values regardless of actual household size.
  //
  // The rolled-up legacy fields on `cityData` (groceries, utilities,
  // carCost, healthSingle/Family) were "approximate medians" hand-set
  // per city. They get superseded by CEX where the mapping is clean:
  //
  //   cityData.groceries        → cex.foodAtHome + cex.foodAway
  //   cityData.utilities        → cex.utilitiesElectricGas + cex.utilitiesWaterPublic
  //   cityData.carCost          → cex.gasoline + cex.vehiclePurchase + cex.vehicleOther
  //   cityData.healthFamily/Single → KFF premium (still cityData) + cex.healthcareOOP
  //   cityData (none)           → cex.apparel / cex.entertainment / cex.personalCare /
  //                                cex.education / cex.householdOperations /
  //                                cex.housekeepingSupplies / cex.furnishings (NEW)
  //
  // Rent (HUD/Zillow), childcare (Care.com), phone/internet flat,
  // insurance flat — these stay non-CEX with their existing sources.
  // Income axis is smoothed across BLS quintile means — see
  // `smoothNationalQuintile` in src/data/cex.ts. The `quintile` value
  // below is still useful for the UI badge ("you're in q4") but no
  // longer drives spending lookups; passing `totalIncome` directly
  // eliminates the artifact step functions at quintile boundaries.
  //
  // Honesty caveat (synthetic-blend independence): the size axis is
  // multiplied as if independent of income/geography. Real distributions
  // aren't independent — small CUs skew lower-income/older, large CUs
  // skew middle-quintile parents — so the factor is least biased on
  // diffuse lines (food, utilities) and most strained on income-
  // correlated demographics. CE PUMD microdata would resolve this; the
  // synthetic blend is the published-table-only approximation.
  const quintile = quintileFromIncome(totalIncome);
  const cuSize = cuSizeBucket(householdSize);
  const cexGranularity: Partial<Record<BLSCEXLineItem, GeoGranularity>> = {};
  // Pre-elasticity monthly value (raw blended baseline / 12). Used by
  // residual computations that need to subtract one CEX subline from
  // another with the SAME elasticity tier — applying elasticity before
  // subtraction would distort the residual when the subline and parent
  // use different elasticities.
  const cexMonthlyBaseline = (item: BLSCEXLineItem): number => {
    const { spending, granularity } = cexLineItemSpendingForCity(
      city,
      cityData.state,
      totalIncome,
      item,
      cuSize,
    );
    if (granularity) cexGranularity[item] = granularity;
    return spending / 12;
  };
  const cexMonthly = (item: BLSCEXLineItem): number =>
    cexMonthlyBaseline(item) * lifestyleMultFor(item);

  // Housing footprint — sourced and editorial parts both flagged:
  //   solo, no kids        → 1BR  (HUD occupancy: 1 person fits a 1BR)
  //   couple, no kids      → 1BR × 1.2  (HUD says 2 people are within 1BR
  //                          occupancy limits; the +20% premium is an
  //                          editorial split between staying in a 1BR vs.
  //                          stepping up to a small 2BR. Zillow rent-by-
  //                          bedroom data shows 1BR→2BR runs ~25–30% in
  //                          most metros, so 1.2× is a "blended" couple.)
  //   any kids             → 3BR family-sized  (matches HUD FMR's family
  //                          benchmark and EPI Family Budget Calculator,
  //                          which both use 3BR for households with
  //                          children regardless of count)
  // See RENT_LOGIC_SOURCES in src/data/cities.ts for citations.
  let baseRent: number;
  if (kids >= 1) baseRent = cityData.rent3;
  else if (adults === 2) baseRent = cityData.rent1 * 1.2;
  else baseRent = cityData.rent1;
  // Tenure-aware housing leaves. Renters get the rent + renters
  // insurance leaves populated; owners get the owner leaves (mortgage
  // P&I, property tax, HO insurance, maintenance), with rent zeroed
  // out. The mortgage P&I / property tax / HO insurance / maintenance
  // VALUES are still $0 placeholders until the actual math lands in
  // roadmap #13 — this PR just exposes the tenure config and gates
  // visibility, so the model stops silently assuming everyone rents.
  // Within renter mode rent is fixed at 1.0× across the lifestyle dial
  // (modest = pick fewer bedrooms = a config decision, not the dial;
  // bedroom-count preferences are roadmap #16).
  const isRenter = tenure === 'renter';
  const housing = isRenter ? baseRent : 0;
  // Owner leaves — all $0 placeholders for v1; mortgage math is #13.
  const mortgagePI = 0;
  const propertyTax = 0;
  const homeownersInsurance = 0;
  const homeMaintenance = 0;

  // Utilities = electric + gas + fuel oil + water/public. Phone/internet
  // stays as a separate line (CEX rolls "Telephone services" into the
  // same parent label, but our model keeps it broken out).
  const utilities = cexMonthly('utilitiesElectricGas') + cexMonthly('utilitiesWaterPublic');

  // Groceries = food at home + food away. CEX splits these; we keep
  // them broken out for the essentials vs. lifestyle split (#203):
  // foodAtHome is essential, foodAway (dining out) is lifestyle. SNAP
  // can only be redeemed at qualifying retailers (no restaurants), so
  // the SNAP offset comes off foodAtHome specifically, not the
  // combined groceries line.
  const foodAtHome = cexMonthly('foodAtHome');
  const foodAway = cexMonthly('foodAway');

  // Transportation: big transit cities + childless → transit pass per
  // adult (transit isn't in CEX; keep cityData.transit). Otherwise use
  // CEX vehicle line items (gasoline + vehicle purchase + other).
  // Broken out for the essentials vs. lifestyle split (#203): transit
  // pass / gasoline / vehicleOther (insurance, registration, maint)
  // are essential; vehiclePurchase is lifestyle (a car upgrade beyond
  // a baseline working vehicle).
  const isTransitCity = ['nyc', 'sf', 'bos', 'dc', 'chi'].includes(city);
  const usesTransit = isTransitCity && kids === 0;
  const transitCost = usesTransit ? cityData.transit * adults : 0;
  // For each car line, capture the BLS-modeled value separately from
  // the shipped value. When `usesTransit` is true the shipped value is
  // forced to 0 (model assumption: transit-only household has no car),
  // but the BLS number stays available so the UI can show the
  // model-vs-shipped comparison and explain the override.
  //
  // Vehicle leaves split per the locked tree: Vehicle insurance and
  // Vehicle maintenance & repair are now separate CEX-anchored leaves.
  // The remainder of CEX "Other vehicle expenses" (finance + rental/
  // leases + other) lives in a residual leaf "Vehicle (other expenses)"
  // computed as `vehicleOther - vehicleInsurance - vehicleMaintRepair`
  // so that totals reconcile with the parent CEX line.
  const gasolineBls = cexMonthly('gasoline');
  // Compute the (vehicleOther - insurance - maint) residual at the
  // pre-elasticity baseline so the subtraction isn't distorted by the
  // different elasticity tiers (vehicleOther: 5%, vehicleInsurance:
  // 0%, vehicleMaintRepair: 7%). Apply vehicleOther's elasticity once
  // to the residual so the residual leaf still moves with the dial.
  const vehicleOtherBaselineMonthly = cexMonthlyBaseline('vehicleOther');
  const vehicleInsuranceBaselineMonthly = cexMonthlyBaseline('vehicleInsurance');
  const vehicleMaintRepairBaselineMonthly = cexMonthlyBaseline('vehicleMaintRepair');
  const vehicleOtherResidualBaseline = Math.max(
    0,
    vehicleOtherBaselineMonthly -
      vehicleInsuranceBaselineMonthly -
      vehicleMaintRepairBaselineMonthly,
  );
  const vehicleInsuranceBls =
    vehicleInsuranceBaselineMonthly * lifestyleMultFor('vehicleInsurance');
  const vehicleMaintRepairBls =
    vehicleMaintRepairBaselineMonthly * lifestyleMultFor('vehicleMaintRepair');
  const vehicleOtherResidualBls = vehicleOtherResidualBaseline * lifestyleMultFor('vehicleOther');
  const vehiclePurchaseBls = cexMonthly('vehiclePurchase');
  const gasoline = usesTransit ? 0 : gasolineBls;
  const vehicleInsurance = usesTransit ? 0 : vehicleInsuranceBls;
  const vehicleMaintRepair = usesTransit ? 0 : vehicleMaintRepairBls;
  const vehicleOtherResidual = usesTransit ? 0 : vehicleOtherResidualBls;
  const vehiclePurchase = usesTransit ? 0 : vehiclePurchaseBls;

  // Healthcare = KFF employer-plan premium (still cityData) + CEX OOP.
  // Medicaid covers both — zeros the entire line. CHIP value is the kids'
  // marginal premium share specifically (see checkChip), so the panel-side
  // offset under CHIP only ever matches what CHIP actually replaces.
  const hasFamilyPlan = adults === 2 || kids > 0;
  const healthcarePremium = hasFamilyPlan ? cityData.healthFamily : cityData.healthSingle;
  const healthcareOOP = cexMonthly('healthcareOOP');
  const healthcare = healthcarePremium + healthcareOOP;

  // Childcare lite: kids × preschool average × 0.85 (mix of ages, after-school discount)
  const childcare = kids > 0 ? cityData.childcarePreschool * kids * 0.85 : 0;

  // Phone & Internet split per the locked tree:
  //   Cell service → CEX "Cellular phone service" subline (BLS-anchored,
  //                  scales by household size from Table 1400).
  //   Home internet → flat ~$70/mo placeholder. Closes #131 audit gap
  //                  partially (cell now BLS-backed); home internet will
  //                  be replaced by FCC Urban Rate Survey in a follow-up.
  const cellService = cexMonthly('cellularService');
  const homeInternet = 70; // FCC Urban Rate Survey median for residential broadband, ballpark; not yet a cited source

  // Insurance split per the locked tree:
  //   Renters insurance → flat $25/mo placeholder, only when tenure is
  //                       'renter'. Will be replaced by III state-level
  //                       data in a follow-up.
  //   Life & disability insurance → CEX "Life and other personal
  //                       insurance" subline. Pensions explicitly NOT
  //                       pulled to avoid FICA + roadmap-#4 overlap.
  const rentersInsurance = isRenter ? 25 : 0;
  const lifeInsurance = cexMonthly('lifeInsurance');

  // CEX-derived line items the model previously omitted entirely.
  // Each is per-CU monthly × lifestyle.
  const apparel = cexMonthly('apparel');
  // Entertainment is the rolled-up CEX line; we strip out Pets so the
  // surfaced Entertainment + Pets leaves don't double-count. Pets is
  // CEX subline of "Pets, toys, hobbies, and playground equipment" —
  // we only subtract the Pets cell (toys/hobbies/playground stay in
  // Entertainment).
  // Same pre-elasticity-subtraction pattern as vehicleOther: the
  // entertainment rollup includes pets, but pets gets surfaced as its
  // own leaf with its own elasticity tier (15% vs entertainment's 25%).
  // Subtract at the baseline, then apply each leaf's own elasticity.
  const entertainmentBaselineMonthly = cexMonthlyBaseline('entertainment');
  const petsBaselineMonthly = cexMonthlyBaseline('pets');
  const entertainmentResidualBaseline = Math.max(
    0,
    entertainmentBaselineMonthly - petsBaselineMonthly,
  );
  const entertainment = entertainmentResidualBaseline * lifestyleMultFor('entertainment');
  const pets = petsBaselineMonthly * lifestyleMultFor('pets');
  const personalCare = cexMonthly('personalCare');
  const education = cexMonthly('education');
  const householdOperations = cexMonthly('householdOperations');
  const housekeepingSupplies = cexMonthly('housekeepingSupplies');
  const furnishings = cexMonthly('furnishings');
  const alcohol = cexMonthly('alcohol');
  const travelLodging = cexMonthly('otherLodging');

  // ── Benefits ──
  // For each claimed program, compute eligibility from inputs (re-checked
  // here so the budget can never apply a benefit the household isn't
  // eligible for, even if the UI somehow lets them claim it).
  const benefitsApplied: Record<string, number> = {};
  // SNAP redeems against foodAtHome only (no restaurants), so the
  // offset reduces the essential foodAtHome line; foodAway is
  // unaffected.
  let foodAtHomeAfterBenefits = foodAtHome;
  let healthcareAfterBenefits = healthcare;

  const benefitInputs = {
    grossIncome: totalIncome,
    householdSize,
    state: cityData.state,
    adults,
    kids,
    // Total healthcare cost (premium + OOP) — Medicaid covers both.
    monthlyHealthcareCost: healthcare,
    // Premium-only — CHIP covers the kids' premium share, not OOP. Without
    // this split CHIP value would be inflated by the OOP component.
    monthlyHealthcarePremium: healthcarePremium,
    monthlyHealthcareSingle: cityData.healthSingle,
  };

  if (claimedBenefits?.has('snap')) {
    const snap = checkSnap(benefitInputs);
    if (snap.eligible && snap.monthlyBenefit > 0) {
      const offset = Math.min(snap.monthlyBenefit, foodAtHome);
      foodAtHomeAfterBenefits = foodAtHome - offset;
      benefitsApplied['SNAP'] = offset;
    }
  }

  // Medicaid takes priority over CHIP — if Medicaid covers the household,
  // CHIP isn't separately needed (Medicaid covers kids too in this case).
  // Medicaid zeros the full healthcare line (premium + OOP). CHIP is
  // computed from monthlyHealthcarePremium (kids' marginal premium share)
  // and applied as a partial offset against the same line.
  let medicaidApplied = false;
  if (claimedBenefits?.has('medicaid')) {
    const med = checkMedicaid(benefitInputs);
    if (med.eligible) {
      benefitsApplied['Medicaid'] = healthcareAfterBenefits;
      healthcareAfterBenefits = 0;
      medicaidApplied = true;
    }
  }

  if (!medicaidApplied && claimedBenefits?.has('chip')) {
    const chip = checkChip(benefitInputs);
    if (chip.eligible && chip.monthlyBenefit > 0) {
      const offset = Math.min(chip.monthlyBenefit, healthcareAfterBenefits);
      healthcareAfterBenefits = healthcareAfterBenefits - offset;
      benefitsApplied['CHIP'] = offset;
    }
  }

  const totalBenefits = Object.values(benefitsApplied).reduce((s, n) => s + n, 0);

  // Essentials vs. lifestyle split (#203). The model previously
  // labeled "take-home − total expenses" as "Discretionary," but that
  // number actually deducts every line including foodAway, entertainment,
  // and vehiclePurchase — which IS the discretionary spending. Splitting
  // gives two honest readings:
  //
  //   discretionaryIncome = take-home − essentials   (textbook)
  //   surplus             = discretionaryIncome − lifestyle
  //                       = take-home − total expenses  (legacy
  //                                                     `discretionary`
  //                                                     field)
  //
  // Categorization is conservative. Unambiguously lifestyle: foodAway,
  // entertainment, vehiclePurchase, furnishings, householdOperations.
  // Gray-zone items (apparel, personalCare) bundle essentials with
  // discretionary in a single BLS line; we file them as lifestyle
  // because the discretionary share dominates. Education is essential
  // when present (tuition, school fees). vehicleOther (insurance,
  // registration, maintenance) is essential. Per-line user override is
  // roadmap #5.
  const essentialExpenses =
    housing +
    mortgagePI +
    propertyTax +
    homeownersInsurance +
    homeMaintenance +
    utilities +
    foodAtHomeAfterBenefits +
    transitCost +
    gasoline +
    vehicleInsurance +
    vehicleMaintRepair +
    vehicleOtherResidual +
    healthcareAfterBenefits +
    childcare +
    cellService +
    homeInternet +
    rentersInsurance +
    lifeInsurance +
    education +
    housekeepingSupplies;
  const lifestyleExpenses =
    foodAway +
    alcohol +
    vehiclePurchase +
    apparel +
    entertainment +
    pets +
    personalCare +
    householdOperations +
    furnishings +
    travelLodging;

  const totalExpenses = essentialExpenses + lifestyleExpenses;

  const discretionaryIncome = monthlyNet - essentialExpenses;
  const annualDiscretionaryIncome = discretionaryIncome * 12;
  const discretionary = monthlyNet - totalExpenses;
  const annualDiscretionary = discretionary * 12;

  const suggestedSavings = Math.max(0, discretionary * 0.5);
  const suggestedVacation = Math.max(0, discretionary * 0.2);
  const suggestedSplurge = Math.max(0, discretionary * 0.2);
  const suggestedEmergency = Math.max(0, discretionary * 0.1);

  return {
    grossIncome: totalIncome,
    incomeA,
    incomeB,
    hasSecondIncome,
    adults,
    householdSize,
    federalTax,
    fedTaxRaw,
    ctc,
    eitc,
    stateTax,
    localTax,
    fica,
    totalTaxes,
    taxableIncome,
    netIncome,
    monthlyNet,
    healthcarePremium,
    // Granular line items — every key is non-overlapping, so summing
    // values yields totalExpenses exactly. Food and Transportation are
    // exposed as their constituent parts (foodAtHome + foodAway +
    // alcohol; transit / gasoline / vehicle insurance / vehicle maint /
    // vehicle other / vehicle purchase) rather than pre-rolled, so the
    // drill-down UI can show the essentials-vs-lifestyle split inside
    // those parents. Pets is split out from Entertainment (CEX rolls
    // them together; we subtract Pets from Entertainment to avoid
    // double-counting). ALL keys are always present — when a category
    // doesn't apply to the household type the value is $0 (e.g.
    // Vehicle (purchase) for a transit-only household). expenseModelNotes
    // below records why a $0 line is $0 so the UI can distinguish
    // "model assumed N/A" from "BLS itself returned 0."
    expenses: {
      Housing: housing,
      'Mortgage P&I': mortgagePI,
      'Property tax': propertyTax,
      'Homeowners insurance': homeownersInsurance,
      'Maintenance & repairs': homeMaintenance,
      Utilities: utilities,
      'Cell service': cellService,
      'Home internet': homeInternet,
      'Renters insurance': rentersInsurance,
      'Life & disability insurance': lifeInsurance,
      'Housekeeping Supplies': housekeepingSupplies,
      Healthcare: healthcareAfterBenefits,
      Childcare: childcare,
      Education: education,
      'Food at home': foodAtHomeAfterBenefits,
      'Food away': foodAway,
      Alcohol: alcohol,
      Transit: transitCost,
      Gasoline: gasoline,
      'Vehicle insurance': vehicleInsurance,
      'Vehicle maintenance & repair': vehicleMaintRepair,
      'Vehicle (other expenses)': vehicleOtherResidual,
      'Vehicle (purchase)': vehiclePurchase,
      Apparel: apparel,
      Entertainment: entertainment,
      Pets: pets,
      'Personal Care': personalCare,
      'Household Operations': householdOperations,
      Furnishings: furnishings,
      'Travel & lodging': travelLodging,
    },
    expenseModelNotes: {
      // Vehicle/gasoline lines are forced to $0 for transit-only
      // households. BLS-derived values (`*Bls`) are preserved so the
      // detail view can show "BLS says $X, model overrode to $0
      // because the household uses transit."
      ...(usesTransit
        ? {
            Gasoline: {
              modelValue: gasolineBls,
              reason: 'No car modeled — transit-only household',
            },
            'Vehicle insurance': {
              modelValue: vehicleInsuranceBls,
              reason: 'No car modeled — transit-only household',
            },
            'Vehicle maintenance & repair': {
              modelValue: vehicleMaintRepairBls,
              reason: 'No car modeled — transit-only household',
            },
            'Vehicle (other expenses)': {
              modelValue: vehicleOtherResidualBls,
              reason: 'No car modeled — transit-only household',
            },
            'Vehicle (purchase)': {
              modelValue: vehiclePurchaseBls,
              reason: 'No car modeled — transit-only household',
            },
          }
        : {
            // For car households, Transit is forced to $0 — no BLS
            // counterpart since transit pass costs are sourced from
            // cityData, not CEX. modelValue stays null.
            Transit: {
              modelValue: null,
              reason: 'Modeled with a car instead of transit',
            },
          }),
      // Childcare is forced to $0 when no kids; no BLS counterpart
      // (childcare is sourced from cityData, not CEX).
      ...(kids === 0
        ? {
            Childcare: {
              modelValue: null,
              reason: 'No kids modeled',
            },
          }
        : {}),
      // Tenure-gated housing leaves. Renters get rent + renters
      // insurance; owners get mortgage / property tax / HO insurance /
      // maintenance. The model surfaces the inapplicable side with a
      // reason so the detail view can render "no rent — household
      // owns" or "no mortgage — household rents."
      ...(isRenter
        ? {
            'Mortgage P&I': {
              modelValue: null,
              reason: 'Household rents — mortgage math is roadmap #13',
            },
            'Property tax': {
              modelValue: null,
              reason: 'Household rents — owner-only line',
            },
            'Homeowners insurance': {
              modelValue: null,
              reason: 'Household rents — owner-only line',
            },
            'Maintenance & repairs': {
              modelValue: null,
              reason: 'Household rents — owner-only line',
            },
          }
        : {
            Housing: {
              modelValue: null,
              reason: 'Household owns — rent does not apply',
            },
            'Renters insurance': {
              modelValue: null,
              reason: 'Household owns — renters insurance does not apply',
            },
            ...(tenure === 'owner-no-mortgage'
              ? {
                  'Mortgage P&I': {
                    modelValue: null,
                    reason: 'Owner without mortgage — paid off',
                  },
                }
              : {
                  'Mortgage P&I': {
                    modelValue: null,
                    reason: 'Owner with mortgage — math is roadmap #13 (placeholder)',
                  },
                }),
          }),
    },
    totalExpenses,
    essentialExpenses,
    lifestyleExpenses,
    discretionaryIncome,
    annualDiscretionaryIncome,
    discretionary,
    annualDiscretionary,
    benefitsApplied,
    totalBenefits,
    suggestedSavings,
    suggestedVacation,
    suggestedSplurge,
    suggestedEmergency,
    cityData,
    stateData,
    cexProvenance: cexGranularity,
    incomeQuintile: quintile,
  };
}
