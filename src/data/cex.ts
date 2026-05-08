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
 *   - Geographic data populated from BLS CEX 2023-2024 two-year-average
 *     tables — national all-CU, 4 regions, 9 divisions, and 22 selected
 *     MSAs (12 of 15 line items per MSA; the three composite-utilities/
 *     healthcare fields aren't broken out at the MSA level by BLS).
 *   - Income-quintile data populated from BLS CEX 2024 single-year
 *     Table 1101.
 *   - `cexLineItemSpending(state, ...)` returns real numbers via the
 *     state → division → region chain.
 *   - `cexLineItemSpendingForCity(citySlug, state, ...)` extends the
 *     chain with MSA when the city has a mapping in `CITY_TO_MSA`,
 *     and reports back which granularity was used.
 *   - Not yet wired into `lib/budget.ts` — the existing rolled-up
 *     fields still drive the model; integration happens behind a flag
 *     in a follow-up PR.
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

/**
 * BLS Metropolitan Statistical Areas published with their own line-item
 * tables in the 2023-2024 vintage (`cu-msa-{ne,mw,s,w}-2-year-average`).
 * 22 MSAs total. Cities outside this set fall back to division → region.
 *
 * Caveat on coverage: the MSA tables don't break utilities and healthcare
 * into the same fine-grained sub-categories the region/division tables
 * do. They publish "Utilities, fuels, and public services" as a single
 * rolled-up number (combining natural gas + electricity + fuel oil +
 * telephone + water) and "Healthcare" as a single rolled-up number
 * (combining premium + medical services + drugs + supplies).
 *
 * As a result, `MSA_ALLCU_SPENDING` populates 12 of 15 line items per
 * MSA: foodAtHome, foodAway, gasoline, vehiclePurchase, vehicleOther,
 * apparel, entertainment, personalCare, education, householdOperations,
 * housekeepingSupplies, furnishings. The three composites
 * (utilitiesElectricGas, utilitiesWaterPublic, healthcareOOP) stay
 * undefined per MSA and `blendCexSpending` falls through to division for
 * those line items.
 *
 * Gasoline at the MSA level is "Gasoline and other fuels" rather than
 * just "Gasoline" — small inflation (a few percent) versus the
 * region/division denominator which is "Gasoline" only. Acceptable for
 * the synthetic blend's accuracy goals.
 */
export type BLSMSA =
  // Northeast
  | 'New York'
  | 'Philadelphia'
  | 'Boston'
  // Midwest
  | 'Chicago'
  | 'Detroit'
  | 'Minneapolis-St. Paul'
  | 'St. Louis'
  // South
  | 'Washington DC'
  | 'Baltimore'
  | 'Atlanta'
  | 'Miami'
  | 'Dallas-Fort Worth'
  | 'Houston'
  | 'Tampa'
  // West
  | 'Los Angeles'
  | 'San Francisco'
  | 'San Diego'
  | 'Seattle'
  | 'Phoenix'
  | 'Denver'
  | 'Honolulu'
  | 'Anchorage';

/** MSA → region rollup, derived from the BLS MSA-table groupings. */
export const MSA_TO_REGION: Record<BLSMSA, BLSRegion> = {
  'New York': 'Northeast',
  Philadelphia: 'Northeast',
  Boston: 'Northeast',
  Chicago: 'Midwest',
  Detroit: 'Midwest',
  'Minneapolis-St. Paul': 'Midwest',
  'St. Louis': 'Midwest',
  'Washington DC': 'South',
  Baltimore: 'South',
  Atlanta: 'South',
  Miami: 'South',
  'Dallas-Fort Worth': 'South',
  Houston: 'South',
  Tampa: 'South',
  'Los Angeles': 'West',
  'San Francisco': 'West',
  'San Diego': 'West',
  Seattle: 'West',
  Phoenix: 'West',
  Denver: 'West',
  Honolulu: 'West',
  Anchorage: 'West',
};

/**
 * Curated-city slug → BLS MSA mapping. Only includes cities with a direct
 * MSA match in the BLS 2023-2024 publication. Slugs not in this map fall
 * back to state → division → region during the geo lookup.
 *
 * Typed as `Partial<Record<...>>` so lookups correctly return
 * `BLSMSA | undefined` — most slugs (rural placeholders, non-MSA cities,
 * `xx_state` statewide-fallback ids) intentionally have no entry here.
 */
export const CITY_TO_MSA: Readonly<Partial<Record<string, BLSMSA>>> = {
  nyc: 'New York',
  bos: 'Boston',
  chi: 'Chicago',
  dc: 'Washington DC',
  atl: 'Atlanta',
  mia: 'Miami',
  la: 'Los Angeles',
  sf: 'San Francisco',
  sea: 'Seattle',
  phx: 'Phoenix',
  den: 'Denver',
};

// ─── Income axis ─────────────────────────────────────────────────────────

/**
 * Quintiles of income before taxes (BLS CEX Table 1101 equivalent).
 * `q1` = lowest-income 20%, `q5` = highest-income 20%.
 */
export type IncomeQuintile = 'q1' | 'q2' | 'q3' | 'q4' | 'q5';

/**
 * Upper-bound household gross-income thresholds (annual) defining each
 * quintile boundary. Source: BLS CEX 2024 single-year Table 1101, "Lower
 * limit" row. BLS publishes the quintile floors (e.g. q2 starts at
 * $29,932); we store the inclusive upper bound of the bucket below
 * (so q1Max = q2-floor − 1).
 *
 * Anything above q4Max is q5.
 */
export const QUINTILE_THRESHOLDS_2024: Readonly<{
  q1Max: number;
  q2Max: number;
  q3Max: number;
  q4Max: number;
}> = {
  q1Max: 29_931, // q2 floor: $29,932
  q2Max: 57_451, // q3 floor: $57,452
  q3Max: 94_510, // q4 floor: $94,511
  q4Max: 155_924, // q5 floor: $155,925
};

/**
 * Pick a household's income quintile from gross income.
 *
 * Floors the input to whole dollars before comparing — BLS publishes the
 * quintile floors as integer dollar values, and our `qNMax` constants are
 * stored as `floor − 1`. Without normalization, $29,931.99 would compare
 * as `> q1Max` (29,931) and bucket into q2, even though it's below the
 * published q2 floor of $29,932. The app's income inputs are integers
 * today, but the function signature doesn't enforce that — defensive
 * floor keeps the bucketing aligned with the published spec.
 */
export function quintileFromIncome(grossIncome: number): IncomeQuintile {
  const t = QUINTILE_THRESHOLDS_2024;
  const dollars = Math.floor(grossIncome);
  if (dollars <= t.q1Max) return 'q1';
  if (dollars <= t.q2Max) return 'q2';
  if (dollars <= t.q3Max) return 'q3';
  if (dollars <= t.q4Max) return 'q4';
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
 * National per-quintile spending shape. Source: BLS CEX 2024 single-year
 * Table 1101.
 *
 * Carries the income elasticity signal in the synthetic blend: a household
 * at the 4th quintile spends `q4[item] / NATIONAL_ALLCU_SPENDING[item]`
 * times the national average on `item`, regardless of geography.
 *
 * Vintage note: this table is 2024 single-year while the geographic
 * tables (NATIONAL_ALLCU_SPENDING / REGION_ALLCU_SPENDING /
 * DIVISION_ALLCU_SPENDING) are 2023-2024 two-year averages — BLS
 * publishes geographic detail only as 2-year averages because single-
 * year MSA samples are too thin. The geo factor `geoAllCU /
 * nationalAllCU` is computed entirely against 2023-2024, so it stays
 * internally consistent. The 2024 quintile shape is then multiplied
 * against that geo factor; differences between the 2024 single-year
 * and 2023-2024 two-year national-CU baselines are <2% on every line
 * item we consume, so the cross-vintage product is defensible.
 *
 * Education shows q1 > q2 (q1 spends $828 vs q2 $407) — not a data
 * error. q1 includes full-time students living off loans/family who
 * spend on tuition; q2 is mostly working-poor households without
 * college spend. BLS publishes this as-is.
 */
export const NATIONAL_QUINTILE_SPENDING: Readonly<Record<IncomeQuintile, LineItemSpending>> = {
  q1: {
    foodAtHome: 3843,
    foodAway: 1655,
    utilitiesElectricGas: 1626, // 287 + 1276 + 63
    utilitiesWaterPublic: 474,
    gasoline: 1177,
    vehiclePurchase: 1718,
    vehicleOther: 1653,
    healthcareOOP: 1292, // 661 + 416 + 215
    apparel: 1124,
    entertainment: 1316,
    personalCare: 427,
    education: 828,
    householdOperations: 851,
    housekeepingSupplies: 513,
    furnishings: 1086,
  },
  q2: {
    foodAtHome: 4952,
    foodAway: 2448,
    utilitiesElectricGas: 2191, // 410 + 1674 + 107
    utilitiesWaterPublic: 670,
    gasoline: 1893,
    vehiclePurchase: 2925,
    vehicleOther: 3019,
    healthcareOOP: 1632, // 848 + 644 + 140
    apparel: 1328,
    entertainment: 2156,
    personalCare: 659,
    education: 407,
    householdOperations: 1128,
    housekeepingSupplies: 681,
    furnishings: 1399,
  },
  q3: {
    foodAtHome: 5820,
    foodAway: 3277,
    utilitiesElectricGas: 2367, // 458 + 1813 + 96
    utilitiesWaterPublic: 803,
    gasoline: 2442,
    vehiclePurchase: 4121,
    vehicleOther: 4018,
    healthcareOOP: 1835, // 1063 + 572 + 200
    apparel: 1642,
    entertainment: 2764,
    personalCare: 852,
    education: 749,
    householdOperations: 1511,
    housekeepingSupplies: 798,
    furnishings: 1893,
  },
  q4: {
    foodAtHome: 7162,
    foodAway: 4682,
    utilitiesElectricGas: 2717, // 555 + 2023 + 139
    utilitiesWaterPublic: 945,
    gasoline: 3058,
    vehiclePurchase: 5945,
    vehicleOther: 5407,
    healthcareOOP: 2335, // 1384 + 700 + 251
    apparel: 2034,
    entertainment: 4133,
    personalCare: 1145,
    education: 1353,
    householdOperations: 2009,
    housekeepingSupplies: 1067,
    furnishings: 3015,
  },
  q5: {
    foodAtHome: 9336,
    foodAway: 7652,
    utilitiesElectricGas: 3347, // 751 + 2376 + 220
    utilitiesWaterPublic: 1236,
    gasoline: 3477,
    vehiclePurchase: 11938,
    vehicleOther: 6916,
    healthcareOOP: 3613, // 2297 + 957 + 359
    apparel: 3872,
    entertainment: 7660,
    personalCare: 1802,
    education: 4492,
    householdOperations: 4093,
    housekeepingSupplies: 1327,
    furnishings: 4668,
  },
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
 * Per-division all-CU annual spending. The 2023-2024 vintage publishes
 * every division × every line item we consume, so the current data is
 * fully populated (verified by the unit test). The value type stays
 * `Partial<LineItemSpending>` to accommodate future vintages where BLS
 * may suppress a cell for sample-size reasons (RSE > 50, etc.) — when
 * that happens a line item will be `undefined` and `blendCexSpending`
 * falls back to the region row.
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

/**
 * Per-MSA all-CU annual spending. Most-specific geographic level —
 * preferred over division when populated.
 *
 * Source: BLS CEX 2023-2024 two-year average, Tables 3004 / 3015 / 3024 /
 * 3033 (selected MSAs by region). Only 12 of 15 line items are
 * populated per MSA — see the BLSMSA type docstring for which fields
 * BLS doesn't break out at the MSA level.
 */
export const MSA_ALLCU_SPENDING: Readonly<Record<BLSMSA, Partial<LineItemSpending>>> = {
  'New York': {
    foodAtHome: 7033,
    foodAway: 4679,
    gasoline: 1804,
    vehiclePurchase: 3578,
    vehicleOther: 4166,
    apparel: 3040,
    entertainment: 3239,
    personalCare: 1163,
    education: 2674,
    householdOperations: 2251,
    housekeepingSupplies: 754,
    furnishings: 2162,
  },
  Philadelphia: {
    foodAtHome: 7044,
    foodAway: 5032,
    gasoline: 2244,
    vehiclePurchase: 4571,
    vehicleOther: 4395,
    apparel: 2252,
    entertainment: 4097,
    personalCare: 1040,
    education: 2891,
    householdOperations: 2368,
    housekeepingSupplies: 1179,
    furnishings: 2516,
  },
  Boston: {
    foodAtHome: 7993,
    foodAway: 5522,
    gasoline: 2224,
    vehiclePurchase: 5999,
    vehicleOther: 4110,
    apparel: 2659,
    entertainment: 4140,
    personalCare: 1339,
    education: 4453,
    householdOperations: 3443,
    housekeepingSupplies: 1397,
    furnishings: 3070,
  },
  Chicago: {
    foodAtHome: 7148,
    foodAway: 4567,
    gasoline: 2569,
    vehiclePurchase: 4429,
    vehicleOther: 4237,
    apparel: 2865,
    entertainment: 4684,
    personalCare: 1123,
    education: 2962,
    householdOperations: 1978,
    housekeepingSupplies: 1039,
    furnishings: 2776,
  },
  Detroit: {
    foodAtHome: 5815,
    foodAway: 3250,
    gasoline: 2733,
    vehiclePurchase: 3775,
    vehicleOther: 5053,
    apparel: 1801,
    entertainment: 3311,
    personalCare: 969,
    education: 1375,
    householdOperations: 1686,
    housekeepingSupplies: 662,
    furnishings: 2164,
  },
  'Minneapolis-St. Paul': {
    foodAtHome: 6273,
    foodAway: 5059,
    gasoline: 2434,
    vehiclePurchase: 7357,
    vehicleOther: 4462,
    apparel: 2944,
    entertainment: 5657,
    personalCare: 1259,
    education: 2791,
    householdOperations: 2126,
    housekeepingSupplies: 894,
    furnishings: 3832,
  },
  'St. Louis': {
    foodAtHome: 6312,
    foodAway: 4383,
    gasoline: 2685,
    vehiclePurchase: 5878,
    vehicleOther: 4208,
    apparel: 1725,
    entertainment: 4368,
    personalCare: 974,
    education: 1418,
    householdOperations: 2277,
    housekeepingSupplies: 767,
    furnishings: 2539,
  },
  'Washington DC': {
    foodAtHome: 7005,
    foodAway: 5905,
    gasoline: 2350,
    vehiclePurchase: 7593,
    vehicleOther: 4677,
    apparel: 3566,
    entertainment: 5129,
    personalCare: 1627,
    education: 3314,
    householdOperations: 3106,
    housekeepingSupplies: 998,
    furnishings: 3178,
  },
  Baltimore: {
    foodAtHome: 8305,
    foodAway: 5290,
    gasoline: 2363,
    vehiclePurchase: 7943,
    vehicleOther: 4235,
    apparel: 2591,
    entertainment: 4559,
    personalCare: 1217,
    education: 2518,
    householdOperations: 2334,
    housekeepingSupplies: 1374,
    furnishings: 2962,
  },
  Atlanta: {
    foodAtHome: 6074,
    foodAway: 3886,
    gasoline: 2884,
    vehiclePurchase: 5321,
    vehicleOther: 4479,
    apparel: 3175,
    entertainment: 3389,
    personalCare: 1266,
    education: 1863,
    householdOperations: 2529,
    housekeepingSupplies: 1067,
    furnishings: 2539,
  },
  Miami: {
    foodAtHome: 5331,
    foodAway: 2064,
    gasoline: 2149,
    vehiclePurchase: 4183,
    vehicleOther: 4401,
    apparel: 1561,
    entertainment: 2221,
    personalCare: 679,
    education: 493,
    householdOperations: 1594,
    housekeepingSupplies: 595,
    furnishings: 1486,
  },
  'Dallas-Fort Worth': {
    foodAtHome: 5353,
    foodAway: 4358,
    gasoline: 2811,
    vehiclePurchase: 7115,
    vehicleOther: 4373,
    apparel: 2208,
    entertainment: 2945,
    personalCare: 1282,
    education: 1257,
    householdOperations: 1825,
    housekeepingSupplies: 795,
    furnishings: 2469,
  },
  Houston: {
    foodAtHome: 6055,
    foodAway: 4414,
    gasoline: 2957,
    vehiclePurchase: 8020,
    vehicleOther: 4714,
    apparel: 2157,
    entertainment: 5245,
    personalCare: 1074,
    education: 918,
    householdOperations: 2126,
    housekeepingSupplies: 855,
    furnishings: 2346,
  },
  Tampa: {
    foodAtHome: 5127,
    foodAway: 3486,
    gasoline: 2452,
    vehiclePurchase: 4369,
    vehicleOther: 4694,
    apparel: 1278,
    entertainment: 4756,
    personalCare: 756,
    education: 852,
    householdOperations: 1469,
    housekeepingSupplies: 814,
    furnishings: 4090,
  },
  'Los Angeles': {
    foodAtHome: 6546,
    foodAway: 5312,
    gasoline: 3588,
    vehiclePurchase: 4652,
    vehicleOther: 4870,
    apparel: 2565,
    entertainment: 3441,
    personalCare: 1155,
    education: 1767,
    householdOperations: 2243,
    housekeepingSupplies: 777,
    furnishings: 2694,
  },
  'San Francisco': {
    foodAtHome: 7534,
    foodAway: 7143,
    gasoline: 2722,
    vehiclePurchase: 7548,
    vehicleOther: 4727,
    apparel: 3035,
    entertainment: 4600,
    personalCare: 1324,
    education: 3353,
    householdOperations: 3919,
    housekeepingSupplies: 776,
    furnishings: 3336,
  },
  'San Diego': {
    foodAtHome: 7618,
    foodAway: 4525,
    gasoline: 3921,
    vehiclePurchase: 8678,
    vehicleOther: 5294,
    apparel: 2290,
    entertainment: 4111,
    personalCare: 1347,
    education: 2660,
    householdOperations: 3281,
    housekeepingSupplies: 940,
    furnishings: 3643,
  },
  Seattle: {
    foodAtHome: 7607,
    foodAway: 6041,
    gasoline: 2796,
    vehiclePurchase: 6578,
    vehicleOther: 4919,
    apparel: 2083,
    entertainment: 5705,
    personalCare: 1382,
    education: 2786,
    householdOperations: 3069,
    housekeepingSupplies: 972,
    furnishings: 3859,
  },
  Phoenix: {
    foodAtHome: 5626,
    foodAway: 4584,
    gasoline: 2976,
    vehiclePurchase: 8268,
    vehicleOther: 5134,
    apparel: 1849,
    entertainment: 4379,
    personalCare: 1259,
    education: 1275,
    householdOperations: 2844,
    housekeepingSupplies: 826,
    furnishings: 3117,
  },
  Denver: {
    foodAtHome: 6990,
    foodAway: 4903,
    gasoline: 2407,
    vehiclePurchase: 7068,
    vehicleOther: 5657,
    apparel: 2090,
    entertainment: 7021,
    personalCare: 1463,
    education: 1670,
    householdOperations: 2061,
    housekeepingSupplies: 906,
    furnishings: 3028,
  },
  Honolulu: {
    foodAtHome: 8502,
    foodAway: 5668,
    gasoline: 2821,
    vehiclePurchase: 4036,
    vehicleOther: 3276,
    apparel: 2229,
    entertainment: 2739,
    personalCare: 1135,
    education: 1560,
    householdOperations: 1855,
    housekeepingSupplies: 836,
    furnishings: 2566,
  },
  Anchorage: {
    foodAtHome: 8007,
    foodAway: 3949,
    gasoline: 2847,
    vehiclePurchase: 5342,
    vehicleOther: 3869,
    apparel: 2229,
    entertainment: 4232,
    personalCare: 996,
    education: 1217,
    householdOperations: 1868,
    housekeepingSupplies: 988,
    furnishings: 2675,
  },
};

// Source for the geographic tables above is `bls-cex-geo-2-year-2023-2024`,
// surfaced on /sources directly via `Sources.tsx`. Kept out of this module
// to avoid pulling the full `SOURCES` registry into cex.ts's import graph
// when this file gets wired into the budget compute path.

// ─── The synthetic blend ─────────────────────────────────────────────────

/**
 * Granularity at which the geo factor was computed for a particular
 * lookup. Useful for surfacing "this came from your MSA / division /
 * region" provenance in the UI.
 */
export type GeoGranularity = 'msa' | 'division' | 'region';

/**
 * Pure helper for the blend math. Takes the data inputs explicitly so it
 * can be tested without wiring through module-level constants. The public
 * `cexLineItemSpending` and `cexLineItemSpendingForCity` below are the
 * thin shims that pull the constants.
 *
 *     spending = quintileShape × geoFactor
 *     quintileShape = nationalQuintile
 *     geoFactor     = geoAllCU / nationalAllCU
 *
 * `geoAllCU` is the most-specific geographic average available — MSA if
 * provided and non-zero, else division if non-zero/non-undefined, else
 * region. `msaAllCU` and `divisionAllCU` being `undefined` is the
 * expected fallback signal, not an error.
 *
 * Returns 0 when:
 *   - `nationalAllCU` is 0 (no denominator), or
 *   - `nationalQuintile` is 0 (income axis not populated for this cell), or
 *   - every geographic level (MSA, division, region) is missing or 0.
 */
export function blendCexSpending(inputs: {
  nationalAllCU: number;
  nationalQuintile: number;
  msaAllCU?: number | undefined;
  divisionAllCU: number | undefined;
  regionAllCU: number;
}): number {
  const { nationalAllCU, nationalQuintile, msaAllCU, divisionAllCU, regionAllCU } = inputs;
  if (nationalAllCU === 0) return 0;
  if (nationalQuintile === 0) return 0;
  let geoAllCU: number;
  if (msaAllCU !== undefined && msaAllCU > 0) geoAllCU = msaAllCU;
  else if (divisionAllCU !== undefined && divisionAllCU > 0) geoAllCU = divisionAllCU;
  else geoAllCU = regionAllCU;
  if (geoAllCU === 0) return 0;
  return nationalQuintile * (geoAllCU / nationalAllCU);
}

/**
 * Pick the most-specific geographic granularity that contributed to the
 * blend, given which levels were populated for this line item. Returns
 * `null` when nothing was populated (i.e. the function would have
 * returned 0).
 */
export function geoGranularityFor(inputs: {
  msaAllCU?: number | undefined;
  divisionAllCU: number | undefined;
  regionAllCU: number;
}): GeoGranularity | null {
  if (inputs.msaAllCU !== undefined && inputs.msaAllCU > 0) return 'msa';
  if (inputs.divisionAllCU !== undefined && inputs.divisionAllCU > 0) return 'division';
  if (inputs.regionAllCU > 0) return 'region';
  return null;
}

/**
 * Compute a single line item's annual spending for a (state × income
 * quintile × line item) cell. Uses division → region fallback (no MSA
 * input — see `cexLineItemSpendingForCity` for the city-aware path).
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

/**
 * City-aware variant. Resolves a curated city slug (e.g. `'nyc'`,
 * `'sf'`) into its MSA via `CITY_TO_MSA` and prefers MSA-level data over
 * division/region. Cities without an MSA mapping (rural placeholders,
 * non-MSA cities) and statewide-fallback slugs (e.g. `'ca_state'`)
 * should call `cexLineItemSpending(state, ...)` directly.
 *
 * Returns the spending plus the geographic granularity that was used —
 * useful for surfacing provenance in the UI ("from your MSA" /
 * "...division" / "...region").
 */
export function cexLineItemSpendingForCity(
  citySlug: string,
  state: StateCode,
  quintile: IncomeQuintile,
  item: BLSCEXLineItem,
): { spending: number; granularity: GeoGranularity | null } {
  const region = stateToRegion(state);
  const division = STATE_TO_DIVISION[state];
  const msa = CITY_TO_MSA[citySlug];
  const msaAllCU = msa ? MSA_ALLCU_SPENDING[msa][item] : undefined;
  const inputs = {
    nationalAllCU: NATIONAL_ALLCU_SPENDING[item],
    nationalQuintile: NATIONAL_QUINTILE_SPENDING[quintile][item],
    msaAllCU,
    divisionAllCU: DIVISION_ALLCU_SPENDING[division][item],
    regionAllCU: REGION_ALLCU_SPENDING[region][item],
  };
  const spending = blendCexSpending(inputs);
  const granularity = spending === 0 ? null : geoGranularityFor(inputs);
  return { spending, granularity };
}

/** Convenience: full per-line-item profile for a (state × income) cell. */
export function cexProfile(state: StateCode, quintile: IncomeQuintile): LineItemSpending {
  const out = {} as Record<BLSCEXLineItem, number>;
  for (const item of BLS_CEX_LINE_ITEMS) {
    out[item] = cexLineItemSpending(state, quintile, item);
  }
  return out;
}
