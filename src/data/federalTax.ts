import type { FilingStatus, Source, TaxBracket } from '@/types';
import { SOURCES } from './sources';

/** Citation for federal income-tax brackets and standard deductions (TY 2026). */
export const FEDERAL_TAX_SOURCE: Source = SOURCES['irs-rev-proc-2025-32'];

/** Citation for the Social Security wage base. */
export const SS_WAGE_BASE_SOURCE: Source = SOURCES['ssa-wage-base'];

/**
 * 2026 federal income tax brackets per IRS Rev. Proc. 2025-32 / OBBBA.
 * Each entry: [upper bound of bracket, marginal rate].
 * The last bracket uses Infinity so the iteration finishes cleanly.
 *
 * To update for a new tax year, replace the numbers below — the rest of the
 * codebase reads brackets through these constants.
 */
export const FEDERAL_BRACKETS_2026: Record<FilingStatus, readonly TaxBracket[]> = {
  single: [
    [12400, 0.1],
    [50400, 0.12],
    [105700, 0.22],
    [201775, 0.24],
    [256225, 0.32],
    [640600, 0.35],
    [Infinity, 0.37],
  ],
  married: [
    [24800, 0.1],
    [100800, 0.12],
    [211400, 0.22],
    [403550, 0.24],
    [512450, 0.32],
    [768700, 0.35],
    [Infinity, 0.37],
  ],
  head: [
    [17700, 0.1],
    [67450, 0.12],
    [105700, 0.22],
    [201775, 0.24],
    [256225, 0.32],
    [640600, 0.35],
    [Infinity, 0.37],
  ],
} as const;

/** 2026 standard deduction by filing status. */
export const STD_DEDUCTION_2026: Record<FilingStatus, number> = {
  single: 16100,
  married: 32200,
  head: 24150,
};

/** 2025 wage base used through 2026 SS adjustments; per-person cap. */
export const SS_WAGE_BASE = 181000;
