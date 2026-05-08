import { describe, it, expect } from 'vitest';
import {
  STATE_TO_DIVISION,
  DIVISION_TO_REGION,
  stateToRegion,
  blendCexSpending,
  quintileFromIncome,
  cexLineItemSpending,
  BLS_CEX_LINE_ITEMS,
  NATIONAL_ALLCU_SPENDING,
  REGION_ALLCU_SPENDING,
  DIVISION_ALLCU_SPENDING,
  NATIONAL_QUINTILE_SPENDING,
} from './cex';
import type { StateCode } from '@/types';

const ALL_STATES: StateCode[] = [
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'DC',
];

describe('STATE_TO_DIVISION', () => {
  it('covers all 51 jurisdictions', () => {
    for (const s of ALL_STATES) {
      expect(STATE_TO_DIVISION[s]).toBeDefined();
    }
    expect(Object.keys(STATE_TO_DIVISION).sort()).toEqual([...ALL_STATES].sort());
  });

  it('places Census Bureau anchor states correctly', () => {
    // Spot-checks against Census Bureau division definitions —
    // https://www.census.gov/programs-surveys/economic-census/guidance-geographies/levels.html#par_textimage_34
    expect(STATE_TO_DIVISION.MA).toBe('New England');
    expect(STATE_TO_DIVISION.NY).toBe('Middle Atlantic');
    expect(STATE_TO_DIVISION.OH).toBe('East North Central');
    expect(STATE_TO_DIVISION.MN).toBe('West North Central');
    expect(STATE_TO_DIVISION.FL).toBe('South Atlantic');
    expect(STATE_TO_DIVISION.DC).toBe('South Atlantic'); // DC is South Atlantic per Census
    expect(STATE_TO_DIVISION.AL).toBe('East South Central');
    expect(STATE_TO_DIVISION.TX).toBe('West South Central');
    expect(STATE_TO_DIVISION.CO).toBe('Mountain');
    expect(STATE_TO_DIVISION.HI).toBe('Pacific');
    expect(STATE_TO_DIVISION.AK).toBe('Pacific');
  });
});

describe('DIVISION_TO_REGION', () => {
  it('covers all 9 divisions exactly once', () => {
    const divisions = new Set(Object.values(STATE_TO_DIVISION));
    for (const d of divisions) {
      expect(DIVISION_TO_REGION[d]).toBeDefined();
    }
    expect(divisions.size).toBe(9);
  });

  it('maps the 9 divisions to the 4 regions consistently', () => {
    expect(DIVISION_TO_REGION['New England']).toBe('Northeast');
    expect(DIVISION_TO_REGION['Middle Atlantic']).toBe('Northeast');
    expect(DIVISION_TO_REGION['East North Central']).toBe('Midwest');
    expect(DIVISION_TO_REGION['West North Central']).toBe('Midwest');
    expect(DIVISION_TO_REGION['South Atlantic']).toBe('South');
    expect(DIVISION_TO_REGION['East South Central']).toBe('South');
    expect(DIVISION_TO_REGION['West South Central']).toBe('South');
    expect(DIVISION_TO_REGION['Mountain']).toBe('West');
    expect(DIVISION_TO_REGION['Pacific']).toBe('West');
  });
});

describe('stateToRegion', () => {
  it('rolls states up through division to region', () => {
    expect(stateToRegion('NY')).toBe('Northeast');
    expect(stateToRegion('CA')).toBe('West');
    expect(stateToRegion('TX')).toBe('South');
    expect(stateToRegion('IL')).toBe('Midwest');
    expect(stateToRegion('DC')).toBe('South');
  });
});

describe('quintileFromIncome (BLS CEX 2024 Table 1101 thresholds)', () => {
  it('places sample incomes in the right quintile', () => {
    // Quintile floors per BLS Table 1101 2024:
    //   q2 ≥ $29,932, q3 ≥ $57,452, q4 ≥ $94,511, q5 ≥ $155,925
    expect(quintileFromIncome(0)).toBe('q1');
    expect(quintileFromIncome(20_000)).toBe('q1');
    expect(quintileFromIncome(40_000)).toBe('q2');
    expect(quintileFromIncome(75_000)).toBe('q3');
    expect(quintileFromIncome(120_000)).toBe('q4');
    expect(quintileFromIncome(200_000)).toBe('q5');
    expect(quintileFromIncome(1_000_000)).toBe('q5');
  });

  it('places income at and around the published quintile floors', () => {
    expect(quintileFromIncome(29_931)).toBe('q1'); // last dollar of q1
    expect(quintileFromIncome(29_932)).toBe('q2'); // q2 floor
    expect(quintileFromIncome(57_451)).toBe('q2');
    expect(quintileFromIncome(57_452)).toBe('q3');
    expect(quintileFromIncome(94_510)).toBe('q3');
    expect(quintileFromIncome(94_511)).toBe('q4');
    expect(quintileFromIncome(155_924)).toBe('q4');
    expect(quintileFromIncome(155_925)).toBe('q5');
  });

  it('floors fractional dollars before bucketing', () => {
    // $29,931.99 should still be q1 (below the published q2 floor of $29,932).
    // Without flooring, the inclusive `<= q1Max` test would fail and the
    // value would slip into q2.
    expect(quintileFromIncome(29_931.99)).toBe('q1');
    expect(quintileFromIncome(29_931.5)).toBe('q1');
    expect(quintileFromIncome(29_932.0)).toBe('q2');
    expect(quintileFromIncome(29_932.99)).toBe('q2');
    expect(quintileFromIncome(155_924.5)).toBe('q4');
    expect(quintileFromIncome(155_925.0)).toBe('q5');
  });
});

describe('blendCexSpending', () => {
  it('computes spending = quintileShape × (geoAllCU / nationalAllCU)', () => {
    // 4th quintile spends 1.14× national avg on this item.
    // Northeast spends 1.12× national avg on this item.
    // Stacked: 4th quintile NE household ≈ 1.27× national avg.
    const out = blendCexSpending({
      nationalAllCU: 3933,
      nationalQuintile: 4469, // q4
      divisionAllCU: undefined,
      regionAllCU: 4400, // Northeast
    });
    expect(out).toBeCloseTo(4469 * (4400 / 3933), 2);
    expect(out).toBeCloseTo(4999.64, 0);
  });

  it('prefers division over region when division is populated', () => {
    const out = blendCexSpending({
      nationalAllCU: 1000,
      nationalQuintile: 1500,
      divisionAllCU: 1200,
      regionAllCU: 1100,
    });
    expect(out).toBeCloseTo(1500 * (1200 / 1000), 6);
  });

  it('falls back to region when division is undefined', () => {
    const out = blendCexSpending({
      nationalAllCU: 1000,
      nationalQuintile: 1500,
      divisionAllCU: undefined,
      regionAllCU: 1100,
    });
    expect(out).toBeCloseTo(1500 * (1100 / 1000), 6);
  });

  it('falls back to region when division is zero (suppressed)', () => {
    const out = blendCexSpending({
      nationalAllCU: 1000,
      nationalQuintile: 1500,
      divisionAllCU: 0,
      regionAllCU: 1100,
    });
    expect(out).toBeCloseTo(1500 * (1100 / 1000), 6);
  });

  it('returns 0 when any required input is zero', () => {
    expect(
      blendCexSpending({
        nationalAllCU: 0,
        nationalQuintile: 1500,
        divisionAllCU: 1200,
        regionAllCU: 1100,
      }),
    ).toBe(0);
    expect(
      blendCexSpending({
        nationalAllCU: 1000,
        nationalQuintile: 0,
        divisionAllCU: 1200,
        regionAllCU: 1100,
      }),
    ).toBe(0);
    expect(
      blendCexSpending({
        nationalAllCU: 1000,
        nationalQuintile: 1500,
        divisionAllCU: undefined,
        regionAllCU: 0,
      }),
    ).toBe(0);
  });
});

describe('NATIONAL_ALLCU_SPENDING (BLS CEX 2023-2024 Table 2700)', () => {
  it('is fully populated for every line item', () => {
    for (const item of BLS_CEX_LINE_ITEMS) {
      expect(NATIONAL_ALLCU_SPENDING[item]).toBeGreaterThan(0);
    }
  });

  it('matches a few known cells from the BLS Table 2700 "All CU" column', () => {
    // Spot-checks against the source xlsx — guard against extraction errors.
    expect(NATIONAL_ALLCU_SPENDING.foodAtHome).toBe(6139);
    expect(NATIONAL_ALLCU_SPENDING.foodAway).toBe(3939);
    expect(NATIONAL_ALLCU_SPENDING.gasoline).toBe(2430);
    expect(NATIONAL_ALLCU_SPENDING.entertainment).toBe(3622);
  });

  it('utilitiesElectricGas equals the documented composite sum', () => {
    // 516 (natural gas) + 1798 (electricity) + 132 (fuel oil) = 2446
    expect(NATIONAL_ALLCU_SPENDING.utilitiesElectricGas).toBe(2446);
  });

  it('healthcareOOP equals the documented composite sum (excludes premium)', () => {
    // 1252 (medical svcs) + 624 (drugs) + 267 (medical supplies) = 2143
    expect(NATIONAL_ALLCU_SPENDING.healthcareOOP).toBe(2143);
  });
});

describe('REGION_ALLCU_SPENDING (BLS CEX 2023-2024 Table 1800)', () => {
  it('is fully populated for every region × line item', () => {
    for (const region of ['Northeast', 'Midwest', 'South', 'West'] as const) {
      for (const item of BLS_CEX_LINE_ITEMS) {
        expect(REGION_ALLCU_SPENDING[region][item]).toBeGreaterThan(0);
      }
    }
  });

  it('reflects the West-region food-away premium over national', () => {
    // West region spends ~20% more on dining out than national average.
    expect(REGION_ALLCU_SPENDING.West.foodAway).toBeGreaterThan(NATIONAL_ALLCU_SPENDING.foodAway);
    // South region spends ~12% less than national on dining out.
    expect(REGION_ALLCU_SPENDING.South.foodAway).toBeLessThan(NATIONAL_ALLCU_SPENDING.foodAway);
  });
});

describe('DIVISION_ALLCU_SPENDING (BLS CEX 2023-2024 Table 2700)', () => {
  // The value type is `Partial<LineItemSpending>` to accommodate future
  // vintages where BLS may suppress a cell for sample-size reasons. The
  // 2023-2024 vintage happens to publish every division × line item we
  // consume — this test pins that completeness for the current data so a
  // future vintage's suppressions become visible (and the
  // `blendCexSpending` region fallback can be exercised intentionally).
  it('is fully populated for every division × line item (2023-2024 vintage)', () => {
    const divisions = [
      'New England',
      'Middle Atlantic',
      'East North Central',
      'West North Central',
      'South Atlantic',
      'East South Central',
      'West South Central',
      'Mountain',
      'Pacific',
    ] as const;
    for (const div of divisions) {
      for (const item of BLS_CEX_LINE_ITEMS) {
        const v = DIVISION_ALLCU_SPENDING[div][item];
        expect(v, `${div} / ${item}`).toBeDefined();
        expect(v!).toBeGreaterThan(0);
      }
    }
  });

  it('shows New England spending more on food at home than its parent Northeast region', () => {
    // Per BLS Table 2700: New England $7530 vs Mid-Atlantic $6839 averaged
    // out to NE region $7029. New England is the higher of the two.
    expect(DIVISION_ALLCU_SPENDING['New England'].foodAtHome!).toBeGreaterThan(
      REGION_ALLCU_SPENDING.Northeast.foodAtHome,
    );
  });
});

describe('NATIONAL_QUINTILE_SPENDING (BLS CEX 2024 Table 1101)', () => {
  const QUINTILES = ['q1', 'q2', 'q3', 'q4', 'q5'] as const;

  it('is fully populated for every quintile × line item', () => {
    for (const q of QUINTILES) {
      for (const item of BLS_CEX_LINE_ITEMS) {
        expect(NATIONAL_QUINTILE_SPENDING[q][item], `${q} / ${item}`).toBeGreaterThan(0);
      }
    }
  });

  it('matches a few known cells from BLS Table 1101', () => {
    expect(NATIONAL_QUINTILE_SPENDING.q1.foodAtHome).toBe(3843);
    expect(NATIONAL_QUINTILE_SPENDING.q5.foodAway).toBe(7652);
    expect(NATIONAL_QUINTILE_SPENDING.q3.gasoline).toBe(2442);
    expect(NATIONAL_QUINTILE_SPENDING.q4.entertainment).toBe(4133);
  });

  it('shows monotonic increase with quintile for income-elastic categories', () => {
    // Food away, apparel, entertainment, dining — all spend more as income rises.
    for (const item of ['foodAway', 'apparel', 'entertainment', 'foodAtHome'] as const) {
      const series = QUINTILES.map((q) => NATIONAL_QUINTILE_SPENDING[q][item]);
      for (let i = 0; i < series.length - 1; i++) {
        expect(series[i]).toBeLessThan(series[i + 1]);
      }
    }
  });

  it('education is non-monotonic (q1 > q2) — known BLS quirk', () => {
    // q1 includes full-time students living off loans/family who spend on
    // tuition; q2 is mostly working-poor without college spend. Pin this
    // so a future vintage shift is visible rather than silent.
    expect(NATIONAL_QUINTILE_SPENDING.q1.education).toBeGreaterThan(
      NATIONAL_QUINTILE_SPENDING.q2.education,
    );
  });

  it('q5 spends more than 2× q1 on most line items (income elasticity)', () => {
    // Sanity check that the top quintile's lifestyle is meaningfully
    // different from the bottom — guards against accidental copy-paste.
    let count = 0;
    for (const item of BLS_CEX_LINE_ITEMS) {
      if (NATIONAL_QUINTILE_SPENDING.q5[item] > 2 * NATIONAL_QUINTILE_SPENDING.q1[item]) {
        count++;
      }
    }
    expect(count).toBeGreaterThanOrEqual(10); // most of 15 items
  });
});

describe('cexLineItemSpending (end-to-end with real BLS data)', () => {
  it('returns positive non-zero values for every state × quintile × line item', () => {
    for (const item of BLS_CEX_LINE_ITEMS) {
      expect(cexLineItemSpending('NY', 'q3', item), `NY q3 ${item}`).toBeGreaterThan(0);
      expect(cexLineItemSpending('CA', 'q5', item), `CA q5 ${item}`).toBeGreaterThan(0);
      expect(cexLineItemSpending('MS', 'q1', item), `MS q1 ${item}`).toBeGreaterThan(0);
    }
  });

  it('produces income-elastic spending — q5 > q1 in NY for dining out', () => {
    const q1 = cexLineItemSpending('NY', 'q1', 'foodAway');
    const q5 = cexLineItemSpending('NY', 'q5', 'foodAway');
    expect(q5).toBeGreaterThan(q1 * 2);
  });

  it('produces geo variation — same quintile spends more in West than South on dining out', () => {
    // West's geo factor for foodAway is ~1.19; South's is ~0.88.
    const ca = cexLineItemSpending('CA', 'q4', 'foodAway');
    const ms = cexLineItemSpending('MS', 'q4', 'foodAway');
    expect(ca).toBeGreaterThan(ms);
  });

  it('matches a hand-computed worked example for NY q4 foodAway', () => {
    // q4 nationalQuintile.foodAway = 4682
    // NE region geo factor: 4240 / 3939 = 1.07642...
    // Middle Atlantic division geo factor: 4231 / 3939 = 1.07413...
    // NY is in Middle Atlantic, so the division value applies.
    // Expected: 4682 × (4231 / 3939) ≈ 5028.6
    const got = cexLineItemSpending('NY', 'q4', 'foodAway');
    expect(got).toBeCloseTo(4682 * (4231 / 3939), 1);
  });
});
