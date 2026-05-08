import type { BudgetResult } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { SectionTitle, Cite } from '@/components/ui';
import { QUINTILE_MEANS_2024_BEFORE_TAX, QUINTILE_THRESHOLDS_2024 } from '@/data/cex';
import { SOURCES } from '@/data/sources';

/**
 * Visual placement of the household's income in the national distribution.
 * Renders a banded thermometer where each band is one BLS income quintile,
 * the boundary thresholds are labeled, and the user's income sits as a
 * dot. Uses a log scale so q1–q4 don't crush together against the long
 * q5 tail (q5 starts at $156K and stretches indefinitely).
 *
 * Source: BLS CEX 2024 Table 1101 (lower limits + quintile means).
 */
export function IncomePosition({ result }: { result: BudgetResult }) {
  const income = result.grossIncome;
  // Log scale: position(x) = (log(x+1) − log(min+1)) / (log(max+1) − log(min+1))
  // Cap at $500K so the q5 tail doesn't dominate the bar visually — the
  // marker still places correctly above $500K, just clamped to 100%.
  const MIN = 0;
  const MAX = 500_000;
  const pos = (x: number): number => {
    const v = Math.max(MIN, Math.min(MAX, x));
    const num = Math.log10(v + 1) - Math.log10(MIN + 1);
    const den = Math.log10(MAX + 1) - Math.log10(MIN + 1);
    return (num / den) * 100;
  };

  const t = QUINTILE_THRESHOLDS_2024;
  const m = QUINTILE_MEANS_2024_BEFORE_TAX;
  // Quintile zones — start at $0 for q1, end at MAX for q5. We use the
  // *floor* of the next quintile as the visual end of the band; the
  // dotted lines mark the boundaries.
  const zones = [
    { id: 'q1', start: 0, end: t.q1Max + 1, color: '#D9C9A3' },
    { id: 'q2', start: t.q1Max + 1, end: t.q2Max + 1, color: '#C7B57F' },
    { id: 'q3', start: t.q2Max + 1, end: t.q3Max + 1, color: '#A89968' },
    { id: 'q4', start: t.q3Max + 1, end: t.q4Max + 1, color: '#8A7B4F' },
    { id: 'q5', start: t.q4Max + 1, end: MAX, color: '#6B5E3A' },
  ];

  // Where the household lands: which quintile, and how far between the
  // two adjacent quintile means. Uses the same anchor logic as
  // smoothNationalQuintile but reported as a percentile-ish position.
  const quintile = result.incomeQuintile;
  const qLabel: Record<typeof quintile, string> = {
    q1: 'lowest 20%',
    q2: 'second 20%',
    q3: 'middle 20%',
    q4: 'fourth 20%',
    q5: 'highest 20%',
  };
  const meanForQ = m[quintile];
  const aboveOrBelow = income >= meanForQ ? 'above' : 'below';
  const meanDelta = Math.abs(income - meanForQ);

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Where this income sits">Your place in the distribution</SectionTitle>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 24 }}>
        <div
          style={{
            position: 'relative',
            height: 56,
            marginBottom: 28,
            // Pad the inside so labels at the extremes don't clip.
            marginLeft: 4,
            marginRight: 4,
          }}
        >
          {/* The banded bar */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 0,
              right: 0,
              height: 24,
              display: 'flex',
            }}
          >
            {zones.map((z) => {
              const w = pos(z.end) - pos(z.start);
              return (
                <div
                  key={z.id}
                  style={{
                    width: `${w}%`,
                    background: z.color,
                    position: 'relative',
                  }}
                  title={`${z.id.toUpperCase()}: ${fmt(z.start)} – ${z.id === 'q5' ? `$${MAX / 1000}K+` : fmt(z.end - 1)}`}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -16,
                      left: 0,
                      fontSize: rem(10),
                      letterSpacing: '0.12em',
                      color: T.inkSoft,
                      fontFamily: fonts.body,
                    }}
                  >
                    {z.id.toUpperCase()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Boundary tick labels (below the bar). Round to whole-dollar
              kilo for legibility — exact thresholds appear in the body
              caption. */}
          {[t.q1Max + 1, t.q2Max + 1, t.q3Max + 1, t.q4Max + 1].map((x) => (
            <div
              key={x}
              style={{
                position: 'absolute',
                top: 42,
                left: `${pos(x)}%`,
                transform: 'translateX(-50%)',
                fontSize: rem(10),
                color: T.inkMuted,
                fontFamily: fonts.mono,
                whiteSpace: 'nowrap',
              }}
            >
              ${Math.round(x / 1000)}K
            </div>
          ))}

          {/* User's income marker */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: `${pos(income)}%`,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: '7px solid transparent',
                borderRight: '7px solid transparent',
                borderTop: `8px solid ${T.accent}`,
              }}
            />
            <div
              style={{
                width: 2,
                height: 36,
                background: T.accent,
                margin: '0 auto',
              }}
            />
          </div>
          {/* Income label, above the marker */}
          <div
            style={{
              position: 'absolute',
              top: -16,
              left: `${pos(income)}%`,
              transform: 'translateX(-50%)',
              fontSize: rem(11),
              fontFamily: fonts.mono,
              color: T.accent,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {fmt(income)}
          </div>
        </div>

        <div
          style={{
            fontFamily: fonts.body,
            fontSize: rem(14),
            color: T.ink,
            lineHeight: 1.6,
          }}
        >
          {fmt(income)}/yr puts this household in the <strong>{qLabel[quintile]}</strong> of US
          households — {fmt(meanDelta)} {aboveOrBelow} the {quintile.toUpperCase()} mean of{' '}
          {fmt(meanForQ)}.
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: rem(12),
            color: T.inkSoft,
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          Bands shown on a log scale so the bottom four quintiles don't crush against the long
          top-quintile tail. Quintile floors and means from{' '}
          <Cite source={SOURCES['bls-cex-income-quintiles-2024']!} />.
        </div>
      </div>
    </div>
  );
}
