/**
 * Per-state residential electricity prices in cents per kWh.
 *
 * Source: EIA "Electric Power Monthly" Table 5.6.A (Average Price of
 * Electricity to Ultimate Customers by End-Use Sector), residential
 * column. Sourced from
 * https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a
 *
 * Vintage: February 2026 monthly figures, released 2026-04-23.
 *
 * EIA publishes this monthly. When refreshing, update both
 * `RESIDENTIAL_ELECTRICITY_PRICE_2026_FEB` and the `addedAt` /
 * `date` fields on the `eia-electricity-state` source in
 * `src/data/sources.ts`, and pair with a `reviewed.tsv` row.
 *
 * Currently surfaced for transparency and future per-state utility
 * scaling. The CEX-anchored utilities leaf already captures
 * regional variation (Northeast / Midwest / South / West) via
 * the 4-region geo blend; per-state data here refines within-
 * division variation but isn't yet wired as a multiplicative
 * factor on the leaf — that's a follow-up that needs careful math
 * to avoid double-counting the regional signal CEX already carries.
 */

import type { StateCode } from '@/types';
import { SOURCES } from '@/data/sources';

/**
 * Citation handle for the EIA electricity dataset, re-exported so
 * downstream UI / methodology callouts can reference the source via
 * the central registry (and so `scripts/source-inventory.mjs --check`
 * sees a real consumer reference for the entry).
 */
export const EIA_ELECTRICITY_STATE_SOURCE = SOURCES['eia-electricity-state'];

export const RESIDENTIAL_ELECTRICITY_PRICE_2026_FEB: Readonly<Record<StateCode, number>> = {
  AL: 16.18,
  AK: 25.79,
  AZ: 16.03,
  AR: 12.73,
  CA: 33.22,
  CO: 16.79,
  CT: 30.77,
  DE: 16.27,
  DC: 23.97,
  FL: 15.8,
  GA: 14.13,
  HI: 43.0,
  ID: 12.63,
  IL: 17.83,
  IN: 16.06,
  IA: 12.74,
  KS: 15.11,
  KY: 13.42,
  LA: 12.87,
  ME: 32.17,
  MD: 20.08,
  MA: 30.46,
  MI: 20.0,
  MN: 15.39,
  MS: 14.72,
  MO: 12.17,
  MT: 13.33,
  NE: 11.79,
  NV: 14.38,
  NH: 26.52,
  NJ: 23.12,
  NM: 15.07,
  NY: 29.99,
  NC: 14.64,
  ND: 11.64,
  OH: 17.52,
  OK: 12.89,
  OR: 14.64,
  PA: 20.3,
  RI: 29.45,
  SC: 16.15,
  SD: 13.24,
  TN: 12.82,
  TX: 15.41,
  UT: 13.33,
  VT: 23.27,
  VA: 15.96,
  WA: 14.11,
  WV: 14.41,
  WI: 18.74,
  WY: 13.04,
};

/**
 * National average residential electricity price for the same vintage,
 * computed as the simple (equally-weighted) mean across the 51
 * jurisdictions in the table above. Used as the denominator when
 * computing per-state factors. NOT a population- or sales-weighted
 * national average — population weights would be a small refinement,
 * but the simple mean tracks "what the average state pays" which is
 * what readers expect when reading "your state pays X% above/below
 * average."
 */
export const NATIONAL_AVG_RESIDENTIAL_ELECTRICITY_2026_FEB: number = (() => {
  const values = Object.values(RESIDENTIAL_ELECTRICITY_PRICE_2026_FEB);
  return values.reduce((s, v) => s + v, 0) / values.length;
})();

/**
 * Per-state factor: how much above (>1) or below (<1) the national
 * average a state's residential electricity price is. CA at ~1.81×
 * (33.22¢/kWh vs ~18.35¢/kWh national) means Californians pay ~81%
 * above the national average; ND at ~0.63× means North Dakotans pay
 * ~37% below.
 *
 * Useful as a relative signal for the editorial copy ("your state
 * pays X% more than average") and for any future per-state utility
 * scaling on the model side. NOT yet wired as a multiplier on the
 * Utilities leaf — that depends on the CEX division-level signal
 * already present, and stacking the two would double-count.
 */
export function eiaElectricityFactor(state: StateCode): number {
  return (
    RESIDENTIAL_ELECTRICITY_PRICE_2026_FEB[state] / NATIONAL_AVG_RESIDENTIAL_ELECTRICITY_2026_FEB
  );
}
