import { describe, expect, it } from 'vitest';
import { computeBudget } from '@/lib/budget';
import type { BudgetInput } from '@/types';

function input(overrides: Partial<BudgetInput> = {}): BudgetInput {
  return {
    incomeA: 75_000,
    filing: 'single',
    city: 'cmh',
    kids: 0,
    lifestyle: 'moderate',
    ...overrides,
  };
}

const sumValues = (rec: Record<string, number>) => Object.values(rec).reduce((s, n) => s + n, 0);

describe('computeBudget — invariants', () => {
  it('netIncome = grossIncome − totalTaxes', () => {
    const r = computeBudget(input({ incomeA: 100_000 }));
    expect(r.netIncome).toBeCloseTo(r.grossIncome - r.totalTaxes);
  });

  it('totalExpenses equals the sum of the line items', () => {
    const r = computeBudget(input());
    expect(r.totalExpenses).toBeCloseTo(sumValues(r.expenses));
  });

  it('discretionary = monthlyNet − totalExpenses', () => {
    const r = computeBudget(input());
    expect(r.discretionary).toBeCloseTo(r.monthlyNet - r.totalExpenses);
  });

  it('annualDiscretionary is exactly 12× discretionary', () => {
    const r = computeBudget(input());
    expect(r.annualDiscretionary).toBeCloseTo(r.discretionary * 12);
  });

  it('hasPartner is what controls household adults, not income', () => {
    const partnerNoIncome = computeBudget(input({ hasPartner: true }));
    const noPartnerNoIncome = computeBudget(input({ hasPartner: false }));
    expect(partnerNoIncome.adults).toBe(2);
    expect(noPartnerNoIncome.adults).toBe(1);
    expect(partnerNoIncome.householdSize).toBe(2);
  });

  it('a partner toggle without income still triggers the family healthcare plan', () => {
    const solo = computeBudget(input({ hasPartner: false }));
    const couple = computeBudget(input({ hasPartner: true }));
    expect(couple.expenses.Healthcare).toBeGreaterThan(solo.expenses.Healthcare);
  });
});

describe('computeBudget — tax math wiring', () => {
  it('FICA is computed per-person — two earners pay more SS than one combined', () => {
    const dual = computeBudget(
      input({ incomeA: 200_000, incomeB: 200_000, hasPartner: true, filing: 'married' }),
    );
    const solo = computeBudget(input({ incomeA: 400_000, filing: 'married' }));
    expect(dual.fica).toBeGreaterThan(solo.fica);
  });

  it('CTC populates only when there are kids', () => {
    const noKids = computeBudget(input({ kids: 0 }));
    const withKids = computeBudget(input({ kids: 2, incomeA: 80_000 }));
    expect(noKids.ctc).toBe(0);
    expect(withKids.ctc).toBeGreaterThan(0);
  });

  it('low-income family with children can show negative federal tax (refundable credits)', () => {
    const r = computeBudget(input({ incomeA: 25_000, kids: 2, filing: 'head' }));
    expect(r.federalTax).toBeLessThan(0);
  });

  it('marriage penalty: two equal high earners pay more federal tax filing jointly than as two singles', () => {
    // Above ~$770K combined the MFJ top bracket pinches harder than 2× single.
    const married = computeBudget(
      input({ incomeA: 500_000, incomeB: 500_000, filing: 'married', hasPartner: true }),
    );
    const cohabitating = computeBudget(
      input({ incomeA: 500_000, incomeB: 500_000, filing: 'single', hasPartner: true }),
    );
    expect(married.federalTax).toBeGreaterThan(cohabitating.federalTax);
  });
});

describe('computeBudget — benefits integration', () => {
  it('claiming SNAP reduces the Groceries line and records the offset', () => {
    const baseline = computeBudget(input({ incomeA: 18_000, kids: 2, filing: 'head' }));
    const withSnap = computeBudget(
      input({ incomeA: 18_000, kids: 2, filing: 'head', claimedBenefits: new Set(['snap']) }),
    );
    expect(withSnap.expenses.Groceries).toBeLessThan(baseline.expenses.Groceries);
    expect(withSnap.benefitsApplied['SNAP']).toBeGreaterThan(0);
    expect(withSnap.totalBenefits).toBeGreaterThan(0);
  });

  it('Medicaid takes priority over CHIP when both are claimed and the household qualifies', () => {
    // Low income, kids, expansion state (cmh = OH) → Medicaid covers the household.
    const r = computeBudget(
      input({
        incomeA: 18_000,
        kids: 2,
        filing: 'head',
        claimedBenefits: new Set(['medicaid', 'chip']),
      }),
    );
    expect(r.benefitsApplied['Medicaid']).toBeGreaterThan(0);
    expect(r.benefitsApplied['CHIP']).toBeUndefined();
    expect(r.expenses.Healthcare).toBe(0);
  });

  it('claiming a benefit you do not qualify for has no effect', () => {
    // High-income household claiming SNAP — must not get the benefit.
    const r = computeBudget(
      input({ incomeA: 250_000, kids: 0, claimedBenefits: new Set(['snap']) }),
    );
    expect(r.benefitsApplied['SNAP']).toBeUndefined();
    expect(r.totalBenefits).toBe(0);
  });
});

/**
 * Pinned exact-value regressions across the income spectrum. Update these
 * deliberately when tax brackets, credit amounts, or cost-of-living tables
 * change for a new year — the diff documents what moved and why.
 */
describe('computeBudget — pinned regressions', () => {
  it('low-income HoH with 2 kids in Columbus: refundable credits drive negative federal tax', () => {
    const r = computeBudget(
      input({ incomeA: 25_000, filing: 'head', city: 'cmh', kids: 2, lifestyle: 'modest' }),
    );
    expect(Math.round(r.federalTax)).toBe(-10_422); // CTC $4,000 + EITC $7,022, raw fed ~$600
    expect(Math.round(r.ctc)).toBe(4_000);
    expect(Math.round(r.eitc)).toBe(7_022);
    expect(Math.round(r.fica)).toBe(1_913);
    expect(Math.round(r.totalTaxes)).toBe(-7_884);
    expect(Math.round(r.netIncome)).toBe(32_884);
  });

  it('median single in Columbus: standard middle-class profile', () => {
    const r = computeBudget(
      input({ incomeA: 75_000, filing: 'single', city: 'cmh', kids: 0, lifestyle: 'moderate' }),
    );
    expect(Math.round(r.federalTax)).toBe(7_670);
    expect(Math.round(r.stateTax)).toBe(1_346);
    expect(Math.round(r.fica)).toBe(5_738);
    expect(Math.round(r.totalTaxes)).toBe(16_629);
    expect(Math.round(r.netIncome)).toBe(58_371);
  });

  it('exposes CEX-derived line items in the expenses dict', () => {
    const r = computeBudget(input());
    expect(r.expenses['Apparel']).toBeGreaterThan(0);
    expect(r.expenses['Entertainment']).toBeGreaterThan(0);
    expect(r.expenses['Personal Care']).toBeGreaterThan(0);
    expect(r.expenses['Education']).toBeGreaterThan(0);
    expect(r.expenses['Household Operations']).toBeGreaterThan(0);
    expect(r.expenses['Housekeeping Supplies']).toBeGreaterThan(0);
    expect(r.expenses['Furnishings']).toBeGreaterThan(0);
  });

  it('exposes income quintile and CEX geo provenance in the result', () => {
    // NYC has an MSA mapping; foodAway should source from MSA.
    const r = computeBudget(input({ city: 'nyc' }));
    expect(r.incomeQuintile).toBe('q3'); // $75K → q3 per Table 1101 thresholds
    expect(r.cexProvenance['foodAway']).toBe('msa');
    // Columbus has no MSA mapping; foodAway falls through to division.
    const r2 = computeBudget(input());
    expect(r2.cexProvenance['foodAway']).toBe('division');
  });

  it('higher-quintile households spend more on income-elastic categories', () => {
    // Same city, same household; only income changes the quintile bucket.
    const q3 = computeBudget(input({ incomeA: 75_000 })); // q3
    const q5 = computeBudget(input({ incomeA: 200_000 })); // q5
    expect(q5.incomeQuintile).toBe('q5');
    expect(q5.expenses['Entertainment']).toBeGreaterThan(q3.expenses['Entertainment']);
    expect(q5.expenses['Apparel']).toBeGreaterThan(q3.expenses['Apparel']);
  });

  it('essentials + lifestyle = total expenses, and discretionaryIncome ≥ surplus', () => {
    // Pins the #203 split: every dollar of expense lands in exactly one
    // bucket, the two sum to the full total, and the textbook
    // "discretionary income" (income − essentials) is always ≥ the
    // legacy "surplus" (income − total expenses) because it credits
    // back the lifestyle spending the household *could* step down.
    const r = computeBudget(input({ incomeA: 75_000, city: 'cmh' }));
    const sum = r.essentialExpenses + r.lifestyleExpenses;
    expect(sum).toBeCloseTo(r.totalExpenses, 1);
    expect(r.discretionaryIncome).toBeGreaterThanOrEqual(r.discretionary);
    expect(r.discretionaryIncome - r.discretionary).toBeCloseTo(r.lifestyleExpenses, 1);
    // A moderate-income household should have *some* lifestyle spending
    // baked in — if this drops to 0, something has miscategorized.
    expect(r.lifestyleExpenses).toBeGreaterThan(100);
  });

  it('income-axis is smooth across the q4→q5 boundary (no artifact step)', () => {
    // Regression for the artifact pit at $155,924 (q4Max). Pre-smoothing
    // the spending shape snapped from q4 to q5 the moment income crossed
    // the boundary, producing an unrealistic step jump in expenses (and
    // a spurious "benefits cliff" warning at incomes well past every
    // benefit cutoff). With smoothNationalQuintile, $155K and $158K
    // sit at very similar interpolated points along the q4-mean →
    // q5-mean segment — the totals should agree to within ~3%.
    const below = computeBudget(input({ incomeA: 155_000 }));
    const above = computeBudget(input({ incomeA: 158_000 }));
    const ratio = above.totalExpenses / below.totalExpenses;
    expect(ratio).toBeGreaterThan(0.97);
    expect(ratio).toBeLessThan(1.03);
  });

  it('dual-earner $200K+$200K married in NYC with 2 kids: per-person FICA + city tax', () => {
    const r = computeBudget(
      input({
        incomeA: 200_000,
        incomeB: 200_000,
        hasPartner: true,
        filing: 'married',
        city: 'nyc',
        kids: 2,
        lifestyle: 'comfortable',
      }),
    );
    expect(Math.round(r.federalTax)).toBe(69_468);
    expect(Math.round(r.stateTax)).toBe(22_413);
    expect(Math.round(r.localTax)).toBe(15_200); // NYC local tax
    expect(Math.round(r.fica)).toBe(28_678); // two SS wage bases
    expect(Math.round(r.totalTaxes)).toBe(135_759);
  });
});
