import type { BudgetInput } from '@/types';
import { computeBudget } from '@/lib/budget';
import { BENEFIT_IDS, checkBenefit, type BenefitId } from '@/lib/benefits';

/**
 * Compute "pit zones" along an income sweep: contiguous income ranges where
 * the household ends up with less of `metricKey` than they would have at
 * some lower income — i.e. crossing a benefit cutoff cost more than the
 * raise was worth.
 *
 * Each zone is attributed to the cliff that caused it (the highest-gross
 * cliff at or below the zone's start) so the UI can color-match zones to
 * the program lost. If no cliff matches, the zone is returned without a
 * color so the caller can apply a fallback.
 */
export interface PitZone {
  x1: number;
  x2: number;
  /** Color of the cliff that triggered this zone, if attributable. */
  color?: string;
  /** Id of the cliff that triggered this zone, if attributable. */
  cliffId?: string;
}

export function computePitZones<P extends { gross: number }>(
  points: readonly P[],
  metricKey: keyof P,
  cliffs: readonly { id: string; gross: number; color: string }[],
): PitZone[] {
  const sortedCliffs = [...cliffs].sort((a, b) => b.gross - a.gross); // desc
  // Use <= because a synthesized curve can open a pit at exactly the
  // cliff's gross (the drop is applied at g === cliff.gross). For real
  // computed curves the zone opens at the next swept point past the
  // cliff, so the strict-< relation also matches via the same lookup —
  // <= covers both cases. Without this, attribution silently falls back
  // to a default color and the program's accent never propagates.
  const findCause = (zoneStart: number) => sortedCliffs.find((c) => c.gross <= zoneStart);

  const zones: PitZone[] = [];
  let runningMax = -Infinity;
  let currentZoneStart: number | null = null;

  for (let i = 0; i < points.length; i++) {
    const v = points[i][metricKey] as unknown as number;
    if (v < runningMax) {
      if (currentZoneStart === null) currentZoneStart = points[i].gross;
    } else {
      if (currentZoneStart !== null) {
        const cause = findCause(currentZoneStart);
        zones.push({
          x1: currentZoneStart,
          x2: points[i].gross,
          color: cause?.color,
          cliffId: cause?.id,
        });
        currentZoneStart = null;
      }
      runningMax = v;
    }
  }
  if (currentZoneStart !== null && points.length > 0) {
    const cause = findCause(currentZoneStart);
    zones.push({
      x1: currentZoneStart,
      x2: points[points.length - 1].gross,
      color: cause?.color,
      cliffId: cause?.id,
    });
  }
  return zones;
}

/**
 * "Pit" detection: at the current scenario, is there an income *below* the
 * current one where the household would end up with *more* annual
 * discretionary income? That happens when raising income across a benefit
 * eligibility cutoff costs more in lost benefits than it gained in
 * paycheck — the cliff trap.
 *
 * The sweep auto-claims every benefit at every income point so we measure
 * the genuinely optimal outcome at each income level (not whatever the user
 * happens to have toggled). If the user is currently below all cliffs and
 * already claiming everything available, no pit can exist by definition.
 *
 * Returns null when there is no pit; otherwise returns the optimal lower
 * income, the discretionary delta it would create, and the list of benefit
 * programs the optimal income qualifies for that the current income does
 * not.
 */
export interface IncomePit {
  /** Annual gross income at which discretionary peaks below current. */
  optimalGross: number;
  /** Annual discretionary at the optimal lower income. */
  optimalDiscretionary: number;
  /** Annual discretionary at the current income. */
  currentDiscretionary: number;
  /**
   * The annual delta — how much more (in $/yr) the household would have
   * at the optimal lower income vs. now. Always positive.
   */
  delta: number;
  /**
   * Programs the optimal income qualifies for that current income does
   * not. These are the programs whose loss creates the pit.
   */
  programsGained: BenefitId[];
}

export function findIncomePit(
  input: Omit<BudgetInput, 'claimedBenefits'> & { stepSize?: number },
): IncomePit | null {
  const stepSize = input.stepSize ?? 500;
  const allBenefits = new Set<string>(BENEFIT_IDS);
  const totalIncome = input.incomeA + (input.incomeB ?? 0);
  if (totalIncome <= 0) return null;

  // Compute current discretionary with everything claimed.
  const current = computeBudget({ ...input, claimedBenefits: allBenefits });
  const currentDisc = current.annualDiscretionary;

  // Sweep $0 → currentGross at stepSize granularity, varying incomeA.
  // Holding incomeB fixed mirrors how CliffCurve presents the sweep.
  let bestGross = totalIncome;
  let bestDisc = currentDisc;
  for (let g = 0; g < totalIncome; g += stepSize) {
    const sweepIncomeA = Math.max(0, g - (input.incomeB ?? 0));
    const r = computeBudget({
      ...input,
      incomeA: sweepIncomeA,
      claimedBenefits: allBenefits,
    });
    if (r.annualDiscretionary > bestDisc) {
      bestDisc = r.annualDiscretionary;
      bestGross = g;
    }
  }

  if (bestGross >= totalIncome || bestDisc <= currentDisc) return null;

  // Identify which programs the optimal income qualifies for that the
  // current does not. Re-check eligibility at both points using the
  // benefits API directly (cheaper than parsing computeBudget output).
  const baseInputs = {
    householdSize: current.householdSize,
    state: current.cityData.state,
    adults: current.adults,
    kids: current.householdSize - current.adults,
    monthlyHealthcareCost:
      current.expenses.Healthcare +
      (current.benefitsApplied['Medicaid'] ?? 0) +
      (current.benefitsApplied['CHIP'] ?? 0),
    monthlyHealthcareSingle: current.cityData.healthSingle,
  };
  const programsGained: BenefitId[] = [];
  for (const id of BENEFIT_IDS) {
    const atOptimal = checkBenefit(id, { ...baseInputs, grossIncome: bestGross });
    const atCurrent = checkBenefit(id, { ...baseInputs, grossIncome: totalIncome });
    if (atOptimal.eligible && !atCurrent.eligible) {
      programsGained.push(id);
    }
  }

  return {
    optimalGross: bestGross,
    optimalDiscretionary: bestDisc,
    currentDiscretionary: currentDisc,
    delta: bestDisc - currentDisc,
    programsGained,
  };
}
