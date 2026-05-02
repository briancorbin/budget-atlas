import type { FilingStatus, TaxBracket } from '@/types';
import { SS_WAGE_BASE } from '@/data/federalTax';

/**
 * Apply progressive tax brackets to a taxable amount.
 * Each bracket is [upperBound, marginalRate]. The final bracket should use
 * Infinity as its upper bound.
 */
export function progressiveTax(taxable: number, brackets: readonly TaxBracket[]): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of brackets) {
    if (taxable <= cap) {
      tax += (taxable - prev) * rate;
      return tax;
    }
    tax += (cap - prev) * rate;
    prev = cap;
  }
  return tax;
}

/** One row of a bracket walkthrough — what's taxed in this bracket and how much. */
export interface BracketRow {
  from: number;
  to: number; // Infinity for the top bracket
  rate: number;
  taxableInRow: number; // dollars of taxable income that fall inside this bracket
  taxFromRow: number; // tax contributed by this bracket
  /** True if the filer's last taxable dollar lands in this bracket. */
  isUserBracket: boolean;
}

/**
 * Walk the brackets and report per-row detail. Sum of `taxFromRow` matches
 * `progressiveTax(taxable, brackets)`. Used by the bracket walkthrough UI.
 */
export function bracketBreakdown(taxable: number, brackets: readonly TaxBracket[]): BracketRow[] {
  const rows: BracketRow[] = [];
  let prev = 0;
  let userMarked = false;
  for (const [cap, rate] of brackets) {
    const fullyInside = taxable > cap;
    const inRow = fullyInside ? cap - prev : Math.max(0, taxable - prev);
    const isUserBracket = !userMarked && taxable > prev && !fullyInside && inRow > 0;
    rows.push({
      from: prev,
      to: cap,
      rate,
      taxableInRow: inRow,
      taxFromRow: inRow * rate,
      isUserBracket,
    });
    if (isUserBracket) userMarked = true;
    prev = cap;
  }
  return rows;
}

/**
 * FICA: Social Security 6.2% up to the per-person wage base, Medicare 1.45%
 * on all wages, plus 0.9% Additional Medicare on income over $200K (single
 * threshold; we don't model the joint-filer threshold separately here).
 *
 * Important: this is per-person, NOT per-household. Two earners at $200K each
 * pay more SS than one earner at $400K because each hits the wage base cap
 * separately.
 */
export function calcFICA(income: number): number {
  const ss = Math.min(income, SS_WAGE_BASE) * 0.062;
  const medicare = income * 0.0145;
  const addlMedicare = Math.max(0, income - 200000) * 0.009;
  return ss + medicare + addlMedicare;
}

/**
 * Child Tax Credit: $2,000 per qualifying child under 17 (made permanent by
 * OBBBA). Phases out above $400K MFJ / $200K all others, by $50 per $1,000
 * of income above the threshold.
 */
export function calcChildTaxCredit(
  grossIncome: number,
  kids: number,
  filing: FilingStatus,
): number {
  if (kids === 0) return 0;
  const maxCredit = 2000 * kids;
  const phaseStart = filing === 'married' ? 400000 : 200000;
  if (grossIncome <= phaseStart) return maxCredit;
  const phaseAmt = Math.ceil((grossIncome - phaseStart) / 1000) * 50;
  return Math.max(0, maxCredit - phaseAmt);
}

/**
 * Earned Income Tax Credit — refundable. Approximated piecewise using the
 * standard phase-in / plateau / phase-out structure. Real EITC has more
 * nuance (investment income limits, separate childless thresholds for
 * older workers post-OBBBA, etc). 2026 max amounts per IRS Rev. Proc. 2025-32.
 */
export function calcEITC(grossIncome: number, kids: number, filing: FilingStatus): number {
  if (grossIncome > 70000) return 0;
  const married = filing === 'married';

  const max = kids === 0 ? 664 : kids === 1 ? 4427 : kids === 2 ? 7316 : 8231;
  const phaseInEnd = kids === 0 ? 8500 : kids === 1 ? 13000 : 18500;
  const phaseOutStart = married ? (kids === 0 ? 17800 : 30500) : kids === 0 ? 11000 : 23700;
  const phaseOutEnd = married
    ? kids === 0
      ? 26500
      : kids === 1
        ? 56500
        : kids === 2
          ? 63000
          : 67500
    : kids === 0
      ? 19700
      : kids === 1
        ? 50000
        : kids === 2
          ? 56000
          : 60000;

  if (grossIncome < phaseInEnd) {
    return max * (grossIncome / phaseInEnd);
  }
  if (grossIncome < phaseOutStart) return max;
  if (grossIncome < phaseOutEnd) {
    const t = (grossIncome - phaseOutStart) / (phaseOutEnd - phaseOutStart);
    return max * (1 - t);
  }
  return 0;
}
