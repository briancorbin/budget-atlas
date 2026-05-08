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

/**
 * All benefit programs we model. The runtime list is the source of truth;
 * `BenefitId` is derived from it via `(typeof BENEFIT_IDS)[number]` so the
 * two cannot drift out of sync. Add new IDs to the array.
 */
export const BENEFIT_IDS = ['snap', 'medicaid', 'chip'] as const;
export type BenefitId = (typeof BENEFIT_IDS)[number];

/**
 * Dispatch eligibility for any program by id. New programs add a case here
 * once their checker exists; callers can stay generic.
 */
export function checkBenefit(id: BenefitId, inputs: BenefitInputs): BenefitEligibility {
  switch (id) {
    case 'snap':
      return checkSnap(inputs);
    case 'medicaid':
      return checkMedicaid(inputs);
    case 'chip':
      return checkChip(inputs);
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
  /** Current modeled healthcare expense, monthly (premium + OOP). Used to
   *  estimate Medicaid benefit value (Medicaid covers both premium and
   *  out-of-pocket, so the total is what gets eliminated). */
  monthlyHealthcareCost: number;
  /** Premium-only portion of the family healthcare cost. CHIP covers the
   *  kids' marginal premium share — using `monthlyHealthcareCost` (which
   *  also includes OOP) for that math would inflate CHIP's value, since
   *  CHIP doesn't actually replace OOP. */
  monthlyHealthcarePremium: number;
  /** Adult-only (single-coverage) baseline healthcare premium, monthly.
   *  Used to isolate the kids' share for CHIP estimates. */
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
export function checkSnap({
  grossIncome,
  householdSize,
  state,
}: BenefitInputs): BenefitEligibility {
  if (householdSize <= 0) {
    return { eligible: false, reason: 'No household members specified.', monthlyBenefit: 0 };
  }

  const limitFpl = snapIncomeLimitFpl(state);
  const limitPct = Math.round(limitFpl * 100);
  const limitDollars = Math.round(fpl(householdSize) * limitFpl);
  const policyNote =
    limitFpl > SNAP_GROSS_INCOME_LIMIT_FPL_FEDERAL
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
  const earnedDeduction = monthlyGross * 0.2;
  const netMonthly = Math.max(0, monthlyGross - earnedDeduction - SNAP_STD_DEDUCTION_2026);
  const max = snapMaxBenefit(householdSize);
  const benefit = Math.max(0, Math.round(max - 0.3 * netMonthly));

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
 *
 * ── How we compute the dollar VALUE of Medicaid ──
 * `monthlyBenefit = monthlyHealthcareCost`, where `monthlyHealthcareCost`
 * is the household's `cityData.healthFamily` (or healthSingle) figure
 * sourced from KFF's Employer Health Benefits Survey — the worker's share
 * of an employer-sponsored family premium. The model treats Medicaid as
 * worth exactly what employer-sponsored coverage would cost the worker,
 * which is a simplification with two real-world limitations:
 *
 *  (a) Medicaid is genuinely better than typical employer coverage —
 *      $0 deductible, $0 copays, often broader dental/vision for kids —
 *      so its actuarial value is higher than what a worker would pay
 *      for an equivalent private plan.
 *  (b) Conversely, a household losing Medicaid often lands on an ACA
 *      marketplace plan that costs MORE than the modeled employer
 *      premium (different premium, plus deductibles + out-of-pocket
 *      max). So the post-cliff expense undercounts real-world cost.
 *
 * The symmetry — Medicaid value == post-cliff healthcare expense —
 * means cliff drops on the Discretionary line equal cliff drops on the
 * Take-home + benefits line. A more honest model would split these.
 * See roadmap: "Asymmetric Medicaid value vs. post-cliff cost".
 */
export function checkMedicaid({
  grossIncome,
  householdSize,
  state,
  kids,
  monthlyHealthcareCost,
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
 * Only relevant when there are children in the household.
 *
 * ── How we compute the dollar VALUE of CHIP ──
 * Same KFF Employer Health Benefits Survey lineage as Medicaid: the
 * `monthlyHealthcareCost` and `monthlyHealthcareSingle` are from
 * `cityData.healthFamily` and `cityData.healthSingle` respectively.
 * CHIP value is the kids' marginal share of the family premium — the
 * cost of adding children to an adult-only plan:
 *
 *   1 adult + kids   →  family premium − single-coverage premium
 *   2 adults + kids  →  family premium − (2 × single-coverage premium)
 *                       (we don't model an explicit two-adult plan rate;
 *                        2× single is a reasonable approximation)
 *
 * Real CHIP often charges small premiums above ~150% FPL (varies by state);
 * we treat coverage as fully replacing the kids' share for simplicity.
 *
 * Same caveat as Medicaid: by treating CHIP value as exactly the kids'
 * employer-premium share, we assume the post-CHIP-cliff household pays
 * exactly that amount to add kids to a private plan. The true value of
 * CHIP coverage (low/no copays, broad pediatric coverage) is likely
 * higher; the true post-cliff cost depends on whether the household
 * has employer coverage available or has to use the marketplace. See
 * roadmap: "Asymmetric Medicaid value vs. post-cliff cost".
 */
export function checkChip({
  grossIncome,
  householdSize,
  state,
  adults,
  kids,
  monthlyHealthcarePremium,
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

  const adultBaseline = adults === 2 ? 2 * monthlyHealthcareSingle : monthlyHealthcareSingle;
  // CHIP replaces the kids' marginal premium share, not their OOP.
  const kidsShare = Math.max(0, monthlyHealthcarePremium - adultBaseline);
  return {
    eligible: true,
    monthlyBenefit: Math.round(kidsShare),
    policyNote,
  };
}
