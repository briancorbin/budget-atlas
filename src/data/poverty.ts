import type { Source } from '@/types';
import { SOURCES } from './sources';

/**
 * 2025 HHS Poverty Guidelines (48 contiguous states + DC). 2026 figures
 * publish in late January 2026; we'll update at that point. AK and HI use
 * separate higher schedules — not modeled here.
 *
 * The federal government uses these as the basis for most safety-net
 * eligibility (SNAP, Medicaid, CHIP, ACA premium credits, etc.). Each
 * program is then expressed as a multiple of these — e.g. SNAP is 130%
 * of the figure here, Medicaid expansion is 138%.
 */

/** Annual gross income at 100% of FPL by household size (2025). */
const FPL_2025: Readonly<Record<number, number>> = {
  1: 15650,
  2: 21150,
  3: 26650,
  4: 32150,
  5: 37650,
  6: 43150,
  7: 48650,
  8: 54150,
};

/** Each additional person beyond 8 (2025). */
const FPL_PER_ADDITIONAL_2025 = 5500;

/** 100% of FPL for the given household size (annual gross income). */
export function fpl(householdSize: number): number {
  if (householdSize <= 0) return FPL_2025[1];
  if (householdSize <= 8) return FPL_2025[householdSize];
  return FPL_2025[8] + (householdSize - 8) * FPL_PER_ADDITIONAL_2025;
}

/** Multiple of FPL — e.g. fplPct(income, hh) === 1.30 means 130% of FPL. */
export function fplPct(grossIncome: number, householdSize: number): number {
  const base = fpl(householdSize);
  if (base <= 0) return 0;
  return grossIncome / base;
}

export const POVERTY_SOURCE: Source = SOURCES['hhs-poverty-guidelines'];
