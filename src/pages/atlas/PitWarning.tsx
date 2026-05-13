import { useMemo } from 'react';
import type { FilingStatus, Lifestyle } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { findIncomePit } from '@/lib/cliffs';

const BENEFIT_NAMES: Record<string, string> = {
  snap: 'SNAP',
  medicaid: 'Medicaid',
  chip: 'CHIP',
};

/**
 * Surfaces the cliff-trap directly: when the household's *current* income
 * leaves them with less annual discretionary income than they'd have at
 * some lower income (because of benefit cutoffs they've crossed). Renders
 * nothing when no pit exists.
 */
export function PitWarning({
  city,
  kids,
  filing,
  lifestyle,
  hasPartner,
  incomeA,
  incomeB,
}: {
  city: string;
  kids: number;
  filing: FilingStatus;
  lifestyle: Lifestyle;
  hasPartner: boolean;
  incomeA: number;
  incomeB: number;
}) {
  const pit = useMemo(
    () => findIncomePit({ city, kids, filing, lifestyle, hasPartner, incomeA, incomeB }),
    [city, kids, filing, lifestyle, hasPartner, incomeA, incomeB],
  );

  if (!pit) return null;
  // Only surface the warning when a benefit cutoff actually caused the dip.
  // Without this, modeling artifacts — e.g. crossing a BLS CEX income-quintile
  // boundary, where the spending shape steps up — masquerade as benefits
  // cliffs even for households well past every program threshold.
  if (pit.programsGained.length === 0) return null;

  const programs = pit.programsGained.map((p) => BENEFIT_NAMES[p] ?? p).join(' + ');

  return (
    <div
      role="status"
      style={{
        background: T.surface,
        border: `1px solid ${T.warning}`,
        borderLeft: `4px solid ${T.warning}`,
        padding: '14px 18px',
        marginBottom: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: rem(11),
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.warning,
          fontWeight: 600,
        }}
      >
        ⚠ You're in a benefits cliff
      </div>
      <div style={{ fontFamily: fonts.body, fontSize: rem(14), color: T.ink, lineHeight: 1.5 }}>
        At {fmt(incomeA + incomeB)}/yr, this household has{' '}
        <strong>{fmt(pit.currentResources)}/yr</strong> in take-home + benefit value. At{' '}
        <strong>{fmt(pit.optimalGross)}/yr</strong> — earning roughly{' '}
        {fmt(incomeA + incomeB - pit.optimalGross)} less — they'd have{' '}
        <strong>{fmt(pit.optimalResources)}/yr</strong>, a gain of{' '}
        <strong style={{ color: T.warning }}>{fmt(pit.delta)}/yr</strong>.
      </div>
      {programs && (
        <div style={{ fontFamily: fonts.body, fontSize: rem(13), color: T.inkSoft }}>
          The lower income would qualify them for{' '}
          <strong style={{ color: T.ink }}>{programs}</strong>, more than offsetting the lost
          paycheck.
        </div>
      )}
    </div>
  );
}
