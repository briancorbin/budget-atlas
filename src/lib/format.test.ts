import { describe, expect, it } from 'vitest';
import { fmt, fmtPct, fmtSigned } from '@/lib/format';

// U+2212 MINUS SIGN — typographic correctness, not ASCII hyphen-minus.
const MINUS = '−';

describe('fmt', () => {
  it('formats positive integers with $ and grouping commas', () => {
    expect(fmt(1234)).toBe('$1,234');
    expect(fmt(1_000_000)).toBe('$1,000,000');
  });

  it('rounds to the nearest dollar', () => {
    expect(fmt(1234.4)).toBe('$1,234');
    expect(fmt(1234.6)).toBe('$1,235');
  });

  it('formats zero as $0 (no sign)', () => {
    expect(fmt(0)).toBe('$0');
  });

  it('uses a real minus sign for negatives, not a hyphen', () => {
    expect(fmt(-1234)).toBe(`${MINUS}$1,234`);
  });
});

describe('fmtSigned', () => {
  it('prefixes negatives with the typographic minus; positives get no explicit sign', () => {
    expect(fmtSigned(500)).toBe('$500');
    expect(fmtSigned(-500)).toBe(`${MINUS}$500`);
  });

  it('rounds before formatting', () => {
    expect(fmtSigned(99.6)).toBe('$100');
    expect(fmtSigned(-99.6)).toBe(`${MINUS}$100`);
  });
});

describe('fmtPct', () => {
  it('takes a fraction and renders one decimal', () => {
    expect(fmtPct(0.123)).toBe('12.3%');
    expect(fmtPct(1)).toBe('100.0%');
    expect(fmtPct(0)).toBe('0.0%');
  });
});
