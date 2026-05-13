import { describe, it, expect } from 'vitest';
import { findIncomePit, PIT_MIN_DELTA } from '@/lib/cliffs';

describe('findIncomePit', () => {
  it('returns a real pit when the household is just past a Medicaid cliff', () => {
    // NYC, married, 2 kids, $46K sole earner — just past NY's Medicaid
    // expansion cutoff (138% FPL ≈ $45,540 for a household of 4). Dropping
    // a few hundred dollars to retain Medicaid for both adults yields a
    // meaningfully bigger total-resources line, since employer family
    // premium in NYC is several thousand a year.
    const pit = findIncomePit({
      city: 'nyc',
      kids: 2,
      filing: 'married',
      lifestyle: 'moderate',
      hasPartner: true,
      incomeA: 46000,
      incomeB: 0,
    });
    expect(pit).not.toBeNull();
    expect(pit!.delta).toBeGreaterThan(1000);
    expect(pit!.programsGained).toContain('medicaid');
  });

  it('does NOT fire for the Columbus two-teachers scenario', () => {
    // The scenario that surfaced the original bug: Columbus, married, 2
    // kids, $110K combined moderate. On the previous (discretionary) metric
    // this produced a noisy $9 "you'd be better off at $69.5K" warning,
    // driven entirely by income-elastic expenses — not a real cliff trap.
    // On take-home + benefits the household is solidly past the cliff.
    const pit = findIncomePit({
      city: 'cmh',
      kids: 2,
      filing: 'married',
      lifestyle: 'moderate',
      hasPartner: true,
      incomeA: 56000,
      incomeB: 54000,
    });
    expect(pit).toBeNull();
  });

  it('still fires when the household is sitting inside a real cliff trough', () => {
    // Same Columbus configuration but at $70,500 — just past the CHIP
    // cutoff. Going back to $69,500 retains CHIP and nets meaningfully
    // more total resources. Must surface even on the new metric.
    const pit = findIncomePit({
      city: 'cmh',
      kids: 2,
      filing: 'married',
      lifestyle: 'moderate',
      hasPartner: true,
      incomeA: 16500,
      incomeB: 54000,
    });
    expect(pit).not.toBeNull();
    expect(pit!.programsGained).toContain('chip');
    expect(pit!.delta).toBeGreaterThanOrEqual(PIT_MIN_DELTA);
  });

  it('respects the minDelta override', () => {
    // Forcing minDelta=0 on a configuration with no genuine pit still
    // returns null — the floor is a filter, not a fabricator.
    const pit = findIncomePit({
      city: 'cmh',
      kids: 0,
      filing: 'single',
      lifestyle: 'moderate',
      hasPartner: false,
      incomeA: 75000,
      incomeB: 0,
      minDelta: 0,
    });
    expect(pit).toBeNull();
  });
});
