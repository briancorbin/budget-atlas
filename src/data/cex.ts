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
 * Status:
 *   - Geographic data (national all-CU, region all-CU, division all-CU)
 *     is populated from BLS CEX 2023-2024 two-year-average tables.
 *   - Income-quintile data (NATIONAL_QUINTILE_SPENDING, QUINTILE_THRESHOLDS_2024)
 *     is still zero placeholders — populates from BLS CEX 2024 single-year
 *     quintile table (Table 1101 equivalent) in a follow-up PR.
 *   - Until the income axis is populated, `cexLineItemSpending` short-
 *     circuits to 0 because `nationalQuintile === 0`. Callers should treat
 *     0 as "fall back to the legacy rolled-up field" until the schema is
 *     wired into `lib/budget.ts` end-to-end.
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

// ─── Source data ─────────────────────────────────────────────────────────
//
// Field-mapping notes (BLS CEX row → schema line item):
//   utilitiesElectricGas = naturalGas + electricity + fuelOil
//   healthcareOOP        = medicalServices + drugs + medicalSupplies
//                          (excludes "Health insurance" — that's the
//                           premium, sourced separately from KFF)
//   foodAtHome           = "Food at home"
//   foodAway             = "Food away from home"
//   utilitiesWaterPublic = "Water and other public services"
//   gasoline             = "Gasoline"
//   vehiclePurchase      = "Vehicle purchases (net outlay)"
//   vehicleOther         = "Other vehicle expenses"
//   apparel              = "Apparel and services"
//   entertainment        = "Entertainment"
//   personalCare         = "Personal care products and services"
//   education            = "Education"
//   householdOperations  = "Household operations"
//   housekeepingSupplies = "Housekeeping supplies"
//   furnishings          = "Household furnishings and equipment"
//
// Telephone services (CEX ~$1,431/CU/yr nationally) is intentionally
// excluded — `lib/budget.ts` already carries a separate phoneInternet
// line, and folding telephone services into utilitiesElectricGas would
// double-count.
//
// Reading, Tobacco, and Cash contributions are excluded as out of
// scope for the take-home model.

/**
 * National all-CU annual spending (denominator of the geo factor in the
 * synthetic blend). Source: BLS CEX 2023-2024 two-year average, Table 2700,
 * "All consumer units" column.
 *
 * 2023-2024 vintage matches the geographic tables; the 2024 single-year
 * income-quintile table will provide per-quintile numbers in a follow-up.
 */
export const NATIONAL_ALLCU_SPENDING: LineItemSpending = {
  foodAtHome: 6139,
  foodAway: 3939,
  utilitiesElectricGas: 2446, // 516 + 1798 + 132
  utilitiesWaterPublic: 803,
  gasoline: 2430,
  vehiclePurchase: 5437,
  vehicleOther: 4057,
  healthcareOOP: 2143, // 1252 + 624 + 267
  apparel: 2021,
  entertainment: 3622,
  personalCare: 964,
  education: 1552,
  householdOperations: 1953,
  housekeepingSupplies: 848,
  furnishings: 2461,
};

/**
 * National per-quintile spending shape. Carries the income elasticity
 * signal in the synthetic blend: a household at the 4th quintile spends
 * `Q4_PROFILE[item] / NATIONAL_ALLCU_SPENDING[item]` times the national
 * average on `item`, regardless of geography.
 *
 * TODO: Populate from BLS CEX 2024 single-year quintile table (Table 1101
 * equivalent). Until populated, `cexLineItemSpending` short-circuits to 0
 * for every cell because the quintile shape is zero.
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
 * Source: BLS CEX 2023-2024 two-year average, Table 1800 (region of
 * residence).
 */
export const REGION_ALLCU_SPENDING: Readonly<Record<BLSRegion, LineItemSpending>> = {
  Northeast: {
    foodAtHome: 7029,
    foodAway: 4240,
    utilitiesElectricGas: 2936, // 721 + 1787 + 428
    utilitiesWaterPublic: 623,
    gasoline: 2099,
    vehiclePurchase: 4915,
    vehicleOther: 4156,
    healthcareOOP: 2197, // 1338 + 609 + 250
    apparel: 2305,
    entertainment: 3670,
    personalCare: 1034,
    education: 2347,
    householdOperations: 2152,
    housekeepingSupplies: 941,
    furnishings: 2523,
  },
  Midwest: {
    foodAtHome: 5931,
    foodAway: 3721,
    utilitiesElectricGas: 2343, // 739 + 1503 + 101
    utilitiesWaterPublic: 743,
    gasoline: 2345,
    vehiclePurchase: 5410,
    vehicleOther: 3828,
    healthcareOOP: 2404, // 1388 + 701 + 315
    apparel: 1933,
    entertainment: 3912,
    personalCare: 911,
    education: 1611,
    householdOperations: 1674,
    housekeepingSupplies: 899,
    furnishings: 2440,
  },
  South: {
    foodAtHome: 5445,
    foodAway: 3483,
    utilitiesElectricGas: 2369, // 307 + 2002 + 60
    utilitiesWaterPublic: 777,
    gasoline: 2413,
    vehiclePurchase: 5312,
    vehicleOther: 3843,
    healthcareOOP: 1842, // 1013 + 590 + 239
    apparel: 1782,
    entertainment: 3022,
    personalCare: 859,
    education: 1188,
    householdOperations: 1798,
    housekeepingSupplies: 781,
    furnishings: 2153,
  },
  West: {
    foodAtHome: 6852,
    foodAway: 4708,
    utilitiesElectricGas: 2301, // 517 + 1724 + 60
    utilitiesWaterPublic: 1047,
    gasoline: 2797,
    vehiclePurchase: 6092,
    vehicleOther: 4575,
    healthcareOOP: 2386, // 1479 + 624 + 283
    apparel: 2301,
    entertainment: 4378,
    personalCare: 1145,
    education: 1521,
    householdOperations: 2334,
    housekeepingSupplies: 846,
    furnishings: 2978,
  },
};

/**
 * Per-division all-CU annual spending. Falls back to region when a
 * division-level row isn't published or a line item is suppressed for
 * sample-size reasons.
 *
 * Source: BLS CEX 2023-2024 two-year average, Table 2700 (Census division
 * of residence).
 */
export const DIVISION_ALLCU_SPENDING: Readonly<Record<BLSDivision, Partial<LineItemSpending>>> = {
  'New England': {
    foodAtHome: 7530,
    foodAway: 4264,
    utilitiesElectricGas: 3321, // 606 + 1948 + 767
    utilitiesWaterPublic: 580,
    gasoline: 2216,
    vehiclePurchase: 6104,
    vehicleOther: 4511,
    healthcareOOP: 2541, // 1569 + 681 + 291
    apparel: 2418,
    entertainment: 3987,
    personalCare: 975,
    education: 2755,
    householdOperations: 2541,
    housekeepingSupplies: 1117,
    furnishings: 2927,
  },
  'Middle Atlantic': {
    foodAtHome: 6839,
    foodAway: 4231,
    utilitiesElectricGas: 2783, // 767 + 1723 + 293
    utilitiesWaterPublic: 640,
    gasoline: 2052,
    vehiclePurchase: 4438,
    vehicleOther: 4013,
    healthcareOOP: 2061, // 1245 + 582 + 234
    apparel: 2264,
    entertainment: 3548,
    personalCare: 1058,
    education: 2183,
    householdOperations: 1995,
    housekeepingSupplies: 874,
    furnishings: 2362,
  },
  'East North Central': {
    foodAtHome: 6175,
    foodAway: 3728,
    utilitiesElectricGas: 2415, // 799 + 1516 + 100
    utilitiesWaterPublic: 699,
    gasoline: 2348,
    vehiclePurchase: 5026,
    vehicleOther: 3781,
    healthcareOOP: 2319, // 1273 + 744 + 302
    apparel: 2025,
    entertainment: 3938,
    personalCare: 909,
    education: 1573,
    householdOperations: 1655,
    housekeepingSupplies: 925,
    furnishings: 2456,
  },
  'West North Central': {
    foodAtHome: 5415,
    foodAway: 3706,
    utilitiesElectricGas: 2197, // 617 + 1477 + 103
    utilitiesWaterPublic: 832,
    gasoline: 2339,
    vehiclePurchase: 6200,
    vehicleOther: 3925,
    healthcareOOP: 2580, // 1624 + 615 + 341
    apparel: 1740,
    entertainment: 3856,
    personalCare: 914,
    education: 1688,
    householdOperations: 1712,
    housekeepingSupplies: 842,
    furnishings: 2405,
  },
  'South Atlantic': {
    foodAtHome: 5636,
    foodAway: 3563,
    utilitiesElectricGas: 2253, // 300 + 1884 + 69
    utilitiesWaterPublic: 736,
    gasoline: 2283,
    vehiclePurchase: 5036,
    vehicleOther: 3827,
    healthcareOOP: 1889, // 1043 + 578 + 268
    apparel: 1952,
    entertainment: 3194,
    personalCare: 905,
    education: 1418,
    householdOperations: 1897,
    housekeepingSupplies: 809,
    furnishings: 2278,
  },
  'East South Central': {
    foodAtHome: 6050,
    foodAway: 2910,
    utilitiesElectricGas: 2324, // 295 + 1960 + 69
    utilitiesWaterPublic: 767,
    gasoline: 2413,
    vehiclePurchase: 4845,
    vehicleOther: 3376,
    healthcareOOP: 1737, // 862 + 654 + 221
    apparel: 1450,
    entertainment: 2474,
    personalCare: 689,
    education: 1078,
    householdOperations: 1791,
    housekeepingSupplies: 752,
    furnishings: 2033,
  },
  'West South Central': {
    foodAtHome: 4791,
    foodAway: 3634,
    utilitiesElectricGas: 2601, // 326 + 2236 + 39
    utilitiesWaterPublic: 854,
    gasoline: 2647,
    vehiclePurchase: 6042,
    vehicleOther: 4110,
    healthcareOOP: 1812, // 1036 + 579 + 197
    apparel: 1644,
    entertainment: 2993,
    personalCare: 861,
    education: 833,
    householdOperations: 1626,
    housekeepingSupplies: 746,
    furnishings: 1992,
  },
  Mountain: {
    foodAtHome: 6721,
    foodAway: 4217,
    utilitiesElectricGas: 2393, // 564 + 1770 + 59
    utilitiesWaterPublic: 939,
    gasoline: 2623,
    vehiclePurchase: 6871,
    vehicleOther: 4854,
    healthcareOOP: 2673, // 1631 + 768 + 274
    apparel: 2353,
    entertainment: 4716,
    personalCare: 1215,
    education: 1129,
    householdOperations: 2015,
    housekeepingSupplies: 879,
    furnishings: 3077,
  },
  Pacific: {
    foodAtHome: 6909,
    foodAway: 4923,
    utilitiesElectricGas: 2258, // 495 + 1703 + 60
    utilitiesWaterPublic: 1096,
    gasoline: 2877,
    vehiclePurchase: 5736,
    vehicleOther: 4447,
    healthcareOOP: 2258, // 1410 + 560 + 288
    apparel: 2278,
    entertainment: 4230,
    personalCare: 1114,
    education: 1701,
    householdOperations: 2480,
    housekeepingSupplies: 831,
    furnishings: 2933,
  },
};

// Source for the geographic tables above is `bls-cex-geo-2-year-2023-2024`,
// surfaced on /sources directly via `Sources.tsx`. Kept out of this module
// to avoid pulling the full `SOURCES` registry into cex.ts's import graph
// when this file gets wired into the budget compute path.

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
