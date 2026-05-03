import type { FilingStatus, Source, StateCode, StateInfo, TaxBracket } from '@/types';
import { SOURCES, STATE_DOR } from './sources';

/**
 * Cross-state aggregator (still used in the page footer as a convenient
 * cross-reference). Per-state authoritative sources live on each StateInfo
 * via `taxSource` and are used in the bracket walkthrough.
 */
export const STATE_TAX_SOURCE: Source = SOURCES['tax-foundation-state-rates'];

export const STATE_MIN_WAGE_SOURCE: Source = SOURCES['ncsl-state-min-wage'];

/**
 * State income tax brackets and standard deductions for tax year 2026
 * (indexed from 2025 actuals where 2026 figures are not yet published).
 *
 * Bracket structure mirrors federal: each entry is [upper bound, marginal
 * rate], terminating with [Infinity, top rate]. State tax is computed by
 * applying `progressiveTax` to (gross income − state std deduction).
 *
 * Sources: each state's department of revenue / taxation (cited on the
 * StateInfo via `taxSource`); Tax Foundation 2026 as an aggregator;
 * NCSL minimum-wage tables. Numbers are rounded to clean values —
 * appropriate for an editorial model, not for filing.
 *
 * Where a state has no standard deduction in reality (NJ, MA, PA, etc.)
 * we use 0; their personal exemptions are small and embedded into the
 * bracket structure here. NYC / Yonkers and county-level Maryland taxes
 * are handled separately as `localTax` on the city, not the state.
 */

const ZERO_STD: Record<FilingStatus, number> = { single: 0, married: 0, head: 0 };

/** No income tax (AK, FL, NV, NH, SD, TN, TX, WA, WY). */
const NO_TAX_BRACKETS: Record<FilingStatus, readonly TaxBracket[]> = (() => {
  const b: readonly TaxBracket[] = [[Infinity, 0]] as const;
  return { single: b, married: b, head: b };
})();

/** Flat-rate state: same single-bracket schedule for all filing statuses. */
function flat(rate: number): Record<FilingStatus, readonly TaxBracket[]> {
  const b: readonly TaxBracket[] = [[Infinity, rate]] as const;
  return { single: b, married: b, head: b };
}

/** Same brackets for all filing statuses (common for many graduated states). */
function uniform(brackets: readonly TaxBracket[]): Record<FilingStatus, readonly TaxBracket[]> {
  return { single: brackets, married: brackets, head: brackets };
}

/** Same std deduction across all filing statuses. */
function singleStd(amount: number): Record<FilingStatus, number> {
  return { single: amount, married: amount, head: amount };
}

export const STATES: Record<StateCode, StateInfo> = {
  // ── No income tax ──────────────────────────────────────────────────────
  AK: {
    name: 'Alaska',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 13.0,
    taxSource: STATE_DOR.AK,
  },
  FL: {
    name: 'Florida',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 14.0,
    taxSource: STATE_DOR.FL,
  },
  NV: {
    name: 'Nevada',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 12.0,
    taxSource: STATE_DOR.NV,
  },
  NH: {
    name: 'New Hampshire',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.NH,
  },
  SD: {
    name: 'South Dakota',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 11.5,
    taxSource: STATE_DOR.SD,
  },
  TN: {
    name: 'Tennessee',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.TN,
  },
  TX: {
    name: 'Texas',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.TX,
  },
  WA: {
    name: 'Washington',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 17.13,
    taxSource: STATE_DOR.WA,
  },
  WY: {
    name: 'Wyoming',
    brackets: NO_TAX_BRACKETS,
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.WY,
  },

  // ── Flat-rate states ───────────────────────────────────────────────────
  AZ: {
    name: 'Arizona',
    brackets: flat(0.025),
    stdDeduction: singleStd(14600),
    min: 15.15,
    taxSource: STATE_DOR.AZ,
  },
  CO: {
    name: 'Colorado',
    brackets: flat(0.044),
    stdDeduction: singleStd(14600),
    min: 15.16,
    taxSource: STATE_DOR.CO,
  },
  GA: {
    name: 'Georgia',
    brackets: flat(0.0539),
    stdDeduction: { single: 12000, married: 24000, head: 12000 },
    min: 7.25,
    taxSource: STATE_DOR.GA,
  },
  IA: {
    name: 'Iowa',
    brackets: flat(0.038),
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.IA,
  },
  ID: {
    name: 'Idaho',
    brackets: flat(0.058),
    stdDeduction: singleStd(14600),
    min: 7.25,
    taxSource: STATE_DOR.ID,
  },
  IL: {
    name: 'Illinois',
    brackets: flat(0.0495),
    stdDeduction: ZERO_STD,
    min: 15.0,
    taxSource: STATE_DOR.IL,
  },
  IN: {
    name: 'Indiana',
    brackets: flat(0.0295),
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.IN,
  },
  KY: {
    name: 'Kentucky',
    brackets: flat(0.035),
    stdDeduction: singleStd(3270),
    min: 7.25,
    taxSource: STATE_DOR.KY,
  },
  LA: {
    name: 'Louisiana',
    brackets: flat(0.03),
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.LA,
  },
  MI: {
    name: 'Michigan',
    brackets: flat(0.0425),
    stdDeduction: ZERO_STD,
    min: 13.73,
    taxSource: STATE_DOR.MI,
  },
  MS: {
    name: 'Mississippi',
    brackets: flat(0.044),
    stdDeduction: { single: 2300, married: 4600, head: 3400 },
    min: 7.25,
    taxSource: STATE_DOR.MS,
  },
  MO: {
    name: 'Missouri',
    brackets: flat(0.047),
    stdDeduction: singleStd(14600),
    min: 13.75,
    taxSource: STATE_DOR.MO,
  },
  NC: {
    name: 'North Carolina',
    brackets: flat(0.0425),
    stdDeduction: { single: 12750, married: 25500, head: 19125 },
    min: 7.25,
    taxSource: STATE_DOR.NC,
  },
  OK: {
    name: 'Oklahoma',
    brackets: flat(0.0475),
    stdDeduction: { single: 6350, married: 12700, head: 9350 },
    min: 7.25,
    taxSource: STATE_DOR.OK,
  },
  PA: {
    name: 'Pennsylvania',
    brackets: flat(0.0307),
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.PA,
  },
  UT: {
    name: 'Utah',
    brackets: flat(0.0465),
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.UT,
  },
  WV: {
    name: 'West Virginia',
    brackets: flat(0.046),
    stdDeduction: ZERO_STD,
    min: 8.75,
    taxSource: STATE_DOR.WV,
  },

  // ── Graduated states ───────────────────────────────────────────────────
  AL: {
    name: 'Alabama',
    brackets: {
      single: [
        [500, 0.02],
        [3000, 0.04],
        [Infinity, 0.05],
      ],
      married: [
        [1000, 0.02],
        [6000, 0.04],
        [Infinity, 0.05],
      ],
      head: [
        [500, 0.02],
        [3000, 0.04],
        [Infinity, 0.05],
      ],
    },
    stdDeduction: { single: 3000, married: 8500, head: 5200 },
    min: 7.25,
    taxSource: STATE_DOR.AL,
  },
  AR: {
    name: 'Arkansas',
    brackets: uniform([
      [5300, 0],
      [10600, 0.02],
      [Infinity, 0.039],
    ]),
    stdDeduction: { single: 2340, married: 4680, head: 2340 },
    min: 11.0,
    taxSource: STATE_DOR.AR,
  },
  CA: {
    name: 'California',
    brackets: {
      single: [
        [10800, 0.01],
        [25500, 0.02],
        [40300, 0.04],
        [55900, 0.06],
        [70650, 0.08],
        [360700, 0.093],
        [432800, 0.103],
        [721400, 0.113],
        [Infinity, 0.123],
      ],
      married: [
        [21600, 0.01],
        [51000, 0.02],
        [80600, 0.04],
        [111800, 0.06],
        [141300, 0.08],
        [721400, 0.093],
        [865600, 0.103],
        [1442800, 0.113],
        [Infinity, 0.123],
      ],
      head: [
        [21650, 0.01],
        [51300, 0.02],
        [66150, 0.04],
        [81850, 0.06],
        [96650, 0.08],
        [493050, 0.093],
        [591650, 0.103],
        [986250, 0.113],
        [Infinity, 0.123],
      ],
    },
    stdDeduction: { single: 5700, married: 11400, head: 11400 },
    min: 16.9,
    taxSource: STATE_DOR.CA,
  },
  CT: {
    name: 'Connecticut',
    brackets: {
      single: [
        [10000, 0.02],
        [50000, 0.045],
        [100000, 0.055],
        [200000, 0.06],
        [250000, 0.065],
        [500000, 0.069],
        [Infinity, 0.0699],
      ],
      married: [
        [20000, 0.02],
        [100000, 0.045],
        [200000, 0.055],
        [400000, 0.06],
        [500000, 0.065],
        [1000000, 0.069],
        [Infinity, 0.0699],
      ],
      head: [
        [16000, 0.02],
        [80000, 0.045],
        [160000, 0.055],
        [320000, 0.06],
        [400000, 0.065],
        [800000, 0.069],
        [Infinity, 0.0699],
      ],
    },
    stdDeduction: ZERO_STD,
    min: 16.94,
    taxSource: STATE_DOR.CT,
  },
  DE: {
    name: 'Delaware',
    brackets: uniform([
      [2000, 0],
      [5000, 0.022],
      [10000, 0.039],
      [20000, 0.048],
      [25000, 0.052],
      [60000, 0.0555],
      [Infinity, 0.066],
    ]),
    stdDeduction: { single: 3250, married: 6500, head: 3250 },
    min: 15.0,
    taxSource: STATE_DOR.DE,
  },
  HI: {
    name: 'Hawaii',
    brackets: {
      single: [
        [2400, 0.014],
        [4800, 0.032],
        [9600, 0.055],
        [14400, 0.064],
        [19200, 0.068],
        [24000, 0.072],
        [36000, 0.076],
        [48000, 0.079],
        [150000, 0.0825],
        [175000, 0.09],
        [200000, 0.1],
        [Infinity, 0.11],
      ],
      married: [
        [4800, 0.014],
        [9600, 0.032],
        [19200, 0.055],
        [28800, 0.064],
        [38400, 0.068],
        [48000, 0.072],
        [72000, 0.076],
        [96000, 0.079],
        [300000, 0.0825],
        [350000, 0.09],
        [400000, 0.1],
        [Infinity, 0.11],
      ],
      head: [
        [3600, 0.014],
        [7200, 0.032],
        [14400, 0.055],
        [21600, 0.064],
        [28800, 0.068],
        [36000, 0.072],
        [54000, 0.076],
        [72000, 0.079],
        [225000, 0.0825],
        [262500, 0.09],
        [300000, 0.1],
        [Infinity, 0.11],
      ],
    },
    stdDeduction: { single: 4400, married: 8800, head: 6424 },
    min: 16.0,
    taxSource: STATE_DOR.HI,
  },
  KS: {
    name: 'Kansas',
    brackets: {
      single: [
        [15000, 0.052],
        [30000, 0.0558],
        [Infinity, 0.057],
      ],
      married: [
        [30000, 0.052],
        [60000, 0.0558],
        [Infinity, 0.057],
      ],
      head: [
        [15000, 0.052],
        [30000, 0.0558],
        [Infinity, 0.057],
      ],
    },
    stdDeduction: { single: 3605, married: 8240, head: 6180 },
    min: 7.25,
    taxSource: STATE_DOR.KS,
  },
  ME: {
    name: 'Maine',
    brackets: {
      single: [
        [26800, 0.058],
        [63450, 0.0675],
        [Infinity, 0.0715],
      ],
      married: [
        [53600, 0.058],
        [126900, 0.0675],
        [Infinity, 0.0715],
      ],
      head: [
        [40200, 0.058],
        [95150, 0.0675],
        [Infinity, 0.0715],
      ],
    },
    stdDeduction: { single: 14600, married: 29200, head: 21900 },
    min: 15.1,
    taxSource: STATE_DOR.ME,
  },
  MD: {
    name: 'Maryland',
    brackets: {
      single: [
        [1000, 0.02],
        [2000, 0.03],
        [3000, 0.04],
        [100000, 0.0475],
        [125000, 0.05],
        [150000, 0.0525],
        [250000, 0.055],
        [Infinity, 0.0575],
      ],
      married: [
        [1000, 0.02],
        [2000, 0.03],
        [3000, 0.04],
        [150000, 0.0475],
        [175000, 0.05],
        [225000, 0.0525],
        [300000, 0.055],
        [Infinity, 0.0575],
      ],
      head: [
        [1000, 0.02],
        [2000, 0.03],
        [3000, 0.04],
        [150000, 0.0475],
        [175000, 0.05],
        [225000, 0.0525],
        [300000, 0.055],
        [Infinity, 0.0575],
      ],
    },
    stdDeduction: { single: 2750, married: 5550, head: 5550 },
    min: 15.0,
    taxSource: STATE_DOR.MD,
  },
  MA: {
    name: 'Massachusetts',
    // Flat 5% with a 4% surtax on income over $1M ("Fair Share" amendment).
    brackets: uniform([
      [1083150, 0.05],
      [Infinity, 0.09],
    ]),
    stdDeduction: ZERO_STD,
    min: 15.0,
    taxSource: STATE_DOR.MA,
  },
  MN: {
    name: 'Minnesota',
    brackets: {
      single: [
        [32570, 0.0535],
        [106990, 0.068],
        [198630, 0.0785],
        [Infinity, 0.0985],
      ],
      married: [
        [47620, 0.0535],
        [189180, 0.068],
        [330410, 0.0785],
        [Infinity, 0.0985],
      ],
      head: [
        [40090, 0.0535],
        [161090, 0.068],
        [264470, 0.0785],
        [Infinity, 0.0985],
      ],
    },
    stdDeduction: { single: 14575, married: 29150, head: 21900 },
    min: 11.13,
    taxSource: STATE_DOR.MN,
  },
  MT: {
    name: 'Montana',
    brackets: {
      single: [
        [20500, 0.047],
        [Infinity, 0.059],
      ],
      married: [
        [41000, 0.047],
        [Infinity, 0.059],
      ],
      head: [
        [30750, 0.047],
        [Infinity, 0.059],
      ],
    },
    stdDeduction: { single: 14600, married: 29200, head: 21900 },
    min: 10.55,
    taxSource: STATE_DOR.MT,
  },
  NE: {
    name: 'Nebraska',
    brackets: {
      single: [
        [3700, 0.0246],
        [22170, 0.0351],
        [35730, 0.0501],
        [Infinity, 0.052],
      ],
      married: [
        [7390, 0.0246],
        [44350, 0.0351],
        [71460, 0.0501],
        [Infinity, 0.052],
      ],
      head: [
        [6860, 0.0246],
        [35310, 0.0351],
        [52640, 0.0501],
        [Infinity, 0.052],
      ],
    },
    stdDeduction: { single: 8350, married: 16700, head: 12250 },
    min: 15.0,
    taxSource: STATE_DOR.NE,
  },
  NJ: {
    name: 'New Jersey',
    brackets: {
      single: [
        [20000, 0.014],
        [35000, 0.0175],
        [40000, 0.035],
        [75000, 0.05525],
        [500000, 0.0637],
        [1000000, 0.0897],
        [Infinity, 0.1075],
      ],
      married: [
        [20000, 0.014],
        [50000, 0.0175],
        [70000, 0.0245],
        [80000, 0.035],
        [150000, 0.05525],
        [500000, 0.0637],
        [1000000, 0.0897],
        [Infinity, 0.1075],
      ],
      head: [
        [20000, 0.014],
        [50000, 0.0175],
        [70000, 0.0245],
        [80000, 0.035],
        [150000, 0.05525],
        [500000, 0.0637],
        [1000000, 0.0897],
        [Infinity, 0.1075],
      ],
    },
    stdDeduction: ZERO_STD,
    min: 15.5,
    taxSource: STATE_DOR.NJ,
  },
  NM: {
    name: 'New Mexico',
    brackets: {
      single: [
        [5500, 0.017],
        [11000, 0.032],
        [16000, 0.047],
        [210000, 0.049],
        [Infinity, 0.059],
      ],
      married: [
        [8000, 0.017],
        [16000, 0.032],
        [24000, 0.047],
        [315000, 0.049],
        [Infinity, 0.059],
      ],
      head: [
        [8000, 0.017],
        [16000, 0.032],
        [24000, 0.047],
        [315000, 0.049],
        [Infinity, 0.059],
      ],
    },
    stdDeduction: { single: 14600, married: 29200, head: 21900 },
    min: 12.0,
    taxSource: STATE_DOR.NM,
  },
  NY: {
    name: 'New York',
    brackets: {
      single: [
        [8500, 0.04],
        [11700, 0.045],
        [13900, 0.0525],
        [80650, 0.055],
        [215400, 0.06],
        [1077550, 0.0685],
        [5000000, 0.0965],
        [25000000, 0.103],
        [Infinity, 0.109],
      ],
      married: [
        [17150, 0.04],
        [23600, 0.045],
        [27900, 0.0525],
        [161550, 0.055],
        [323200, 0.06],
        [2155350, 0.0685],
        [5000000, 0.0965],
        [25000000, 0.103],
        [Infinity, 0.109],
      ],
      head: [
        [12800, 0.04],
        [17650, 0.045],
        [20900, 0.0525],
        [107650, 0.055],
        [269300, 0.06],
        [1616450, 0.0685],
        [5000000, 0.0965],
        [25000000, 0.103],
        [Infinity, 0.109],
      ],
    },
    stdDeduction: { single: 8000, married: 16050, head: 11200 },
    min: 16.5,
    taxSource: STATE_DOR.NY,
  },
  ND: {
    name: 'North Dakota',
    brackets: uniform([
      [44725, 0],
      [225975, 0.0195],
      [Infinity, 0.025],
    ]),
    stdDeduction: ZERO_STD,
    min: 7.25,
    taxSource: STATE_DOR.ND,
  },
  OH: {
    name: 'Ohio',
    brackets: uniform([
      [26050, 0],
      [100000, 0.0275],
      [Infinity, 0.035],
    ]),
    stdDeduction: ZERO_STD,
    min: 10.7,
    taxSource: STATE_DOR.OH,
  },
  OR: {
    name: 'Oregon',
    brackets: {
      single: [
        [4300, 0.0475],
        [10750, 0.0675],
        [125000, 0.0875],
        [Infinity, 0.099],
      ],
      married: [
        [8600, 0.0475],
        [21500, 0.0675],
        [250000, 0.0875],
        [Infinity, 0.099],
      ],
      head: [
        [4300, 0.0475],
        [10750, 0.0675],
        [125000, 0.0875],
        [Infinity, 0.099],
      ],
    },
    stdDeduction: { single: 2800, married: 5600, head: 4500 },
    min: 14.7,
    taxSource: STATE_DOR.OR,
  },
  RI: {
    name: 'Rhode Island',
    brackets: uniform([
      [77450, 0.0375],
      [176050, 0.0475],
      [Infinity, 0.0599],
    ]),
    stdDeduction: { single: 10550, married: 21150, head: 15850 },
    min: 16.0,
    taxSource: STATE_DOR.RI,
  },
  SC: {
    name: 'South Carolina',
    brackets: uniform([
      [3460, 0],
      [17330, 0.03],
      [Infinity, 0.062],
    ]),
    stdDeduction: { single: 14600, married: 29200, head: 21900 },
    min: 7.25,
    taxSource: STATE_DOR.SC,
  },
  VT: {
    name: 'Vermont',
    brackets: {
      single: [
        [45400, 0.0335],
        [110050, 0.066],
        [229550, 0.076],
        [Infinity, 0.0875],
      ],
      married: [
        [75850, 0.0335],
        [183400, 0.066],
        [279450, 0.076],
        [Infinity, 0.0875],
      ],
      head: [
        [60800, 0.0335],
        [157200, 0.066],
        [254500, 0.076],
        [Infinity, 0.0875],
      ],
    },
    stdDeduction: { single: 7400, married: 14800, head: 11050 },
    min: 14.01,
    taxSource: STATE_DOR.VT,
  },
  VA: {
    name: 'Virginia',
    brackets: uniform([
      [3000, 0.02],
      [5000, 0.03],
      [17000, 0.05],
      [Infinity, 0.0575],
    ]),
    stdDeduction: { single: 8500, married: 17000, head: 8500 },
    min: 12.41,
    taxSource: STATE_DOR.VA,
  },
  WI: {
    name: 'Wisconsin',
    brackets: {
      single: [
        [14320, 0.035],
        [28640, 0.044],
        [315310, 0.053],
        [Infinity, 0.0765],
      ],
      married: [
        [19090, 0.035],
        [38190, 0.044],
        [420420, 0.053],
        [Infinity, 0.0765],
      ],
      head: [
        [14320, 0.035],
        [28640, 0.044],
        [315310, 0.053],
        [Infinity, 0.0765],
      ],
    },
    stdDeduction: { single: 13230, married: 24490, head: 17090 },
    min: 7.25,
    taxSource: STATE_DOR.WI,
  },
  DC: {
    name: 'D.C.',
    brackets: uniform([
      [10000, 0.04],
      [40000, 0.06],
      [60000, 0.065],
      [250000, 0.085],
      [500000, 0.0925],
      [1000000, 0.0975],
      [Infinity, 0.1075],
    ]),
    stdDeduction: { single: 14600, married: 29200, head: 21900 },
    min: 17.95,
    taxSource: STATE_DOR.DC,
  },
};

/**
 * For a given filing status, return [lowest non-zero rate, top rate] across
 * the state's brackets. Useful for editorial copy ("CA: 1.0%–12.3%").
 * Returns [0, 0] for no-tax states.
 */
export function bracketRange(brackets: readonly TaxBracket[]): [number, number] {
  if (brackets.length === 0) return [0, 0];
  const top = brackets[brackets.length - 1][1];
  const lowestNonZero = brackets.find(([, r]) => r > 0)?.[1] ?? 0;
  return [lowestNonZero, top];
}
