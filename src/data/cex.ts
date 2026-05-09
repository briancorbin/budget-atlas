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
 * Consumer-unit size buckets, mirroring BLS CEX Table 1400's published
 * columns (1 person / 2-person / 3-person / 4-person / 5-or-more people).
 * BLS caps the published detail at 5+; households of any size ≥5 share
 * the `p5plus` row.
 *
 * Used as the third axis in the synthetic blend (alongside region/division
 * and income quintile). A 1-person household spends roughly 55% of an
 * "average CU" on most CEX-anchored lines; a 4-person household spends
 * roughly 140%. Without size scaling the model produces a single number
 * regardless of how many people are in the household — this type is the
 * input to fixing that bias (see `SIZE_ALLCU_SPENDING` and
 * `blendCexSpending` for the implementation).
 */
export type CUSize = 'p1' | 'p2' | 'p3' | 'p4' | 'p5plus';

/**
 * Map a household's headcount (`adults + kids`) to a CEX size bucket.
 * Households ≥5 people clamp to `p5plus` (the data has no further detail).
 * Households <1 (which shouldn't occur from real input) clamp to `p1` —
 * the published table starts at 1 person and we extrapolate down rather
 * than up.
 *
 * Caveat — Table 1400 doesn't distinguish "1 adult + 2 kids" from "3
 * adults", both are 3-person CUs. That's an inherent BLS limitation
 * inherited by the size factor; the composition axis (`CompositionType`,
 * Table 1502) captures the structural difference and partly compensates
 * by feeding in alongside the size factor in the synthetic blend.
 */
export function cuSizeBucket(householdSize: number): CUSize {
  if (!Number.isFinite(householdSize)) return 'p1';
  const n = Math.max(1, Math.floor(householdSize));
  if (n <= 1) return 'p1';
  if (n === 2) return 'p2';
  if (n === 3) return 'p3';
  if (n === 4) return 'p4';
  return 'p5plus';
}

/**
 * Family-composition buckets, mirroring BLS CEX Table 1502's published
 * columns. Captures structural differences in household spending that
 * pure CU size can't (a single parent of 3 and a married couple of 4
 * are both 4-person CUs but spend very differently — Table 1502 makes
 * that visible).
 *
 *   marriedNoKids     — Married couple only (no kids in household)
 *   marriedKidsU6     — Married couple, oldest child under 6
 *   marriedKids617    — Married couple, oldest child 6 to 17
 *   marriedKids18p    — Married couple, oldest child 18 or older (adult
 *                       child still at home; relevant for roadmap #17)
 *   otherMarried      — Other married CU (multigenerational, etc.)
 *   singleParent      — One parent + at least one child <18
 *   singleOrOther     — Single person + other CU (default fallback)
 *
 * Used as the fourth axis in the synthetic blend (alongside region,
 * income quintile, and CU size).
 */
export type CompositionType =
  | 'marriedNoKids'
  | 'marriedKidsU6'
  | 'marriedKids617'
  | 'marriedKids18p'
  | 'otherMarried'
  | 'singleParent'
  | 'singleOrOther';

/**
 * Map household input shape (adults + kids count) to a CEX composition
 * bucket. We don't yet track per-child age (roadmap #3), so households
 * with kids default to `marriedKids617` for two-adult families and
 * `singleParent` for one-adult families — school-age is the broadest
 * "have kids" category by share of households. When per-child age
 * detail (#3) lands, this mapping becomes age-aware.
 */
export function compositionBucket(adults: number, kids: number): CompositionType {
  const a = Math.max(1, Math.floor(adults));
  const k = Math.max(0, Math.floor(kids));
  if (a >= 2) {
    if (k === 0) return 'marriedNoKids';
    return 'marriedKids617'; // default age band; refined when per-child #3 lands
  }
  // Single adult
  return k > 0 ? 'singleParent' : 'singleOrOther';
}

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

/**
 * Mean household income before taxes within each quintile (annual).
 * Source: BLS CEX 2024 single-year Table 1101, "Income before taxes / Mean"
 * row. These are the X-axis anchor points used to smooth the per-item
 * spending shape across income — without them, the model produces
 * artifact step functions at the four `QUINTILE_THRESHOLDS_2024`
 * boundaries because BLS publishes spending as a discrete five-bucket
 * grouping, not a continuous function of income.
 *
 * Used by `smoothNationalQuintile` to linearly interpolate between
 * adjacent quintile spending values, treating each quintile's value as
 * representative of households at that quintile's mean income. Outside
 * the [q1-mean, q5-mean] range we clamp flat — extrapolation past the
 * sample anchor points is a worse approximation than the boundary value.
 */
export const QUINTILE_MEANS_2024_BEFORE_TAX: Readonly<Record<IncomeQuintile, number>> = {
  q1: 16_658,
  q2: 42_925,
  q3: 74_474,
  q4: 121_548,
  q5: 264_510,
};

/**
 * Mean household income before taxes within each Census Bureau region
 * (annual). Source: BLS CEX 2024 single-year Table 1800 — same row as
 * the quintile means, sliced by region instead of by income.
 *
 * Used by the IncomePosition component to draw a regional-comparison
 * marker on the quintile thermometer ("the average household in your
 * region earns $X").
 */
export const REGION_MEAN_HHI_2024_BEFORE_TAX: Readonly<Record<BLSRegion, number>> = {
  Northeast: 115_770,
  Midwest: 97_104,
  South: 93_814,
  West: 120_365,
};

// ─── Line items ──────────────────────────────────────────────────────────

/**
 * The CEX-sourced cost-of-living line items the schema covers. Excludes
 * categories sourced from non-CEX sources (rent → HUD/Zillow/RentCafe,
 * childcare → Care.com / Child Care Aware, healthcare premium → KFF).
 *
 * 22 line items: 15 original BLS rows plus 7 sublines added for the
 * leaf restructure (cellularService, lifeInsurance, vehicleInsurance,
 * vehicleMaintRepair, alcohol, otherLodging, pets). The sublines are
 * NOT in MSA tables (Tables 3001–3033 only publish ~48 aggregate rows
 * per MSA), so MSA_ALLCU_SPENDING leaves them undefined and the blend
 * falls through to division for those line items — same pattern used
 * by `utilitiesElectricGas`, `utilitiesWaterPublic`, and `healthcareOOP`.
 */
export type BLSCEXLineItem =
  | 'foodAtHome'
  | 'foodAway'
  | 'alcohol'
  | 'utilitiesElectricGas'
  | 'utilitiesWaterPublic'
  | 'cellularService'
  | 'gasoline'
  | 'vehiclePurchase'
  | 'vehicleOther'
  | 'vehicleInsurance'
  | 'vehicleMaintRepair'
  | 'healthcareOOP'
  | 'apparel'
  | 'entertainment'
  | 'pets'
  | 'personalCare'
  | 'education'
  | 'householdOperations'
  | 'housekeepingSupplies'
  | 'furnishings'
  | 'otherLodging'
  | 'lifeInsurance';

export const BLS_CEX_LINE_ITEMS: readonly BLSCEXLineItem[] = [
  'foodAtHome',
  'foodAway',
  'alcohol',
  'utilitiesElectricGas',
  'utilitiesWaterPublic',
  'cellularService',
  'gasoline',
  'vehiclePurchase',
  'vehicleOther',
  'vehicleInsurance',
  'vehicleMaintRepair',
  'healthcareOOP',
  'apparel',
  'entertainment',
  'pets',
  'personalCare',
  'education',
  'householdOperations',
  'housekeepingSupplies',
  'furnishings',
  'otherLodging',
  'lifeInsurance',
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
  alcohol: 640,
  utilitiesElectricGas: 2446, // 516 + 1798 + 132
  utilitiesWaterPublic: 803,
  cellularService: 1315,
  gasoline: 2430,
  vehiclePurchase: 5437,
  vehicleOther: 4057, // = vehicleInsurance + vehicleMaintRepair + finance + rental/leases + other
  vehicleInsurance: 1884,
  vehicleMaintRepair: 980,
  healthcareOOP: 2143, // 1252 + 624 + 267
  apparel: 2021,
  entertainment: 3622,
  pets: 878, // subline of entertainment
  personalCare: 964,
  education: 1552,
  householdOperations: 1953,
  housekeepingSupplies: 848,
  furnishings: 2461,
  otherLodging: 1388, // subline of shelter (hotels, vacation rentals, etc.)
  lifeInsurance: 560, // "Life and other personal insurance" subline of "Personal insurance and pensions" — pensions explicitly NOT pulled to avoid FICA + roadmap-#4 overlap
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
 * and 2023-2024 two-year national-CU baselines are <6% on every line
 * item we consume — most <2%, with vehicleInsurance ~5.8% (auto-
 * insurance premiums rose sharply in 2024) and a handful of lines in
 * the 3–4% range (vehicleOther, housekeepingSupplies, cellularService,
 * otherLodging). The cross-vintage product is defensible at this drift.
 * The drift bound is asserted by `cex.test.ts`.
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
    alcohol: 244,
    utilitiesElectricGas: 1626, // 287 + 1276 + 63
    utilitiesWaterPublic: 474,
    cellularService: 720,
    gasoline: 1177,
    vehiclePurchase: 1718,
    vehicleOther: 1653,
    vehicleInsurance: 895,
    vehicleMaintRepair: 394,
    healthcareOOP: 1292, // 661 + 416 + 215
    apparel: 1124,
    entertainment: 1316,
    pets: 368,
    personalCare: 427,
    education: 828,
    householdOperations: 851,
    housekeepingSupplies: 513,
    furnishings: 1086,
    otherLodging: 409,
    lifeInsurance: 174,
  },
  q2: {
    foodAtHome: 4952,
    foodAway: 2448,
    alcohol: 342,
    utilitiesElectricGas: 2191, // 410 + 1674 + 107
    utilitiesWaterPublic: 670,
    cellularService: 1084,
    gasoline: 1893,
    vehiclePurchase: 2925,
    vehicleOther: 3019,
    vehicleInsurance: 1679,
    vehicleMaintRepair: 693,
    healthcareOOP: 1632, // 848 + 644 + 140
    apparel: 1328,
    entertainment: 2156,
    pets: 529,
    personalCare: 659,
    education: 407,
    householdOperations: 1128,
    housekeepingSupplies: 681,
    furnishings: 1399,
    otherLodging: 523,
    lifeInsurance: 305,
  },
  q3: {
    foodAtHome: 5820,
    foodAway: 3277,
    alcohol: 504,
    utilitiesElectricGas: 2367, // 458 + 1813 + 96
    utilitiesWaterPublic: 803,
    cellularService: 1376,
    gasoline: 2442,
    vehiclePurchase: 4121,
    vehicleOther: 4018,
    vehicleInsurance: 2028,
    vehicleMaintRepair: 950,
    healthcareOOP: 1835, // 1063 + 572 + 200
    apparel: 1642,
    entertainment: 2764,
    pets: 673,
    personalCare: 852,
    education: 749,
    householdOperations: 1511,
    housekeepingSupplies: 798,
    furnishings: 1893,
    otherLodging: 880,
    lifeInsurance: 435,
  },
  q4: {
    foodAtHome: 7162,
    foodAway: 4682,
    alcohol: 726,
    utilitiesElectricGas: 2717, // 555 + 2023 + 139
    utilitiesWaterPublic: 945,
    cellularService: 1678,
    gasoline: 3058,
    vehiclePurchase: 5945,
    vehicleOther: 5407,
    vehicleInsurance: 2518,
    vehicleMaintRepair: 1174,
    healthcareOOP: 2335, // 1384 + 700 + 251
    apparel: 2034,
    entertainment: 4133,
    pets: 967,
    personalCare: 1145,
    education: 1353,
    householdOperations: 2009,
    housekeepingSupplies: 1067,
    furnishings: 3015,
    otherLodging: 1597,
    lifeInsurance: 618,
  },
  q5: {
    foodAtHome: 9336,
    foodAway: 7652,
    alcohol: 1395,
    utilitiesElectricGas: 3347, // 751 + 2376 + 220
    utilitiesWaterPublic: 1236,
    cellularService: 1935,
    gasoline: 3477,
    vehiclePurchase: 11938,
    vehicleOther: 6916,
    vehicleInsurance: 2840,
    vehicleMaintRepair: 1707,
    healthcareOOP: 3613, // 2297 + 957 + 359
    apparel: 3872,
    entertainment: 7660,
    pets: 1861,
    personalCare: 1802,
    education: 4492,
    householdOperations: 4093,
    housekeepingSupplies: 1327,
    furnishings: 4668,
    otherLodging: 3312,
    lifeInsurance: 1339,
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
    alcohol: 817,
    utilitiesElectricGas: 2936, // 721 + 1787 + 428
    utilitiesWaterPublic: 623,
    cellularService: 1281,
    gasoline: 2099,
    vehiclePurchase: 4915,
    vehicleOther: 4156,
    vehicleInsurance: 1739,
    vehicleMaintRepair: 976,
    healthcareOOP: 2197, // 1338 + 609 + 250
    apparel: 2305,
    entertainment: 3670,
    pets: 810,
    personalCare: 1034,
    education: 2347,
    householdOperations: 2152,
    housekeepingSupplies: 941,
    furnishings: 2523,
    otherLodging: 2109,
    lifeInsurance: 611,
  },
  Midwest: {
    foodAtHome: 5931,
    foodAway: 3721,
    alcohol: 637,
    utilitiesElectricGas: 2343, // 739 + 1503 + 101
    utilitiesWaterPublic: 743,
    cellularService: 1257,
    gasoline: 2345,
    vehiclePurchase: 5410,
    vehicleOther: 3828,
    vehicleInsurance: 1573,
    vehicleMaintRepair: 1000,
    healthcareOOP: 2404, // 1388 + 701 + 315
    apparel: 1933,
    entertainment: 3912,
    pets: 999,
    personalCare: 911,
    education: 1611,
    householdOperations: 1674,
    housekeepingSupplies: 899,
    furnishings: 2440,
    otherLodging: 1241,
    lifeInsurance: 509,
  },
  South: {
    foodAtHome: 5445,
    foodAway: 3483,
    alcohol: 505,
    utilitiesElectricGas: 2369, // 307 + 2002 + 60
    utilitiesWaterPublic: 777,
    cellularService: 1304,
    gasoline: 2413,
    vehiclePurchase: 5312,
    vehicleOther: 3843,
    vehicleInsurance: 2043,
    vehicleMaintRepair: 836,
    healthcareOOP: 1842, // 1013 + 590 + 239
    apparel: 1782,
    entertainment: 3022,
    pets: 771,
    personalCare: 859,
    education: 1188,
    householdOperations: 1798,
    housekeepingSupplies: 781,
    furnishings: 2153,
    otherLodging: 991,
    lifeInsurance: 524,
  },
  West: {
    foodAtHome: 6852,
    foodAway: 4708,
    alcohol: 741,
    utilitiesElectricGas: 2301, // 517 + 1724 + 60
    utilitiesWaterPublic: 1047,
    cellularService: 1414,
    gasoline: 2797,
    vehiclePurchase: 6092,
    vehicleOther: 4575,
    vehicleInsurance: 2010,
    vehicleMaintRepair: 1218,
    healthcareOOP: 2386, // 1479 + 624 + 283
    apparel: 2301,
    entertainment: 4378,
    pets: 1007,
    personalCare: 1145,
    education: 1521,
    householdOperations: 2334,
    housekeepingSupplies: 846,
    furnishings: 2978,
    otherLodging: 1668,
    lifeInsurance: 633,
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
    alcohol: 854,
    utilitiesElectricGas: 3321, // 606 + 1948 + 767
    utilitiesWaterPublic: 580,
    cellularService: 1305,
    gasoline: 2216,
    vehiclePurchase: 6104,
    vehicleOther: 4511,
    vehicleInsurance: 1769,
    vehicleMaintRepair: 1208,
    healthcareOOP: 2541, // 1569 + 681 + 291
    apparel: 2418,
    entertainment: 3987,
    pets: 1029,
    personalCare: 975,
    education: 2755,
    householdOperations: 2541,
    housekeepingSupplies: 1117,
    furnishings: 2927,
    otherLodging: 1957,
    lifeInsurance: 639,
  },
  'Middle Atlantic': {
    foodAtHome: 6839,
    foodAway: 4231,
    alcohol: 803,
    utilitiesElectricGas: 2783, // 767 + 1723 + 293
    utilitiesWaterPublic: 640,
    cellularService: 1272,
    gasoline: 2052,
    vehiclePurchase: 4438,
    vehicleOther: 4013,
    vehicleInsurance: 1727,
    vehicleMaintRepair: 882,
    healthcareOOP: 2061, // 1245 + 582 + 234
    apparel: 2264,
    entertainment: 3548,
    pets: 726,
    personalCare: 1058,
    education: 2183,
    householdOperations: 1995,
    housekeepingSupplies: 874,
    furnishings: 2362,
    otherLodging: 2170,
    lifeInsurance: 599,
  },
  'East North Central': {
    foodAtHome: 6175,
    foodAway: 3728,
    alcohol: 627,
    utilitiesElectricGas: 2415, // 799 + 1516 + 100
    utilitiesWaterPublic: 699,
    cellularService: 1270,
    gasoline: 2348,
    vehiclePurchase: 5026,
    vehicleOther: 3781,
    vehicleInsurance: 1556,
    vehicleMaintRepair: 941,
    healthcareOOP: 2319, // 1273 + 744 + 302
    apparel: 2025,
    entertainment: 3938,
    pets: 1058,
    personalCare: 909,
    education: 1573,
    householdOperations: 1655,
    housekeepingSupplies: 925,
    furnishings: 2456,
    otherLodging: 1207,
    lifeInsurance: 466,
  },
  'West North Central': {
    foodAtHome: 5415,
    foodAway: 3706,
    alcohol: 658,
    utilitiesElectricGas: 2197, // 617 + 1477 + 103
    utilitiesWaterPublic: 832,
    cellularService: 1231,
    gasoline: 2339,
    vehiclePurchase: 6200,
    vehicleOther: 3925,
    vehicleInsurance: 1610,
    vehicleMaintRepair: 1120,
    healthcareOOP: 2580, // 1624 + 615 + 341
    apparel: 1740,
    entertainment: 3856,
    pets: 876,
    personalCare: 914,
    education: 1688,
    householdOperations: 1712,
    housekeepingSupplies: 842,
    furnishings: 2405,
    otherLodging: 1309,
    lifeInsurance: 599,
  },
  'South Atlantic': {
    foodAtHome: 5636,
    foodAway: 3563,
    alcohol: 604,
    utilitiesElectricGas: 2253, // 300 + 1884 + 69
    utilitiesWaterPublic: 736,
    cellularService: 1212,
    gasoline: 2283,
    vehiclePurchase: 5036,
    vehicleOther: 3827,
    vehicleInsurance: 1946,
    vehicleMaintRepair: 855,
    healthcareOOP: 1889, // 1043 + 578 + 268
    apparel: 1952,
    entertainment: 3194,
    pets: 783,
    personalCare: 905,
    education: 1418,
    householdOperations: 1897,
    housekeepingSupplies: 809,
    furnishings: 2278,
    otherLodging: 1219,
    lifeInsurance: 540,
  },
  'East South Central': {
    foodAtHome: 6050,
    foodAway: 2910,
    alcohol: 312,
    utilitiesElectricGas: 2324, // 295 + 1960 + 69
    utilitiesWaterPublic: 767,
    cellularService: 1201,
    gasoline: 2413,
    vehiclePurchase: 4845,
    vehicleOther: 3376,
    vehicleInsurance: 1813,
    vehicleMaintRepair: 788,
    healthcareOOP: 1737, // 862 + 654 + 221
    apparel: 1450,
    entertainment: 2474,
    pets: 710,
    personalCare: 689,
    education: 1078,
    householdOperations: 1791,
    housekeepingSupplies: 752,
    furnishings: 2033,
    otherLodging: 681,
    lifeInsurance: 543,
  },
  'West South Central': {
    foodAtHome: 4791,
    foodAway: 3634,
    alcohol: 427,
    utilitiesElectricGas: 2601, // 326 + 2236 + 39
    utilitiesWaterPublic: 854,
    cellularService: 1520,
    gasoline: 2647,
    vehiclePurchase: 6042,
    vehicleOther: 4110,
    vehicleInsurance: 2334,
    vehicleMaintRepair: 826,
    healthcareOOP: 1812, // 1036 + 579 + 197
    apparel: 1644,
    entertainment: 2993,
    pets: 782,
    personalCare: 861,
    education: 833,
    householdOperations: 1626,
    housekeepingSupplies: 746,
    furnishings: 1992,
    otherLodging: 740,
    lifeInsurance: 488,
  },
  Mountain: {
    foodAtHome: 6721,
    foodAway: 4217,
    alcohol: 533,
    utilitiesElectricGas: 2393, // 564 + 1770 + 59
    utilitiesWaterPublic: 939,
    cellularService: 1395,
    gasoline: 2623,
    vehiclePurchase: 6871,
    vehicleOther: 4854,
    vehicleInsurance: 2140,
    vehicleMaintRepair: 1331,
    healthcareOOP: 2673, // 1631 + 768 + 274
    apparel: 2353,
    entertainment: 4716,
    pets: 1063,
    personalCare: 1215,
    education: 1129,
    householdOperations: 2015,
    housekeepingSupplies: 879,
    furnishings: 3077,
    otherLodging: 1528,
    lifeInsurance: 686,
  },
  Pacific: {
    foodAtHome: 6909,
    foodAway: 4923,
    alcohol: 832,
    utilitiesElectricGas: 2258, // 495 + 1703 + 60
    utilitiesWaterPublic: 1096,
    cellularService: 1423,
    gasoline: 2877,
    vehiclePurchase: 5736,
    vehicleOther: 4447,
    vehicleInsurance: 1951,
    vehicleMaintRepair: 1166,
    healthcareOOP: 2258, // 1410 + 560 + 288
    apparel: 2278,
    entertainment: 4230,
    pets: 983,
    personalCare: 1114,
    education: 1701,
    householdOperations: 2480,
    housekeepingSupplies: 831,
    furnishings: 2933,
    otherLodging: 1731,
    lifeInsurance: 609,
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

/**
 * Per-CU-size all-CU annual spending. Carries the household-size shape
 * in the blend: `SIZE_ALLCU_SPENDING[size][item] / SIZE_BASELINE_ALLCU[item]`
 * is the size factor.
 *
 * Source: BLS CEX 2024 single-year, Table 1400 (Size of consumer unit).
 *
 * Vintage note: like `NATIONAL_QUINTILE_SPENDING`, this is 2024 single-
 * year while the geographic tables are 2023-2024 two-year averages. The
 * factor below is self-normalized within Table 1400 (numerator and
 * denominator both 2024 single-year), so the size factor stays internally
 * consistent. Combining with the 2y geo factor and the 1y quintile value
 * is the same cross-vintage product the geo blend already accepts; the
 * documented <2% national-CU drift between vintages applies.
 *
 * The Pets / Reading / Tobacco / Cash-contributions lines BLS publishes
 * in Table 1400 are intentionally not consumed (same scope as the rest
 * of `BLSCEXLineItem`).
 *
 * `householdOperations` is reassembled from "Personal services" +
 * "Other household expenses" (the two CEX sublines) — same convention
 * used elsewhere in this file for composite items.
 */
export const SIZE_ALLCU_SPENDING: Readonly<Record<CUSize, LineItemSpending>> = {
  p1: {
    foodAtHome: 3395,
    foodAway: 2249,
    alcohol: 456,
    utilitiesElectricGas: 1597, // 226 + 1320 + 51
    utilitiesWaterPublic: 532,
    cellularService: 733,
    gasoline: 1226,
    vehiclePurchase: 2490,
    vehicleOther: 2383,
    vehicleInsurance: 1160,
    vehicleMaintRepair: 619,
    healthcareOOP: 1544, // 942 + 419 + 184
    apparel: 1113,
    entertainment: 2187,
    pets: 502,
    personalCare: 619,
    education: 818,
    householdOperations: 1153, // 138 + 1015
    housekeepingSupplies: 495,
    furnishings: 1472,
    otherLodging: 722,
    lifeInsurance: 263,
  },
  p2: {
    foodAtHome: 6088,
    foodAway: 4070,
    alcohol: 842,
    utilitiesElectricGas: 2540,
    utilitiesWaterPublic: 846,
    cellularService: 1335,
    gasoline: 2329,
    vehiclePurchase: 5820,
    vehicleOther: 4282,
    vehicleInsurance: 2031,
    vehicleMaintRepair: 1036,
    healthcareOOP: 2390,
    apparel: 1994,
    entertainment: 3933,
    pets: 1021,
    personalCare: 1023,
    education: 1133,
    householdOperations: 1624, // 150 + 1474 (split per Table 1400)
    housekeepingSupplies: 971,
    furnishings: 2674,
    otherLodging: 1773,
    lifeInsurance: 647,
  },
  p3: {
    foodAtHome: 7597,
    foodAway: 4609,
    alcohol: 637,
    utilitiesElectricGas: 2843,
    utilitiesWaterPublic: 972,
    cellularService: 1669,
    gasoline: 2825,
    vehiclePurchase: 6444,
    vehicleOther: 4903,
    vehicleInsurance: 2402,
    vehicleMaintRepair: 1018,
    healthcareOOP: 2156,
    apparel: 2404,
    entertainment: 4091,
    pets: 1219,
    personalCare: 1188,
    education: 2585,
    householdOperations: 2265, // 860 + 1405
    housekeepingSupplies: 1067,
    furnishings: 2976,
    otherLodging: 1505,
    lifeInsurance: 676,
  },
  p4: {
    foodAtHome: 8697,
    foodAway: 5847,
    alcohol: 699,
    utilitiesElectricGas: 3109,
    utilitiesWaterPublic: 1040,
    cellularService: 1965,
    gasoline: 3512,
    vehiclePurchase: 8022,
    vehicleOther: 6136,
    vehicleInsurance: 2675,
    vehicleMaintRepair: 1358,
    healthcareOOP: 2765,
    apparel: 2653,
    entertainment: 4995,
    pets: 983,
    personalCare: 1347,
    education: 2668,
    householdOperations: 3523, // 1696 + 1827
    housekeepingSupplies: 1082,
    furnishings: 2971,
    otherLodging: 1647,
    lifeInsurance: 850,
  },
  p5plus: {
    foodAtHome: 10274,
    foodAway: 5331,
    alcohol: 469,
    utilitiesElectricGas: 3360,
    utilitiesWaterPublic: 1174,
    cellularService: 2146,
    gasoline: 4335,
    vehiclePurchase: 7418,
    vehicleOther: 6083,
    vehicleInsurance: 2959,
    vehicleMaintRepair: 1412,
    healthcareOOP: 2345,
    apparel: 3358,
    entertainment: 4416,
    pets: 923,
    personalCare: 1144,
    education: 2458,
    householdOperations: 2758, // 1239 + 1519
    housekeepingSupplies: 1197,
    furnishings: 2884,
    otherLodging: 1206,
    lifeInsurance: 797,
  },
};

/**
 * Table 1400's "All consumer units" column — the denominator for the
 * size factor. Kept within the same table as `SIZE_ALLCU_SPENDING` so
 * the per-leaf factor (sizeAllCU[size]/sizeBaseline) self-normalizes;
 * see the vintage note on `SIZE_ALLCU_SPENDING`.
 *
 * Differs from `NATIONAL_ALLCU_SPENDING` by <6% on every line. Most
 * lines are <2%; the wider gaps reflect real economic drift between
 * the 2-year average baseline and the 2024 single-year cell:
 *   - vehicleInsurance ~5.8% (auto-insurance premiums rose sharply in
 *     2024 — well-documented)
 *   - vehicleOther ~3.7%, housekeepingSupplies ~3.4%, cellularService
 *     ~3.3%, otherLodging ~3.0%
 * The cross-vintage drift bound is asserted by `cex.test.ts`.
 */
/**
 * Per-family-composition all-CU annual spending. Carries the structural
 * shape in the blend: `COMPOSITION_ALLCU_SPENDING[comp][item] /
 * COMPOSITION_BASELINE_ALLCU[item]` is the composition factor.
 *
 * Source: BLS CEX 2024 single-year, Table 1502 (Composition of consumer
 * unit). Same vintage as `SIZE_ALLCU_SPENDING`; both are 2024 single-
 * year and self-normalize within their tables.
 *
 * Note: `marriedKidsU6` shows a high `householdOperations` value (driven
 * by Personal Services — childcare). The composition axis captures this
 * naturally; it's a real signal that our childcare leaf (Care.com) is
 * already modeling, but the elevated householdOperations spending in
 * 1502 carries it over diffuse Household Operations spending too.
 *
 * Honesty caveat (independence assumption): like the size factor, this
 * is a single-axis cross-tab from BLS — the synthetic blend treats
 * composition as independent of income quintile and geography. Real
 * distributions correlate (married-with-kids skews q3-q4 because of
 * peak earning years; single-parent skews lower-quintile). PUMD would
 * resolve this; the blend is the published-table approximation.
 */
export const COMPOSITION_ALLCU_SPENDING: Readonly<Record<CompositionType, LineItemSpending>> = {
  marriedNoKids: {
    foodAtHome: 6514,
    foodAway: 4469,
    alcohol: 998,
    utilitiesElectricGas: 2691,
    utilitiesWaterPublic: 952,
    cellularService: 1394,
    gasoline: 2460,
    vehiclePurchase: 6445,
    vehicleOther: 4528,
    vehicleInsurance: 2065,
    vehicleMaintRepair: 1123,
    healthcareOOP: 2906,
    apparel: 2154,
    entertainment: 4537,
    pets: 1184,
    personalCare: 1132,
    education: 1288,
    householdOperations: 1799,
    housekeepingSupplies: 1072,
    furnishings: 3070,
    otherLodging: 2326,
    lifeInsurance: 828,
  },
  marriedKidsU6: {
    foodAtHome: 8317,
    foodAway: 5139,
    alcohol: 742,
    utilitiesElectricGas: 2727,
    utilitiesWaterPublic: 958,
    cellularService: 1363,
    gasoline: 2620,
    vehiclePurchase: 6810,
    vehicleOther: 5118,
    vehicleInsurance: 2060,
    vehicleMaintRepair: 869,
    healthcareOOP: 2380,
    apparel: 3356,
    entertainment: 4200,
    pets: 608,
    personalCare: 1157,
    education: 1276,
    householdOperations: 7151, // childcare signal — Personal Services dominates
    housekeepingSupplies: 1270,
    furnishings: 3046,
    otherLodging: 1099,
    lifeInsurance: 575,
  },
  marriedKids617: {
    foodAtHome: 9582,
    foodAway: 6177,
    alcohol: 767,
    utilitiesElectricGas: 3165,
    utilitiesWaterPublic: 1107,
    cellularService: 1902,
    gasoline: 3624,
    vehiclePurchase: 8506,
    vehicleOther: 5742,
    vehicleInsurance: 2458,
    vehicleMaintRepair: 1326,
    healthcareOOP: 2650,
    apparel: 3263,
    entertainment: 6542,
    pets: 1681,
    personalCare: 1387,
    education: 3484,
    householdOperations: 3372,
    housekeepingSupplies: 1114,
    furnishings: 3176,
    otherLodging: 1906,
    lifeInsurance: 1132,
  },
  marriedKids18p: {
    foodAtHome: 9169,
    foodAway: 6098,
    alcohol: 726,
    utilitiesElectricGas: 3155,
    utilitiesWaterPublic: 1214,
    cellularService: 2230,
    gasoline: 4175,
    vehiclePurchase: 8268,
    vehicleOther: 7231,
    vehicleInsurance: 3446,
    vehicleMaintRepair: 1618,
    healthcareOOP: 3275,
    apparel: 2803,
    entertainment: 4350,
    pets: 1174,
    personalCare: 1452,
    education: 3680,
    householdOperations: 1906,
    housekeepingSupplies: 1287,
    furnishings: 3540,
    otherLodging: 1891,
    lifeInsurance: 784,
  },
  otherMarried: {
    foodAtHome: 9704,
    foodAway: 5103,
    alcohol: 514,
    utilitiesElectricGas: 3323,
    utilitiesWaterPublic: 1163,
    cellularService: 2200,
    gasoline: 3932,
    vehiclePurchase: 6130,
    vehicleOther: 6166,
    vehicleInsurance: 3011,
    vehicleMaintRepair: 1400,
    healthcareOOP: 2553,
    apparel: 2534,
    entertainment: 4076,
    pets: 873,
    personalCare: 1177,
    education: 2426,
    householdOperations: 2123,
    housekeepingSupplies: 1240,
    furnishings: 3000,
    otherLodging: 1481,
    lifeInsurance: 989,
  },
  singleParent: {
    foodAtHome: 5666,
    foodAway: 3529,
    alcohol: 391,
    utilitiesElectricGas: 2401,
    utilitiesWaterPublic: 669,
    cellularService: 1337,
    gasoline: 2038,
    vehiclePurchase: 4940,
    vehicleOther: 3233,
    vehicleInsurance: 1631,
    vehicleMaintRepair: 826,
    healthcareOOP: 1157,
    apparel: 1976,
    entertainment: 2125,
    pets: 356,
    personalCare: 923,
    education: 1343,
    householdOperations: 1872,
    housekeepingSupplies: 588,
    furnishings: 1783,
    otherLodging: 819,
    lifeInsurance: 260,
  },
  singleOrOther: {
    foodAtHome: 4320,
    foodAway: 2622,
    alcohol: 452,
    utilitiesElectricGas: 1970,
    utilitiesWaterPublic: 616,
    cellularService: 1004,
    gasoline: 1706,
    vehiclePurchase: 3473,
    vehicleOther: 3060,
    vehicleInsurance: 1554,
    vehicleMaintRepair: 725,
    healthcareOOP: 1524,
    apparel: 1319,
    entertainment: 2417,
    pets: 566,
    personalCare: 700,
    education: 872,
    householdOperations: 1252,
    housekeepingSupplies: 614,
    furnishings: 1696,
    otherLodging: 736,
    lifeInsurance: 291,
  },
};

export const SIZE_BASELINE_ALLCU: LineItemSpending = {
  foodAtHome: 6224,
  foodAway: 3945,
  alcohol: 643,
  utilitiesElectricGas: 2451,
  utilitiesWaterPublic: 826,
  cellularService: 1359,
  gasoline: 2411,
  vehiclePurchase: 5337,
  vehicleOther: 4206,
  vehicleInsurance: 1993,
  vehicleMaintRepair: 984,
  healthcareOOP: 2143, // matches NATIONAL_ALLCU within rounding
  apparel: 2001,
  entertainment: 3609,
  pets: 880,
  personalCare: 978,
  education: 1569,
  householdOperations: 1921,
  housekeepingSupplies: 877,
  furnishings: 2414,
  otherLodging: 1347,
  lifeInsurance: 575,
};

/**
 * Table 1502's "All consumer units" column — the denominator for the
 * composition factor. By construction this is the *same* population
 * aggregate as Table 1400's All-CU column (both are 2024 single-year,
 * both report the same national CEX universe before partitioning).
 * Aliased to `SIZE_BASELINE_ALLCU` to make that identity explicit and
 * to avoid the maintenance hazard of two value-for-value duplicates
 * drifting on a future BLS vintage refresh.
 */
export const COMPOSITION_BASELINE_ALLCU = SIZE_BASELINE_ALLCU;

// ─── The synthetic blend ─────────────────────────────────────────────────

/**
 * Granularity at which the geo factor was computed for a particular
 * lookup. Useful for surfacing "this came from your MSA / division /
 * region" provenance in the UI.
 */
export type GeoGranularity = 'msa' | 'division' | 'region';

/**
 * Smoothly interpolate a per-line-item national spending value across
 * income, using the published BLS quintile means as anchor points (see
 * `QUINTILE_MEANS_2024_BEFORE_TAX`). Returns the `nationalQuintile`-
 * equivalent value to feed into `blendCexSpending`, but as a continuous
 * function of income rather than a five-step ladder.
 *
 *   - `grossIncome <= q1-mean` → q1 value (clamp).
 *   - `grossIncome >= q5-mean` → q5 value (clamp).
 *   - between adjacent means → linear interpolation.
 *
 * BLS publishes spending as a discrete grouping into 5 income buckets;
 * the steps in that data are a reporting artifact, not a real economic
 * discontinuity. The underlying population is continuous, so a smoothed
 * value at any given income is a better point estimate than snapping to
 * the bucket mean.
 *
 * Returns 0 if every quintile value is 0 (line item has no signal yet).
 */
export function smoothNationalQuintile(
  grossIncome: number,
  perQuintile: Readonly<Record<IncomeQuintile, number>>,
): number {
  const means = QUINTILE_MEANS_2024_BEFORE_TAX;
  const order: readonly IncomeQuintile[] = ['q1', 'q2', 'q3', 'q4', 'q5'];
  const x = Math.max(0, grossIncome);
  if (x <= means.q1) return perQuintile.q1;
  if (x >= means.q5) return perQuintile.q5;
  for (let i = 0; i < order.length - 1; i++) {
    const lo = order[i]!;
    const hi = order[i + 1]!;
    const xLo = means[lo];
    const xHi = means[hi];
    if (x >= xLo && x <= xHi) {
      const t = (x - xLo) / (xHi - xLo);
      return perQuintile[lo] + t * (perQuintile[hi] - perQuintile[lo]);
    }
  }
  // Unreachable given the clamps above, but keep TS happy.
  return perQuintile.q5;
}

/**
 * Pure helper for the blend math. Takes the data inputs explicitly so it
 * can be tested without wiring through module-level constants. The public
 * `cexLineItemSpending` and `cexLineItemSpendingForCity` below are the
 * thin shims that pull the constants.
 *
 *     spending = quintileShape × geoFactor × sizeFactor × compFactor
 *     quintileShape = nationalQuintile
 *     geoFactor     = geoAllCU / nationalAllCU
 *     sizeFactor    = sizeAllCU / sizeBaselineAllCU      (issue #128)
 *     compFactor    = compositionAllCU / compositionBaselineAllCU  (#207)
 *
 * `geoAllCU` is the most-specific geographic average available — MSA if
 * provided and non-zero, else division if non-zero/non-undefined, else
 * region. `msaAllCU` and `divisionAllCU` being `undefined` is the
 * expected fallback signal, not an error.
 *
 * The size and composition factors are opt-in: callers omit the
 * respective inputs when they want the legacy behavior. A single parent
 * of 3 and a married-with-kids family of 3 are both 3-person CUs by
 * size, but the composition factor captures the structural spending
 * difference between them.
 *
 * Honesty caveat: every axis is treated as independent of every other
 * (synthetic-blend independence assumption). Documented per-leaf in
 * `EXPENSE_SOURCE` and at the top of `MethodologyNote`.
 *
 * Returns 0 when:
 *   - `nationalAllCU` is 0 (no denominator), or
 *   - `nationalQuintile` is 0 (income axis not populated for this cell), or
 *   - every geographic level (MSA, division, region) is missing or 0, or
 *   - any opt-in factor was requested with a zero baseline (no denom).
 */
export function blendCexSpending(inputs: {
  nationalAllCU: number;
  nationalQuintile: number;
  msaAllCU?: number | undefined;
  divisionAllCU: number | undefined;
  regionAllCU: number;
  sizeAllCU?: number | undefined;
  sizeBaselineAllCU?: number | undefined;
  compositionAllCU?: number | undefined;
  compositionBaselineAllCU?: number | undefined;
}): number {
  const {
    nationalAllCU,
    nationalQuintile,
    msaAllCU,
    divisionAllCU,
    regionAllCU,
    sizeAllCU,
    sizeBaselineAllCU,
    compositionAllCU,
    compositionBaselineAllCU,
  } = inputs;
  if (nationalAllCU === 0) return 0;
  if (nationalQuintile === 0) return 0;
  let geoAllCU: number;
  if (msaAllCU !== undefined && msaAllCU > 0) geoAllCU = msaAllCU;
  else if (divisionAllCU !== undefined && divisionAllCU > 0) geoAllCU = divisionAllCU;
  else geoAllCU = regionAllCU;
  if (geoAllCU === 0) return 0;
  let result = nationalQuintile * (geoAllCU / nationalAllCU);
  // Size factor is opt-in. Pre-#128 callers (or callers covering exempt
  // leaves like rent/premium/childcare) skip it by omitting the size
  // inputs.
  if (sizeAllCU !== undefined && sizeBaselineAllCU !== undefined) {
    if (sizeBaselineAllCU === 0) return 0;
    result = result * (sizeAllCU / sizeBaselineAllCU);
  }
  // Composition factor is opt-in (#207). Captures structural spending
  // differences (single parent vs married-with-kids of same size, etc.).
  if (compositionAllCU !== undefined && compositionBaselineAllCU !== undefined) {
    if (compositionBaselineAllCU === 0) return 0;
    result = result * (compositionAllCU / compositionBaselineAllCU);
  }
  return result;
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
 * Per-line-item quintile vector, precomputed once at module init.
 * `computeBudget` runs in tight sweeps (the cliff curve takes ~50 income
 * samples × ~15 line items each), so allocating a fresh `{q1..q5}`
 * object per lookup would create avoidable GC churn. Built once here
 * and reused by every call into `smoothNationalQuintile`.
 */
const QUINTILE_VECTORS: Readonly<Record<BLSCEXLineItem, Readonly<Record<IncomeQuintile, number>>>> =
  (() => {
    const out = {} as Record<BLSCEXLineItem, Record<IncomeQuintile, number>>;
    for (const item of BLS_CEX_LINE_ITEMS) {
      out[item] = {
        q1: NATIONAL_QUINTILE_SPENDING.q1[item],
        q2: NATIONAL_QUINTILE_SPENDING.q2[item],
        q3: NATIONAL_QUINTILE_SPENDING.q3[item],
        q4: NATIONAL_QUINTILE_SPENDING.q4[item],
        q5: NATIONAL_QUINTILE_SPENDING.q5[item],
      };
    }
    return out;
  })();

/**
 * Compute a single line item's annual spending for a (state × income ×
 * line item) cell. Uses division → region fallback (no MSA input — see
 * `cexLineItemSpendingForCity` for the city-aware path).
 *
 * The income axis is *smoothed*: the published BLS quintile values are
 * treated as anchor points at each quintile's mean income, with linear
 * interpolation between them. See `smoothNationalQuintile` for why.
 *
 * Returns 0 when source data is unpopulated. The caller should treat 0
 * as "no signal yet" and fall back to the rolled-up legacy field rather
 * than displaying a zero-dollar line item.
 */
export function cexLineItemSpending(
  state: StateCode,
  grossIncome: number,
  item: BLSCEXLineItem,
  cuSize?: CUSize,
  composition?: CompositionType,
): number {
  const region = stateToRegion(state);
  const division = STATE_TO_DIVISION[state];
  return blendCexSpending({
    nationalAllCU: NATIONAL_ALLCU_SPENDING[item],
    nationalQuintile: smoothNationalQuintile(grossIncome, QUINTILE_VECTORS[item]),
    divisionAllCU: DIVISION_ALLCU_SPENDING[division][item],
    regionAllCU: REGION_ALLCU_SPENDING[region][item],
    sizeAllCU: cuSize ? SIZE_ALLCU_SPENDING[cuSize][item] : undefined,
    sizeBaselineAllCU: cuSize ? SIZE_BASELINE_ALLCU[item] : undefined,
    compositionAllCU: composition ? COMPOSITION_ALLCU_SPENDING[composition][item] : undefined,
    compositionBaselineAllCU: composition ? COMPOSITION_BASELINE_ALLCU[item] : undefined,
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
  grossIncome: number,
  item: BLSCEXLineItem,
  cuSize?: CUSize,
  composition?: CompositionType,
): { spending: number; granularity: GeoGranularity | null } {
  const region = stateToRegion(state);
  const division = STATE_TO_DIVISION[state];
  const msa = CITY_TO_MSA[citySlug];
  const msaAllCU = msa ? MSA_ALLCU_SPENDING[msa][item] : undefined;
  const inputs = {
    nationalAllCU: NATIONAL_ALLCU_SPENDING[item],
    nationalQuintile: smoothNationalQuintile(grossIncome, QUINTILE_VECTORS[item]),
    msaAllCU,
    divisionAllCU: DIVISION_ALLCU_SPENDING[division][item],
    regionAllCU: REGION_ALLCU_SPENDING[region][item],
    sizeAllCU: cuSize ? SIZE_ALLCU_SPENDING[cuSize][item] : undefined,
    sizeBaselineAllCU: cuSize ? SIZE_BASELINE_ALLCU[item] : undefined,
    compositionAllCU: composition ? COMPOSITION_ALLCU_SPENDING[composition][item] : undefined,
    compositionBaselineAllCU: composition ? COMPOSITION_BASELINE_ALLCU[item] : undefined,
  };
  const spending = blendCexSpending(inputs);
  const granularity = spending === 0 ? null : geoGranularityFor(inputs);
  return { spending, granularity };
}

/**
 * Per-step trace of the synthetic-blend computation for a single CEX
 * line item. Used by the detail-view tooltip so the user can see how
 * each axis multiplies into the final baseline value.
 *
 * Mirrors `blendCexSpending`'s formula step-by-step:
 *   nationalQuintile
 *   × geoFactor    (geoAllCU / nationalAllCU)
 *   × sizeFactor   (sizeAllCU / sizeBaselineAllCU)
 *   × compFactor   (compAllCU / compBaselineAllCU)
 *   = finalAnnual
 *
 * `geoAllCU` resolves through MSA → division → region in the same way
 * the production blend does; `geoCut` records which level fired.
 */
export interface BlendTrace {
  /** National per-quintile spending, smoothed at the user's income. */
  nationalQuintile: number;
  /** All-CU national value (denominator for geoFactor). */
  nationalAllCU: number;
  /** All-CU value at the most-specific geo level available. */
  geoAllCU: number;
  /** Which geo level the blend resolved to. */
  geoCut: GeoGranularity | null;
  geoFactor: number;
  sizeAllCU: number;
  sizeBaselineAllCU: number;
  sizeFactor: number;
  compositionAllCU: number;
  compositionBaselineAllCU: number;
  compositionFactor: number;
  /** Final annual spending — the product of nationalQuintile × every factor. */
  finalAnnual: number;
}

/**
 * Step-by-step trace of the blend computation for a single CEX line
 * item. Surfaces every intermediate value so the UI can render a
 * "BLS baseline = $X × Y × Z = $W" breakdown without re-implementing
 * the math in the view layer.
 *
 * Returns `null` when any required denominator is 0 — same condition
 * `blendCexSpending` uses to return 0.
 */
export function blendCexSpendingTrace(
  citySlug: string,
  state: StateCode,
  grossIncome: number,
  item: BLSCEXLineItem,
  cuSize: CUSize,
  composition: CompositionType,
): BlendTrace | null {
  const region = stateToRegion(state);
  const division = STATE_TO_DIVISION[state];
  const msa = CITY_TO_MSA[citySlug];
  const msaAllCU = msa ? MSA_ALLCU_SPENDING[msa][item] : undefined;
  const divisionAllCU = DIVISION_ALLCU_SPENDING[division][item];
  const regionAllCU = REGION_ALLCU_SPENDING[region][item];

  const nationalAllCU = NATIONAL_ALLCU_SPENDING[item];
  const nationalQuintile = smoothNationalQuintile(grossIncome, QUINTILE_VECTORS[item]);
  if (nationalAllCU === 0) return null;
  if (nationalQuintile === 0) return null;

  let geoAllCU: number;
  let geoCut: GeoGranularity | null;
  if (msaAllCU !== undefined && msaAllCU > 0) {
    geoAllCU = msaAllCU;
    geoCut = 'msa';
  } else if (divisionAllCU !== undefined && divisionAllCU > 0) {
    geoAllCU = divisionAllCU;
    geoCut = 'division';
  } else if (regionAllCU > 0) {
    geoAllCU = regionAllCU;
    geoCut = 'region';
  } else {
    return null;
  }
  const geoFactor = geoAllCU / nationalAllCU;

  const sizeAllCU = SIZE_ALLCU_SPENDING[cuSize][item];
  const sizeBaselineAllCU = SIZE_BASELINE_ALLCU[item];
  if (sizeBaselineAllCU === 0) return null;
  const sizeFactor = sizeAllCU / sizeBaselineAllCU;

  const compositionAllCU = COMPOSITION_ALLCU_SPENDING[composition][item];
  const compositionBaselineAllCU = COMPOSITION_BASELINE_ALLCU[item];
  if (compositionBaselineAllCU === 0) return null;
  const compositionFactor = compositionAllCU / compositionBaselineAllCU;

  const finalAnnual = nationalQuintile * geoFactor * sizeFactor * compositionFactor;

  return {
    nationalQuintile,
    nationalAllCU,
    geoAllCU,
    geoCut,
    geoFactor,
    sizeAllCU,
    sizeBaselineAllCU,
    sizeFactor,
    compositionAllCU,
    compositionBaselineAllCU,
    compositionFactor,
    finalAnnual,
  };
}

/**
 * Convenience: full per-line-item profile for a (state × income × size)
 * cell. `cuSize` is optional — omit for "average CU" behavior, supply
 * for size-scaled output.
 */
export function cexProfile(
  state: StateCode,
  grossIncome: number,
  cuSize?: CUSize,
): LineItemSpending {
  const out = {} as Record<BLSCEXLineItem, number>;
  for (const item of BLS_CEX_LINE_ITEMS) {
    out[item] = cexLineItemSpending(state, grossIncome, item, cuSize);
  }
  return out;
}
