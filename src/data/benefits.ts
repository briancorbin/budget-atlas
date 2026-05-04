import type { Source, StateCode } from '@/types';
import { SOURCES, STATE_SNAP_AGENCY, STATE_MEDICAID_AGENCY, STATE_CHIP_AGENCY } from './sources';

/**
 * Benefit-program data. Each program here will eventually have:
 *   - a max benefit / formula reference
 *   - an authoritative source link
 *   - any program-specific lookup tables (e.g. state Medicaid expansion)
 *
 * Adding a new program: add data + source here, then implement eligibility
 * and benefit-amount math in `lib/benefits.ts`, then surface in the
 * Benefits panel.
 */

// ── SNAP ────────────────────────────────────────────────────────────────

/**
 * SNAP maximum monthly benefit by household size, FY2026 (Oct 2025 – Sep 2026).
 * Set annually by USDA based on the Thrifty Food Plan.
 */
export const SNAP_MAX_BENEFIT_2026: Readonly<Record<number, number>> = {
  1: 298,
  2: 546,
  3: 785,
  4: 994,
  5: 1183,
  6: 1421,
  7: 1571,
  8: 1789,
};

/** Each additional household member beyond 8. */
export const SNAP_MAX_PER_ADDITIONAL_2026 = 218;

/**
 * SNAP gross income limit, expressed as a multiple of FPL. The federal
 * statutory floor is 130%. Most states have adopted Broad-Based
 * Categorical Eligibility (BBCE) which raises the threshold (typically
 * to 165%, 185%, or 200% of FPL). The map below records each state's
 * effective gross-income limit; states not listed default to the 130%
 * federal floor.
 *
 * Values are pulled from CBPP's BBCE tracking and USDA state policy
 * tables, current as of 2024–2025. Thresholds change occasionally as
 * states adopt or repeal BBCE — verify before relying on this for any
 * non-editorial purpose.
 */
export const SNAP_GROSS_INCOME_LIMIT_FPL_FEDERAL = 1.3;

export const SNAP_BBCE_BY_STATE: Partial<Record<StateCode, number>> = {
  // 200% FPL — most common BBCE expansion
  AK: 2.0,
  CA: 2.0,
  CO: 2.0,
  CT: 2.0,
  DC: 2.0,
  DE: 2.0,
  GA: 2.0,
  HI: 2.0,
  IA: 2.0,
  KY: 2.0,
  MA: 2.0,
  MD: 2.0,
  MI: 2.0,
  MT: 2.0,
  NV: 2.0,
  NJ: 2.0,
  NM: 2.0,
  NY: 2.0,
  NC: 2.0,
  ND: 2.0,
  OK: 2.0,
  OR: 2.0,
  PA: 2.0,
  RI: 2.0,
  VT: 2.0,
  VA: 2.0,
  WA: 2.0,
  WV: 2.0,
  WI: 2.0,
  // 185% FPL
  FL: 1.85,
  ME: 1.85,
  NH: 1.85,
  OH: 1.85,
  // 165% FPL
  AZ: 1.65,
  IL: 1.65,
  MN: 1.65,
  NE: 1.65,
  TX: 1.65,
  // States not listed (AL, AR, ID, IN, KS, LA, MO, MS, SC, SD, TN, UT, WY)
  // use the 130% federal floor with no BBCE expansion.
};

/** Effective SNAP gross-income limit for a given state. */
export function snapIncomeLimitFpl(state: StateCode): number {
  return SNAP_BBCE_BY_STATE[state] ?? SNAP_GROSS_INCOME_LIMIT_FPL_FEDERAL;
}

/**
 * Standard deduction in the SNAP net-income calculation, FY2026, applied
 * to households of 1–3. (Households of 4+ get slightly more; we round.)
 * The earned income deduction (20% of earned income) is also applied.
 */
export const SNAP_STD_DEDUCTION_2026 = 209;

export const SNAP_SOURCE: Source = SOURCES['usda-snap-eligibility'];

export const SNAP_BBCE_SOURCE: Source = SOURCES['cbpp-snap-bbce'];

/** State SNAP agency citation for a given state. */
export function snapStateSource(state: StateCode): Source {
  return STATE_SNAP_AGENCY[state];
}

// ── Medicaid ────────────────────────────────────────────────────────────

/**
 * Per-state Medicaid policy. ACA expansion adopters cover all adults up to
 * 138% FPL. Non-expansion states cover parents up to a much lower threshold
 * and offer no Medicaid pathway for childless adults — the "coverage gap"
 * affects an estimated 1.5M Americans.
 *
 * Non-expansion parent limits are approximate FY2024–25 figures and shift
 * occasionally; verify before relying on them.
 */
export interface StateMedicaidPolicy {
  expanded: boolean;
  /** % FPL parent threshold in non-expansion states. Childless adults
   *  remain ineligible regardless of income. */
  nonExpansionParentLimit?: number;
}

export const STATE_MEDICAID_POLICY: Record<StateCode, StateMedicaidPolicy> = {
  // Expansion states (40 + DC)
  AK: { expanded: true },
  AZ: { expanded: true },
  AR: { expanded: true },
  CA: { expanded: true },
  CO: { expanded: true },
  CT: { expanded: true },
  DE: { expanded: true },
  DC: { expanded: true },
  HI: { expanded: true },
  ID: { expanded: true },
  IL: { expanded: true },
  IN: { expanded: true },
  IA: { expanded: true },
  KY: { expanded: true },
  LA: { expanded: true },
  ME: { expanded: true },
  MD: { expanded: true },
  MA: { expanded: true },
  MI: { expanded: true },
  MN: { expanded: true },
  MO: { expanded: true },
  MT: { expanded: true },
  NE: { expanded: true },
  NV: { expanded: true },
  NH: { expanded: true },
  NJ: { expanded: true },
  NM: { expanded: true },
  NY: { expanded: true },
  NC: { expanded: true },
  ND: { expanded: true },
  OH: { expanded: true },
  OK: { expanded: true },
  OR: { expanded: true },
  PA: { expanded: true },
  RI: { expanded: true },
  SD: { expanded: true },
  UT: { expanded: true },
  VT: { expanded: true },
  VA: { expanded: true },
  WA: { expanded: true },
  WV: { expanded: true },
  // Non-expansion states (10) — parent limits as % FPL, approximate
  AL: { expanded: false, nonExpansionParentLimit: 0.18 },
  FL: { expanded: false, nonExpansionParentLimit: 0.3 },
  GA: { expanded: false, nonExpansionParentLimit: 0.36 },
  KS: { expanded: false, nonExpansionParentLimit: 0.38 },
  MS: { expanded: false, nonExpansionParentLimit: 0.27 },
  SC: { expanded: false, nonExpansionParentLimit: 0.67 },
  TN: { expanded: false, nonExpansionParentLimit: 0.95 },
  TX: { expanded: false, nonExpansionParentLimit: 0.17 },
  WI: { expanded: false, nonExpansionParentLimit: 1.0 },
  WY: { expanded: false, nonExpansionParentLimit: 0.58 },
};

/** Federal Medicaid expansion is 138% FPL (133% + 5% disregard). */
export const MEDICAID_EXPANSION_LIMIT_FPL = 1.38;

export const MEDICAID_SOURCE: Source = SOURCES['medicaid-gov'];

export const MEDICAID_EXPANSION_SOURCE: Source = SOURCES['kff-medicaid-expansion'];

// ── CHIP ────────────────────────────────────────────────────────────────

/**
 * CHIP income limit (% FPL) for children in each state. Each state sets
 * its own threshold, typically 200%–400% FPL. CHIP fills the gap above
 * Medicaid for children — a family that's over Medicaid for adults can
 * often still get the kids covered through CHIP. Approximate FY2024
 * values; some states have separate tiers and pregnancy-specific limits
 * not captured here.
 */
export const STATE_CHIP_LIMIT_FPL: Record<StateCode, number> = {
  AL: 3.17,
  AK: 2.08,
  AZ: 2.05,
  AR: 2.16,
  CA: 2.66,
  CO: 2.65,
  CT: 3.23,
  DE: 2.17,
  DC: 3.24,
  FL: 2.1,
  GA: 2.55,
  HI: 3.13,
  ID: 1.85,
  IL: 3.18,
  IN: 2.55,
  IA: 3.07,
  KS: 2.5,
  KY: 2.18,
  LA: 2.55,
  ME: 2.13,
  MD: 3.22,
  MA: 3.05,
  MI: 2.17,
  MN: 2.88,
  MS: 2.14,
  MO: 3.05,
  MT: 2.66,
  NE: 2.18,
  NV: 2.05,
  NH: 3.23,
  NJ: 3.55,
  NM: 3.05,
  NY: 4.05,
  NC: 2.16,
  ND: 1.75,
  OH: 2.11,
  OK: 2.1,
  OR: 3.05,
  PA: 3.19,
  RI: 2.66,
  SC: 2.13,
  SD: 2.09,
  TN: 2.55,
  TX: 2.06,
  UT: 2.05,
  VT: 3.17,
  VA: 2.05,
  WA: 3.17,
  WV: 3.05,
  WI: 3.06,
  WY: 2.0,
};

export const CHIP_SOURCE: Source = SOURCES['insurekidsnow'];

export const CHIP_STATE_THRESHOLDS_SOURCE: Source = SOURCES['medicaid-gov-chip-eligibility'];

export function medicaidStateSource(state: StateCode): Source {
  return STATE_MEDICAID_AGENCY[state];
}

export function chipStateSource(state: StateCode): Source {
  return STATE_CHIP_AGENCY[state];
}
