import { describe, expect, it } from 'vitest';
import {
  DEFAULTS_V1,
  decodeConfig,
  encodeConfig,
  looksLikeConfigHash,
  type SharedConfig,
} from '@/lib/configShare';

function clone(cfg: SharedConfig): SharedConfig {
  return { ...cfg, claimedBenefits: new Set(cfg.claimedBenefits) };
}

describe('encodeConfig', () => {
  it('emits only the schema version when config matches all defaults', () => {
    expect(encodeConfig(clone(DEFAULTS_V1))).toBe('v=1');
  });

  it('omits keys whose values still match the v=1 default', () => {
    const cfg = clone(DEFAULTS_V1);
    cfg.incomeA = 75_000;
    const params = new URLSearchParams(encodeConfig(cfg));
    expect(params.get('a')).toBe('75000');
    expect(params.has('b')).toBe(false);
    expect(params.has('f')).toBe(false);
  });

  it('encodes claimed benefits as a sorted comma list', () => {
    const cfg = clone(DEFAULTS_V1);
    cfg.claimedBenefits = new Set(['snap', 'medicaid']);
    const params = new URLSearchParams(encodeConfig(cfg));
    expect(params.get('cb')).toBe('medicaid,snap');
  });
});

describe('decodeConfig', () => {
  it('round-trips a fully customized config', () => {
    const original: SharedConfig = {
      incomeA: 125_000,
      incomeB: 0,
      twoIncome: false,
      filing: 'head',
      city: 'sf',
      kids: 1,
      lifestyle: 'comfortable',
      compareCity: 'cmh',
      claimedBenefits: new Set(['chip']),
      overrides: {},
      tenure: 'owner-mortgage',
    };
    const decoded = decodeConfig(encodeConfig(original));
    expect(decoded).toEqual(original);
  });

  it('round-trips per-leaf overrides through the share-link', () => {
    const original: SharedConfig = {
      incomeA: 80_000,
      incomeB: 0,
      twoIncome: false,
      filing: 'single',
      city: 'cmh',
      kids: 0,
      lifestyle: 'moderate',
      compareCity: 'sf',
      claimedBenefits: new Set(),
      tenure: 'renter',
      overrides: {
        Apparel: 50,
        'Food away': 100,
        'Mortgage P&I': 0,
      },
    };
    const decoded = decodeConfig(encodeConfig(original));
    expect(decoded.overrides).toEqual(original.overrides);
  });

  it('round-trips tenure through the share-link', () => {
    const renter = decodeConfig(encodeConfig({ ...DEFAULTS_V1, tenure: 'renter' }));
    expect(renter.tenure).toBe('renter');
    const ownerMortgage = decodeConfig(encodeConfig({ ...DEFAULTS_V1, tenure: 'owner-mortgage' }));
    expect(ownerMortgage.tenure).toBe('owner-mortgage');
    const ownerNoMortgage = decodeConfig(
      encodeConfig({ ...DEFAULTS_V1, tenure: 'owner-no-mortgage' }),
    );
    expect(ownerNoMortgage.tenure).toBe('owner-no-mortgage');
  });

  it('omits tenure param when default (renter)', () => {
    const cfg: SharedConfig = { ...DEFAULTS_V1, tenure: 'renter' };
    const params = new URLSearchParams(encodeConfig(cfg));
    expect(params.has('te')).toBe(false);
  });

  it('omits overrides param when empty', () => {
    const cfg: SharedConfig = {
      incomeA: 50_000,
      incomeB: 0,
      twoIncome: false,
      filing: 'single',
      city: 'cmh',
      kids: 0,
      lifestyle: 'moderate',
      compareCity: 'sf',
      claimedBenefits: new Set(),
      tenure: 'renter',
      overrides: {},
    };
    const params = new URLSearchParams(encodeConfig(cfg));
    expect(params.has('o')).toBe(false);
  });

  it('falls back to defaults for missing keys', () => {
    const decoded = decodeConfig('v=1');
    expect(decoded).toEqual(clone(DEFAULTS_V1));
    // Defensive: decoded set must be a fresh instance, not the frozen default.
    expect(decoded.claimedBenefits).not.toBe(DEFAULTS_V1.claimedBenefits);
  });

  it('ignores unknown filing/lifestyle codes instead of crashing', () => {
    // Crafted hash like `f=toString` would walk Object.prototype if `in` were
    // used instead of Object.hasOwn — and `out.filing` would silently become
    // `Object.prototype.toString`. The guard prevents that; decode should
    // simply leave `filing` at the default.
    const decoded = decodeConfig('v=1&f=toString&l=hasOwnProperty');
    expect(decoded.filing).toBe(DEFAULTS_V1.filing);
    expect(decoded.lifestyle).toBe(DEFAULTS_V1.lifestyle);
  });

  it('drops invalid city ids but keeps valid ones', () => {
    const decoded = decodeConfig('v=1&c=not-a-real-city');
    expect(decoded.city).toBe(DEFAULTS_V1.city);
    const decoded2 = decodeConfig('v=1&c=sf');
    expect(decoded2.city).toBe('sf');
  });

  it('clamps invalid kid counts (negative, non-numeric, too large)', () => {
    expect(decodeConfig('v=1&k=-1').kids).toBe(DEFAULTS_V1.kids);
    expect(decodeConfig('v=1&k=abc').kids).toBe(DEFAULTS_V1.kids);
    expect(decodeConfig('v=1&k=99').kids).toBe(DEFAULTS_V1.kids);
    expect(decodeConfig('v=1&k=4').kids).toBe(4);
  });

  it('strips unknown benefit ids from the cb list', () => {
    const decoded = decodeConfig('v=1&cb=snap,not-a-program,medicaid');
    expect(decoded.claimedBenefits).toEqual(new Set(['snap', 'medicaid']));
  });

  it('accepts a leading # on the payload', () => {
    const decoded = decodeConfig('#v=1&a=42');
    expect(decoded.incomeA).toBe(42);
  });
});

describe('looksLikeConfigHash', () => {
  it('recognizes any of the known config keys', () => {
    expect(looksLikeConfigHash('v=1')).toBe(true);
    expect(looksLikeConfigHash('a=50000')).toBe(true);
    expect(looksLikeConfigHash('#cc=sf')).toBe(true);
  });

  it('rejects empty payloads and unrelated hashes', () => {
    expect(looksLikeConfigHash('')).toBe(false);
    expect(looksLikeConfigHash('#')).toBe(false);
    expect(looksLikeConfigHash('section-name')).toBe(false);
  });
});
