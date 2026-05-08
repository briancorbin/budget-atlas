/**
 * BLS Consumer Expenditure Survey (CEX) — geography × income schema.
 *
 * Issue #131 expands the rolled-up cost-of-living fields on `CityInfo` into
 * line items pulled directly from BLS CEX, with two axes of variation:
 *
 *   1. Geography  — eventual chain: city → state → division → region. This
 *                   module currently implements the state → division →
 *                   region portion. City- and state-level CEX cuts (where
 *                   they exist) wire in alongside their data.
 *   2. Income     — quintile of income-before-taxes (Table 1101).
 *
 * BLS does NOT publish a clean geo × income cross-tab, so we synthesize one
 * via the rule:
 *
 *     spending(geo, quintile, item)
 *       = nationalQuintile(item) × ( geoAllCU(item) / nationalAllCU(item) )
 *
 * where `geoAllCU` is the most-specific geographic average available —
 * division when populated, else region.
 *
 * This treats the income shape and the geographic shape as independent
 * multiplicative factors — wrong in degree but mostly right in direction.
 * See the methodology note (TODO: add /methodology page) for the full caveat
 * list and per-item exceptions.
 *
 * THIS FILE IS THE SCAFFOLDING ONLY — types, state mappings, the blend
 * helper, and the fallback chain. The actual BLS numbers (national-quintile
 * spending, regional all-CU spending, divisional all-CU spending, quintile
 * income thresholds) are populated as `0` placeholders with explicit `TODO`
 * markers. Each follow-up PR will fill in one BLS table with real numbers
 * and a paired source citation, in keeping with the repo's audit discipline.
 */

import type { StateCode } from '@/types';

// ─── Geographic axis ─────────────────────────────────────────────────────

/**
 * BLS geographic regions. Census Bureau region definitions, used as the
 * coarsest geographic fallback. `cu-region-2-year-average` table.
 */
export type BLSRegion = 'Northeast' | 'Midwest' | 'South' | 'West';

/**
 * BLS geographic divisions. Census Bureau division definitions — a finer
 * cut than region (9 divisions vs 4 regions). `cu-division-2-year-average`
 * table.
 */
export type BLSDivision =
  | 'New England'
  | 'Middle Atlantic'
  | 'East North Central'
  | 'West North Central'
  | 'South Atlantic'
  | 'East South Central'
  | 'West South Central'
  | 'Mountain'
  | 'Pacific';

/**
 * Census Bureau state → division mapping. Stable government data; not
 * sourced from a third party. Each division belongs to exactly one region,
 * and the region can be derived (see `divisionToRegion` below).
 */
export const STATE_TO_DIVISION: Record<StateCode, BLSDivision> = {
  // New England
  CT: 'New England',
  ME: 'New England',
  MA: 'New England',
  NH: 'New England',
  RI: 'New England',
  VT: 'New England',
  // Middle Atlantic
  NJ: 'Middle Atlantic',
  NY: 'Middle Atlantic',
  PA: 'Middle Atlantic',
  // East North Central
  IL: 'East North Central',
  IN: 'East North Central',
  MI: 'East North Central',
  OH: 'East North Central',
  WI: 'East North Central',
  // West North Central
  IA: 'West North Central',
  KS: 'West North Central',
  MN: 'West North Central',
  MO: 'West North Central',
  NE: 'West North Central',
  ND: 'West North Central',
  SD: 'West North Central',
  // South Atlantic (DC counts here per Census)
  DE: 'South Atlantic',
  DC: 'South Atlantic',
  FL: 'South Atlantic',
  GA: 'South Atlantic',
  MD: 'South Atlantic',
  NC: 'South Atlantic',
  SC: 'South Atlantic',
  VA: 'South Atlantic',
  WV: 'South Atlantic',
  // East South Central
  AL: 'East South Central',
  KY: 'East South Central',
  MS: 'East South Central',
  TN: 'East South Central',
  // West South Central
  AR: 'West South Central',
  LA: 'West South Central',
  OK: 'West South Central',
  TX: 'West South Central',
  // Mountain
  AZ: 'Mountain',
  CO: 'Mountain',
  ID: 'Mountain',
  MT: 'Mountain',
  NV: 'Mountain',
  NM: 'Mountain',
  UT: 'Mountain',
  WY: 'Mountain',
  // Pacific
  AK: 'Pacific',
  CA: 'Pacific',
  HI: 'Pacific',
  OR: 'Pacific',
  WA: 'Pacific',
};

/** Division → region rollup. Each division belongs to exactly one region. */
export const DIVISION_TO_REGION: Record<BLSDivision, BLSRegion> = {
  'New England': 'Northeast',
  'Middle Atlantic': 'Northeast',
  'East North Central': 'Midwest',
  'West North Central': 'Midwest',
  'South Atlantic': 'South',
  'East South Central': 'South',
  'West South Central': 'South',
  Mountain: 'West',
  Pacific: 'West',
};

export function stateToRegion(state: StateCode): BLSRegion {
  return DIVISION_TO_REGION[STATE_TO_DIVISION[state]];
}

// ─── Income axis ─────────────────────────────────────────────────────────

/**
 * Quintiles of income before taxes (BLS CEX Table 1101 equivalent).
 * `q1` = lowest-income 20%, `q5` = highest-income 20%.
 */
export type IncomeQuintile = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

/**
 * Upper-bound household gross-income thresholds (annual) defining each
 * quintile boundary, from BLS CEX Table 1101.
 *
 * TODO: Populate from BLS CEX 2024 single-year quintile table (xlsx). The
 * structure here is `{ q1Max, q2Max, q3Max, q4Max }` — anything above q4Max
 * is q5. While these are all-zero placeholders, `quintileFromIncome`
 * detects the placeholder state and returns `q3` (the median bucket), so
 * the model produces sensible mid-range values during the scaffolding
 * phase rather than treating every household as q1.
 */
export const QUINTILE_THRESHOLDS_2024: Readonly<{
  q1Max: number;
  q2Max: number;
  q3Max: number;
  q4Max: number;
}> = {
  q1Max: 0,
  q2Max: 0,
  q3Max: 0,
  q4Max: 0,
};

/**
 * Pick a household's income quintile from gross income.
 *
 * Defensively returns `q3` (the median-ish bucket) when thresholds are
 * still all-zero placeholders, so the model produces sensible-looking
 * mid-range numbers during the scaffolding phase rather than treating
 * every household as q1.
 */
export function quintileFromIncome(grossIncome: number): IncomeQuintile {
  const t = QUINTILE_THRESHOLDS_2024;
  if (t.q1Max === 0 && t.q2Max === 0 && t.q3Max === 0 && t.q4Max === 0) {
    return 'q3';
  }
  if (grossIncome <= t.q1Max) return 'q1';
  if (grossIncome <= t.q2Max) return 'q2';
  if (grossIncome <= t.q3Max) return 'q3';
  if (grossIncome <= t.q4Max) return 'q4';
  return 'q5';
}

// ─── Line items ──────────────────────────────────────────────────────────

/**
 * The CEX-sourced cost-of-living line items the schema covers. Excludes
 * categories sourced from non-CEX sources (rent → HUD/Zillow/RentCafe,
 * childcare → Care.com / Child Care Aware, healthcare premium → KFF).
 *
 * 15 line items, each appears as a row in the BLS CEX geography and
 * income tables.
 */
export type BLSCEXLineItem =
  | 'foodAtHome'
  | 'foodAway'
  | 'utilitiesElectricGas'
  | 'utilitiesWaterPublic'
  | 'gasoline'
  | 'vehiclePurchase'
  | 'vehicleOther'
  | 'healthcareOOP'
  | 'apparel'
  | 'entertainment'
  | 'personalCare'
  | 'education'
  | 'householdOperations'
  | 'housekeepingSupplies'
  | 'furnishings';

export const BLS_CEX_LINE_ITEMS: readonly BLSCEXLineItem[] = [
  'foodAtHome',
  'foodAway',
  'utilitiesElectricGas',
  'utilitiesWaterPublic',
  'gasoline',
  'vehiclePurchase',
  'vehicleOther',
  'healthcareOOP',
  'apparel',
  'entertainment',
  'personalCare',
  'education',
  'householdOperations',
  'housekeepingSupplies',
  'furnishings',
] as const;

/** A spending profile across all line items, in dollars per CU per year. */
export type LineItemSpending = Readonly<Record<BLSCEXLineItem, number>>;

const ZERO_PROFILE: LineItemSpending = {
  foodAtHome: 0,
  foodAway: 0,
  utilitiesElectricGas: 0,
  utilitiesWaterPublic: 0,
  gasoline: 0,
  vehiclePurchase: 0,
  vehicleOther: 0,
  healthcareOOP: 0,
  apparel: 0,
  entertainment: 0,
  personalCare: 0,
  education: 0,
  householdOperations: 0,
  housekeepingSupplies: 0,
  furnishings: 0,
};

// ─── Source data (TODO: populate from BLS in follow-up PRs) ──────────────

/**
 * National all-CU annual spending (denominator of the geo factor in the
 * synthetic blend). Sourced from BLS CEX 2024 single-year national
 * averages.
 *
 * TODO: Populate from BLS CEX 2024 Table 1101 "All CUs" column.
 */
export const NATIONAL_ALLCU_SPENDING: LineItemSpending = ZERO_PROFILE;

/**
 * National per-quintile spending shape. Carries the income elasticity
 * signal in the synthetic blend: a household at the 4th quintile spends
 * `Q4_PROFILE[item] / NATIONAL_ALLCU_SPENDING[item]` times the national
 * average on `item`, regardless of geography.
 *
 * TODO: Populate from BLS CEX 2024 Table 1101 quintile columns.
 */
export const NATIONAL_QUINTILE_SPENDING: Readonly<Record<IncomeQuintile, LineItemSpending>> = {
  q1: ZERO_PROFILE,
  q2: ZERO_PROFILE,
  q3: ZERO_PROFILE,
  q4: ZERO_PROFILE,
  q5: ZERO_PROFILE,
};

/**
 * Per-region all-CU annual spending. Carries the geographic shape in the
 * blend: `REGION_ALLCU_SPENDING[region][item] / NATIONAL_ALLCU_SPENDING[item]`
 * is the geo factor.
 *
 * TODO: Populate from BLS CEX cu-region-2-year-average (latest 2-year-avg
 * vintage published — currently 2023-2024).
 */
export const REGION_ALLCU_SPENDING: Readonly<Record<BLSRegion, LineItemSpending>> = {
  Northeast: ZERO_PROFILE,
  Midwest: ZERO_PROFILE,
  South: ZERO_PROFILE,
  West: ZERO_PROFILE,
};

/**
 * Per-division all-CU annual spending. Falls back to region when a
 * division-level row isn't published or a line item is suppressed for
 * sample-size reasons.
 *
 * TODO: Populate from BLS CEX cu-division-2-year-average (2023-2024).
 */
export const DIVISION_ALLCU_SPENDING: Readonly<Record<BLSDivision, Partial<LineItemSpending>>> = {
  'New England': {},
  'Middle Atlantic': {},
  'East North Central': {},
  'West North Central': {},
  'South Atlantic': {},
  'East South Central': {},
  'West South Central': {},
  Mountain: {},
  Pacific: {},
};

// ─── The synthetic blend ─────────────────────────────────────────────────

/**
 * Pure helper for the blend math. Takes the data inputs explicitly so it
 * can be tested without wiring through module-level constants. The public
 * `cexLineItemSpending` below is the thin shim that pulls the constants.
 *
 *     spending = quintileShape × geoFactor
 *     quintileShape = nationalQuintile
 *     geoFactor     = geoAllCU / nationalAllCU
 *
 * `geoAllCU` is the most-specific geographic average available — division
 * if non-zero/non-undefined, else region.
 *
 * Returns 0 when any input is zero or missing (signalling "no data yet").
 * Caller should treat 0 as "fall back to legacy rolled-up field," not as a
 * real $0 line item.
 */
export function blendCexSpending(inputs: {
  nationalAllCU: number;
  nationalQuintile: number;
  divisionAllCU: number | undefined;
  regionAllCU: number;
}): number {
  const { nationalAllCU, nationalQuintile, divisionAllCU, regionAllCU } = inputs;
  if (nationalAllCU === 0) return 0;
  if (nationalQuintile === 0) return 0;
  const geoAllCU = divisionAllCU !== undefined && divisionAllCU > 0 ? divisionAllCU : regionAllCU;
  if (geoAllCU === 0) return 0;
  return nationalQuintile * (geoAllCU / nationalAllCU);
}

/**
 * Compute a single line item's annual spending for a given (geography ×
 * income quintile) cell, via the synthetic blend rule.
 *
 * Returns 0 when source data is unpopulated. The caller should treat 0
 * as "no signal yet" and fall back to the rolled-up legacy field rather
 * than displaying a zero-dollar line item.
 */
export function cexLineItemSpending(
  state: StateCode,
  quintile: IncomeQuintile,
  item: BLSCEXLineItem,
): number {
  const region = stateToRegion(state);
  const division = STATE_TO_DIVISION[state];
  return blendCexSpending({
    nationalAllCU: NATIONAL_ALLCU_SPENDING[item],
    nationalQuintile: NATIONAL_QUINTILE_SPENDING[quintile][item],
    divisionAllCU: DIVISION_ALLCU_SPENDING[division][item],
    regionAllCU: REGION_ALLCU_SPENDING[region][item],
  });
}

/** Convenience: full per-line-item profile for a (state × income) cell. */
export function cexProfile(state: StateCode, quintile: IncomeQuintile): LineItemSpending {
  const out = {} as Record<BLSCEXLineItem, number>;
  for (const item of BLS_CEX_LINE_ITEMS) {
    out[item] = cexLineItemSpending(state, quintile, item);
  }
  return out;
}
