import type { BudgetResult } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { SectionTitle, Cite } from '@/components/ui';
import {
  QUINTILE_MEANS_2024_BEFORE_TAX,
  QUINTILE_THRESHOLDS_2024,
  REGION_MEAN_HHI_2024_BEFORE_TAX,
  stateToRegion,
} from '@/data/cex';
import { SOURCES } from '@/data/sources';

/**
 * Visual placement of the household's income in the national distribution.
 * Renders a banded thermometer where each band is one BLS income quintile.
 * Bands are equal-width — every quintile contains the same number of US
 * households, so 20% per band matches the conceptual grouping. Within-
 * band position is linear by dollars; Q5 (unbounded above) caps visually
 * at $500K so an extreme high earner pins to the right edge.
 *
 * Source: BLS CEX 2024 Table 1101 (lower limits + quintile means) and
 * Table 1800 (region of residence — mean income before taxes).
 */
export function IncomePosition({ result }: { result: BudgetResult }) {
  const income = result.grossIncome;

  const t = QUINTILE_THRESHOLDS_2024;
  const m = QUINTILE_MEANS_2024_BEFORE_TAX;

  // Equal-width quintile bands: each band is exactly 20% of the bar
  // because each quintile is exactly 20% of US households. The earlier
  // log10 scale put the bar's $0 anchor at position 0 and skewed the
  // bottom four quintiles wide while compressing q5 — visually
  // misleading. Equal-width matches the conceptual grouping (each
  // quintile contains the same number of households) and keeps band
  // labels readable.
  //
  // For Q5 (which is unbounded above), the within-band placement caps
  // at $500K so a $10M income doesn't visually shoot off-band — it
  // pins to the right edge instead.
  const Q5_VISUAL_CEILING = 500_000;
  const bands = [
    { id: 'q1', start: 0, end: t.q1Max + 1, color: '#D9C9A3' },
    { id: 'q2', start: t.q1Max + 1, end: t.q2Max + 1, color: '#C7B57F' },
    { id: 'q3', start: t.q2Max + 1, end: t.q3Max + 1, color: '#A89968' },
    { id: 'q4', start: t.q3Max + 1, end: t.q4Max + 1, color: '#8A7B4F' },
    { id: 'q5', start: t.q4Max + 1, end: Q5_VISUAL_CEILING, color: '#6B5E3A' },
  ];

  // Map any income (or threshold value) to its 0–100% position on the
  // bar. Each band gets exactly 20%; within-band position is linear
  // between band.start and band.end. Above Q5_VISUAL_CEILING clamps to
  // 100%, below $0 clamps to 0%.
  const pos = (x: number): number => {
    if (x <= 0) return 0;
    if (x >= Q5_VISUAL_CEILING) return 100;
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i]!;
      if (x < b.end) {
        const within = (x - b.start) / (b.end - b.start);
        return (i + within) * 20;
      }
    }
    return 100;
  };

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

  // Regional comparison: BLS publishes mean income by Census region but
  // not by state in this table — state-level median HHI lives in Census
  // ACS, which we don't host yet (roadmap follow-up). Use the region
  // average as the closest currently-available comparison.
  const region = stateToRegion(result.cityData.state);
  const regionalMean = REGION_MEAN_HHI_2024_BEFORE_TAX[region];
  const regionAboveOrBelow = income >= regionalMean ? 'above' : 'below';
  const regionDelta = Math.abs(income - regionalMean);

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
            {bands.map((z) => {
              const w = pos(z.end) - pos(z.start);
              return (
                <div
                  key={z.id}
                  style={{
                    width: `${w}%`,
                    background: z.color,
                    position: 'relative',
                  }}
                  title={`${z.id.toUpperCase()}: ${fmt(z.start)} – ${z.id === 'q5' ? `$${Q5_VISUAL_CEILING / 1000}K+` : fmt(z.end - 1)}`}
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

          {/* Regional mean marker (drawn behind the user's marker so the
              user's pin reads on top when they collide). */}
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: `${pos(regionalMean)}%`,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                width: 2,
                height: 32,
                background: T.ink,
                opacity: 0.55,
                margin: '0 auto',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: 36,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: rem(10),
                color: T.inkSoft,
                fontFamily: fonts.body,
                whiteSpace: 'nowrap',
                fontStyle: 'italic',
              }}
            >
              {region} avg
            </div>
          </div>

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
          {fmt(meanForQ)}. The average {region} household earns {fmt(regionalMean)}; this household
          is {fmt(regionDelta)} {regionAboveOrBelow}.
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
          Each band is exactly 20% of the bar — every quintile contains the same number of US
          households, so the bands are equal-width by design. Within-band position is linear by
          dollars (e.g. a $20K income lands ⅔ of the way through Q1). The Q5 visual ceiling is $500K
          so an extreme high earner pins to the right edge instead of shooting off-scale. Quintile
          floors and means from <Cite source={SOURCES['bls-cex-income-quintiles-2024']!} />;
          regional mean from BLS CEX Table 1800 (same source family). State-level median household
          income (Census ACS) would be a finer comparison and is on the roadmap.
        </div>
      </div>
    </div>
  );
}
