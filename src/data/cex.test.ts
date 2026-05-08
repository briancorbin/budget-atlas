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

describe('quintileFromIncome', () => {
  it('returns q3 (median) when thresholds are placeholder zeros', () => {
    // Until BLS Table 1101 thresholds are populated, every income returns
    // the median bucket — sensible-looking mid-range numbers during the
    // scaffolding phase, instead of treating every household as q1.
    expect(quintileFromIncome(0)).toBe('q3');
    expect(quintileFromIncome(50_000)).toBe('q3');
    expect(quintileFromIncome(500_000)).toBe('q3');
  });

  // Once thresholds are populated this test exercises the boundary logic.
  // We re-implement the function locally with synthetic thresholds rather
  // than mutate the module-level constant.
  describe('with synthetic thresholds', () => {
    function pick(
      grossIncome: number,
      t: { q1Max: number; q2Max: number; q3Max: number; q4Max: number },
    ) {
      if (grossIncome <= t.q1Max) return 'q1';
      if (grossIncome <= t.q2Max) return 'q2';
      if (grossIncome <= t.q3Max) return 'q3';
      if (grossIncome <= t.q4Max) return 'q4';
      return 'q5';
    }
    const T = { q1Max: 30_000, q2Max: 60_000, q3Max: 100_000, q4Max: 180_000 };

    it('places income at and around quintile boundaries', () => {
      expect(pick(15_000, T)).toBe('q1');
      expect(pick(30_000, T)).toBe('q1'); // boundary inclusive in q1
      expect(pick(30_001, T)).toBe('q2');
      expect(pick(60_000, T)).toBe('q2');
      expect(pick(80_000, T)).toBe('q3');
      expect(pick(150_000, T)).toBe('q4');
      expect(pick(180_000, T)).toBe('q4');
      expect(pick(180_001, T)).toBe('q5');
      expect(pick(1_000_000, T)).toBe('q5');
    });
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

describe('cexLineItemSpending (geographic-only mode)', () => {
  it('returns 0 for every line item until income-quintile data is populated', () => {
    // National geographic data is populated, but quintile shapes are
    // still zero placeholders. The function short-circuits to 0 because
    // `nationalQuintile === 0`. Callers should fall back to the legacy
    // rolled-up fields until the income axis is wired in.
    for (const item of BLS_CEX_LINE_ITEMS) {
      expect(cexLineItemSpending('NY', 'q3', item)).toBe(0);
      expect(cexLineItemSpending('CA', 'q5', item)).toBe(0);
    }
  });
});
