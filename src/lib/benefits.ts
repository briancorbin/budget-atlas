import type { StateCode } from '@/types';
import { fpl, fplPct } from '@/data/poverty';
import {
  MEDICAID_EXPANSION_LIMIT_FPL,
  SNAP_GROSS_INCOME_LIMIT_FPL_FEDERAL,
  SNAP_MAX_BENEFIT_2026,
  SNAP_MAX_PER_ADDITIONAL_2026,
  SNAP_STD_DEDUCTION_2026,
  STATE_CHIP_LIMIT_FPL,
  STATE_MEDICAID_POLICY,
  snapIncomeLimitFpl,
} from '@/data/benefits';

/** All benefit programs we model. Add new IDs here as we ship them. */
export type BenefitId = 'snap' | 'medicaid' | 'chip';

/**
 * Dispatch eligibility for any program by id. New programs add a case here
 * once their checker exists; callers can stay generic.
 */
export function checkBenefit(id: BenefitId, inputs: BenefitInputs): BenefitEligibility {
  switch (id) {
    case 'snap': return checkSnap(inputs);
    case 'medicaid': return checkMedicaid(inputs);
    case 'chip': return checkChip(inputs);
  }
}

/** Result of an eligibility check for a single program. */
export interface BenefitEligibility {
  eligible: boolean;
  /** Why not, if not eligible. Short editorial sentence. */
  reason?: string;
  /** Estimated monthly benefit when claimed (in dollars/month). */
  monthlyBenefit: number;
  /**
   * State-policy context that's relevant whether or not the household is
   * eligible — e.g. "AZ raises this to 165% via Broad-Based Categorical
   * Eligibility". Surfaced as a small editorial note in the benefit card.
   */
  policyNote?: string;
}

export interface BenefitInputs {
  grossIncome: number;
  householdSize: number;
  state: StateCode;
  /** Number of adults (1 or 2). Used to size the adult-only healthcare
   *  baseline when estimating CHIP's kids-only coverage value. */
  adults: number;
  /** Number of children in the household (0–4+). Drives parent vs. childless
   *  adult logic for non-expansion Medicaid, and CHIP applicability. */
  kids: number;
  /** Current modeled healthcare expense, monthly. Used to estimate Medicaid
   *  / CHIP benefit value (the dollars eliminated when the program covers). */
  monthlyHealthcareCost: number;
  /** Adult-only (single-coverage) baseline healthcare cost, monthly. Used to
   *  isolate the kids' share of family healthcare for CHIP estimates. */
  monthlyHealthcareSingle: number;
}

// ── SNAP ────────────────────────────────────────────────────────────────

/** SNAP max benefit for a household of this size (FY2026). */
function snapMaxBenefit(householdSize: number): number {
  if (householdSize <= 0) return 0;
  if (householdSize <= 8) return SNAP_MAX_BENEFIT_2026[householdSize];
  return SNAP_MAX_BENEFIT_2026[8] + (householdSize - 8) * SNAP_MAX_PER_ADDITIONAL_2026;
}

/**
 * SNAP eligibility + estimated benefit. Simplified relative to actual SNAP:
 *
 * - Gross income test: ≤ state limit. The federal floor is 130% FPL; most
 *   states have adopted BBCE to raise this to 165%, 185%, or 200% — see
 *   SNAP_BBCE_BY_STATE in data/benefits.ts.
 * - Net income approximated as: gross − 20% earned-income deduction
 *   − standard deduction. Real SNAP also subtracts excess shelter,
 *   childcare, and medical costs; we leave those for later refinement.
 * - Benefit = max(0, max_benefit − 0.30 × net_income / 12). The 30%
 *   factor is the federal "expected family contribution to food".
 */
export function checkSnap({ grossIncome, householdSize, state }: BenefitInputs): BenefitEligibility {
  if (householdSize <= 0) {
    return { eligible: false, reason: 'No household members specified.', monthlyBenefit: 0 };
  }

  const limitFpl = snapIncomeLimitFpl(state);
  const limitPct = Math.round(limitFpl * 100);
  const limitDollars = Math.round(fpl(householdSize) * limitFpl);
  const policyNote = limitFpl > SNAP_GROSS_INCOME_LIMIT_FPL_FEDERAL
    ? `${state} raises the gross-income limit to ${limitPct}% of FPL (≈ $${limitDollars.toLocaleString()}/yr for a household of ${householdSize}) via Broad-Based Categorical Eligibility.`
    : `${state} uses the 130% federal floor (≈ $${limitDollars.toLocaleString()}/yr for a household of ${householdSize}); no BBCE expansion adopted.`;

  const ratio = fplPct(grossIncome, householdSize);
  if (ratio > limitFpl) {
    return {
      eligible: false,
      reason: `Income exceeds ${limitPct}% of the federal poverty level (~$${limitDollars.toLocaleString()}/yr for a household of ${householdSize}).`,
      monthlyBenefit: 0,
      policyNote,
    };
  }

  const monthlyGross = grossIncome / 12;
  const earnedDeduction = monthlyGross * 0.20;
  const netMonthly = Math.max(0, monthlyGross - earnedDeduction - SNAP_STD_DEDUCTION_2026);
  const max = snapMaxBenefit(householdSize);
  const benefit = Math.max(0, Math.round(max - 0.30 * netMonthly));

  return { eligible: true, monthlyBenefit: benefit, policyNote };
}

// ── Medicaid ────────────────────────────────────────────────────────────

/**
 * Medicaid eligibility. Two regimes:
 *
 * 1. Expansion states (40 + DC): all adults up to 138% FPL, regardless of
 *    parental status.
 * 2. Non-expansion states (10): parents qualify only up to a much lower
 *    state-specific threshold (e.g. 17% FPL in Texas, ~95% in Tennessee).
 *    Childless adults have NO Medicaid pathway at any income — the
 *    "coverage gap." This is the editorial highlight worth surfacing.
 *
 * Children's Medicaid is broader; we route kids through CHIP as the
 * separate program, which subsumes Medicaid-for-kids in this model.
 */
export function checkMedicaid({
  grossIncome, householdSize, state, kids, monthlyHealthcareCost,
}: BenefitInputs): BenefitEligibility {
  const policy = STATE_MEDICAID_POLICY[state];
  const ratio = fplPct(grossIncome, householdSize);

  if (policy.expanded) {
    const policyNote = `${state} expanded Medicaid under the ACA — all adults qualify up to 138% of FPL.`;
    if (ratio > MEDICAID_EXPANSION_LIMIT_FPL) {
      const limitDollars = Math.round(fpl(householdSize) * MEDICAID_EXPANSION_LIMIT_FPL);
      return {
        eligible: false,
        reason: `Income exceeds 138% FPL (~$${limitDollars.toLocaleString()}/yr for a household of ${householdSize}).`,
        monthlyBenefit: 0,
        policyNote,
      };
    }
    return { eligible: true, monthlyBenefit: Math.round(monthlyHealthcareCost), policyNote };
  }

  // Non-expansion state
  const limit = policy.nonExpansionParentLimit ?? 0;
  const limitPct = Math.round(limit * 100);
  const policyNote = `${state} has not expanded Medicaid. Parents qualify only up to ~${limitPct}% FPL; childless adults have no Medicaid pathway at any income (the "coverage gap").`;

  if (kids === 0) {
    return {
      eligible: false,
      reason: `Without children in the household, ${state} provides no Medicaid pathway for working-age adults.`,
      monthlyBenefit: 0,
      policyNote,
    };
  }

  if (ratio > limit) {
    const limitDollars = Math.round(fpl(householdSize) * limit);
    return {
      eligible: false,
      reason: `Income exceeds ${state}'s parent-Medicaid threshold of ~${limitPct}% FPL (~$${limitDollars.toLocaleString()}/yr for a household of ${householdSize}).`,
      monthlyBenefit: 0,
      policyNote,
    };
  }

  return { eligible: true, monthlyBenefit: Math.round(monthlyHealthcareCost), policyNote };
}

// ── CHIP ────────────────────────────────────────────────────────────────

/**
 * CHIP eligibility. Per-state income limit (typically 200%–400% FPL).
 * Only relevant when there are children in the household. Benefit value
 * is the kids' share of the family premium — the marginal cost of adding
 * children to an adult-only plan:
 *
 *   1 adult + kids   →  family premium − single-coverage premium
 *   2 adults + kids  →  family premium − (2 × single-coverage premium)
 *                       (we don't model an explicit two-adult plan rate;
 *                        2× single is a reasonable approximation)
 *
 * Real CHIP often charges small premiums above ~150% FPL (varies by state);
 * we treat coverage as fully replacing the kids' share for simplicity.
 */
export function checkChip({
  grossIncome, householdSize, state, adults, kids, monthlyHealthcareCost,
  monthlyHealthcareSingle,
}: BenefitInputs): BenefitEligibility {
  const limit = STATE_CHIP_LIMIT_FPL[state];
  const limitPct = Math.round(limit * 100);
  const policyNote = `${state} covers children up to ${limitPct}% of FPL through CHIP.`;

  if (kids === 0) {
    return {
      eligible: false,
      reason: 'CHIP covers children only — household has no kids to enroll.',
      monthlyBenefit: 0,
      policyNote,
    };
  }

  const ratio = fplPct(grossIncome, householdSize);
  if (ratio > limit) {
    const limitDollars = Math.round(fpl(householdSize) * limit);
    return {
      eligible: false,
      reason: `Income exceeds ${limitPct}% FPL (~$${limitDollars.toLocaleString()}/yr for a household of ${householdSize}).`,
      monthlyBenefit: 0,
      policyNote,
    };
  }

  const adultBaseline = adults === 2
    ? 2 * monthlyHealthcareSingle
    : monthlyHealthcareSingle;
  const kidsShare = Math.max(0, monthlyHealthcareCost - adultBaseline);
  return {
    eligible: true,
    monthlyBenefit: Math.round(kidsShare),
    policyNote,
  };
}
