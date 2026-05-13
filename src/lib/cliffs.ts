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
  // Caller passes a key whose value is numeric; TS can't express that
  // constraint without collapsing P[K] to a union, so the value is read
  // through a cast below.
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
 * current one where the household would end up with *more* annual total
 * resources (take-home + benefit value)? That happens when raising income
 * across a benefit eligibility cutoff costs more in lost benefits than it
 * gained in paycheck — the cliff trap.
 *
 * Why total resources, not discretionary: discretionary subtracts modeled
 * expenses, and modeled expenses scale with income (lifestyle elasticity,
 * CEX quintile steps). Using discretionary as the pit metric conflates two
 * different stories — the genuine benefits cliff (a one-time hit at the
 * threshold) and the lifestyle-inflation tail that lingers after it — and
 * makes the "pit" look much wider than the policy reality. Take-home +
 * benefits matches the metric the cliff curve plots, so the warning and
 * the chart agree.
 *
 * The sweep auto-claims every benefit at every income point so we measure
 * the genuinely optimal outcome at each income level (not whatever the user
 * happens to have toggled). If the user is currently below all cliffs and
 * already claiming everything available, no pit can exist by definition.
 *
 * Returns null when there is no pit; otherwise returns the optimal lower
 * income, the resources delta it would create, and the list of benefit
 * programs the optimal income qualifies for that the current income does
 * not.
 */
export interface IncomePit {
  /** Annual gross income at which total resources peaks below current. */
  optimalGross: number;
  /** Annual take-home + benefit value at the optimal lower income. */
  optimalResources: number;
  /** Annual take-home + benefit value at the current income. */
  currentResources: number;
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

/**
 * Minimum annual delta required to surface a pit. Below this floor the
 * "pit" is a wash — the lost paycheck and the kept benefits cancel out to
 * within modeling noise (premium rounding, FICA per-earner edges, etc.),
 * and the warning's "more than offsetting the lost paycheck" copy oversells
 * a trivial difference. $500/yr is roughly $40/mo — a small but real gap.
 */
export const PIT_MIN_DELTA = 500;

/** Total resources = take-home + annualized benefit value. Matches the
 *  metric the cliff curve plots, so warning + chart can't drift. */
function totalResources(r: { netIncome: number; totalBenefits: number }): number {
  return r.netIncome + r.totalBenefits * 12;
}

export function findIncomePit(
  input: Omit<BudgetInput, 'claimedBenefits'> & { stepSize?: number; minDelta?: number },
): IncomePit | null {
  const stepSize = input.stepSize ?? 500;
  const minDelta = input.minDelta ?? PIT_MIN_DELTA;
  const allBenefits = new Set<string>(BENEFIT_IDS);
  const totalIncome = input.incomeA + (input.incomeB ?? 0);
  if (totalIncome <= 0) return null;

  // Compute current total resources with everything claimed.
  const current = computeBudget({ ...input, claimedBenefits: allBenefits });
  const currentRes = totalResources(current);

  // Sweep $0 → currentGross at stepSize granularity, scaling both earners
  // proportionally to their current ratio. Mirrors how CliffCurve presents
  // the sweep — and matters more than it looks: holding incomeB fixed
  // collapses every g < incomeB onto the same household income, making the
  // sweep blind to actual low-income behavior in dual-earner scenarios.
  const ratioB = totalIncome > 0 ? (input.incomeB ?? 0) / totalIncome : 0;
  let bestGross = totalIncome;
  let bestRes = currentRes;
  for (let g = 0; g < totalIncome; g += stepSize) {
    const sweepIncomeB = Math.round(g * ratioB);
    const sweepIncomeA = g - sweepIncomeB;
    const r = computeBudget({
      ...input,
      incomeA: sweepIncomeA,
      incomeB: sweepIncomeB,
      claimedBenefits: allBenefits,
    });
    const res = totalResources(r);
    if (res > bestRes) {
      bestRes = res;
      bestGross = g;
    }
  }

  if (bestGross >= totalIncome || bestRes <= currentRes) return null;
  if (bestRes - currentRes < minDelta) return null;

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
    monthlyHealthcarePremium: current.healthcarePremium,
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
    optimalResources: bestRes,
    currentResources: currentRes,
    delta: bestRes - currentRes,
    programsGained,
  };
}
