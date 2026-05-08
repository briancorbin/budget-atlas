import { describe, expect, it } from 'vitest';
import {
  checkBenefit,
  checkChip,
  checkMedicaid,
  checkSnap,
  type BenefitInputs,
} from '@/lib/benefits';

function inputs(overrides: Partial<BenefitInputs> = {}): BenefitInputs {
  return {
    grossIncome: 20_000,
    householdSize: 3,
    state: 'OH',
    adults: 1,
    kids: 2,
    monthlyHealthcareCost: 800,
    // Default premium == cost (no OOP component) so legacy test math
    // (kidsShare = cost − single) still matches without per-test overrides.
    monthlyHealthcarePremium: 800,
    monthlyHealthcareSingle: 350,
    ...overrides,
  };
}

describe('checkSnap', () => {
  it('rejects empty households cleanly', () => {
    const r = checkSnap(inputs({ householdSize: 0 }));
    expect(r.eligible).toBe(false);
    expect(r.monthlyBenefit).toBe(0);
  });

  it('returns ineligible above the state gross-income limit', () => {
    // OH uses BBCE at 130% federal floor for SNAP; 3-person 100% FPL = $27,320,
    // so $200K is unambiguously over.
    const r = checkSnap(inputs({ grossIncome: 200_000 }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/exceeds/i);
    expect(r.monthlyBenefit).toBe(0);
  });

  it('returns a non-negative monthly benefit when eligible', () => {
    const r = checkSnap(inputs({ grossIncome: 18_000, householdSize: 3 }));
    expect(r.eligible).toBe(true);
    expect(r.monthlyBenefit).toBeGreaterThan(0);
    expect(r.monthlyBenefit).toBeLessThanOrEqual(785); // FY2026 max for HH=3
  });

  it('benefit decreases as income rises (still within eligibility)', () => {
    const low = checkSnap(inputs({ grossIncome: 12_000, householdSize: 3 }));
    const high = checkSnap(inputs({ grossIncome: 25_000, householdSize: 3 }));
    expect(low.eligible && high.eligible).toBe(true);
    expect(low.monthlyBenefit).toBeGreaterThan(high.monthlyBenefit);
  });

  it('notes BBCE explicitly when a state has expanded the limit', () => {
    // CA is on the 200% BBCE list.
    const r = checkSnap(inputs({ state: 'CA', grossIncome: 20_000 }));
    expect(r.policyNote).toMatch(/Broad-Based Categorical Eligibility/i);
  });
});

describe('checkMedicaid', () => {
  it('covers eligible adults in expansion states up to 138% FPL', () => {
    const r = checkMedicaid(inputs({ state: 'OH', grossIncome: 20_000, kids: 0 }));
    expect(r.eligible).toBe(true);
    expect(r.monthlyBenefit).toBe(800);
    expect(r.policyNote).toMatch(/expanded Medicaid/i);
  });

  it('cuts off at 138% FPL in expansion states', () => {
    // 3-person FPL = $27,320; 138% = $37,701. $80K is well above.
    const r = checkMedicaid(inputs({ state: 'OH', grossIncome: 80_000 }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/138% FPL/);
  });

  it('childless adults in non-expansion states are in the coverage gap regardless of income', () => {
    const r = checkMedicaid(inputs({ state: 'TX', grossIncome: 5_000, kids: 0 }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/no Medicaid pathway/i);
    expect(r.policyNote).toMatch(/coverage gap/i);
  });

  it('parents in non-expansion states qualify only below the state-specific threshold', () => {
    // TX parent limit = 17% FPL. 3-person 100% FPL = $27,320 → 17% ≈ $4,644.
    const eligible = checkMedicaid(inputs({ state: 'TX', grossIncome: 3_000, kids: 1 }));
    expect(eligible.eligible).toBe(true);
    const ineligible = checkMedicaid(inputs({ state: 'TX', grossIncome: 30_000, kids: 1 }));
    expect(ineligible.eligible).toBe(false);
  });
});

describe('checkChip', () => {
  it('is ineligible when there are no kids in the household', () => {
    const r = checkChip(inputs({ kids: 0 }));
    expect(r.eligible).toBe(false);
    expect(r.reason).toMatch(/no kids/i);
  });

  it("monthly benefit isolates the kids' share of the family premium", () => {
    // 1 adult + kids: kidsShare = family premium − single = 800 − 350 = 450.
    const r = checkChip(
      inputs({ adults: 1, monthlyHealthcarePremium: 800, monthlyHealthcareSingle: 350 }),
    );
    expect(r.eligible).toBe(true);
    expect(r.monthlyBenefit).toBe(450);
  });

  it('uses 2× single-coverage as the adult baseline for two-adult households', () => {
    // 2 adults: kidsShare = 1200 − 2*400 = 400.
    const r = checkChip(
      inputs({ adults: 2, monthlyHealthcarePremium: 1200, monthlyHealthcareSingle: 400 }),
    );
    expect(r.monthlyBenefit).toBe(400);
  });

  it('floors the benefit at zero if family premium is below the adult baseline', () => {
    const r = checkChip(
      inputs({ adults: 2, monthlyHealthcarePremium: 500, monthlyHealthcareSingle: 400 }),
    );
    expect(r.monthlyBenefit).toBe(0);
  });

  it('CHIP value uses premium-only — OOP must not inflate it', () => {
    // Regression guard: post-#181, callers pass the total (premium + OOP)
    // as `monthlyHealthcareCost` for Medicaid's value (Medicaid covers
    // both). For CHIP — which only replaces the kids' premium share —
    // the OOP component would inflate the benefit. checkChip keys off
    // monthlyHealthcarePremium specifically.
    const r = checkChip(
      inputs({
        adults: 1,
        monthlyHealthcareCost: 1400, // premium + OOP
        monthlyHealthcarePremium: 1200, // premium only
        monthlyHealthcareSingle: 400,
      }),
    );
    // Correct: 1200 (premium) − 400 (single) = 800.
    // Buggy hypothesis: 1400 (total) − 400 = 1000 ($200 inflation from OOP).
    expect(r.monthlyBenefit).toBe(800);
  });
});

describe('checkBenefit dispatch', () => {
  it('routes by id', () => {
    const i = inputs();
    expect(checkBenefit('snap', i)).toEqual(checkSnap(i));
    expect(checkBenefit('medicaid', i)).toEqual(checkMedicaid(i));
    expect(checkBenefit('chip', i)).toEqual(checkChip(i));
  });
});
