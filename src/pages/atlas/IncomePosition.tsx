import type { BudgetResult } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { SectionTitle, Cite, HoverGloss } from '@/components/ui';
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
  // because each quintile is exactly 20% of US households. Tick labels
  // below mark the dollar boundaries between bands; the bar itself is
  // the only visual divider — there are no separate vertical boundary
  // lines (the band-to-band color shift suffices).
  //
  // For Q5 (which is unbounded above), the within-band placement caps
  // at $500K so a $10M income doesn't visually shoot off-band — it
  // pins to the right edge instead.
  const Q5_VISUAL_CEILING = 500_000;
  const bands = [
    { id: 'q1', start: 0, end: t.q1Max + 1, color: T.quintileScale.q1 },
    { id: 'q2', start: t.q1Max + 1, end: t.q2Max + 1, color: T.quintileScale.q2 },
    { id: 'q3', start: t.q2Max + 1, end: t.q3Max + 1, color: T.quintileScale.q3 },
    { id: 'q4', start: t.q3Max + 1, end: t.q4Max + 1, color: T.quintileScale.q4 },
    { id: 'q5', start: t.q4Max + 1, end: Q5_VISUAL_CEILING, color: T.quintileScale.q5 },
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
        {/*
          Five distinct horizontal lanes, top → bottom:
            y=  0–14:  User income label
            y= 14–22:  User marker (triangle tip touches bar top)
            y= 22–46:  Bar  (band labels Q1–Q5 sit INSIDE the bar in light
                            type so they don't compete with markers above)
            y= 50–62:  Boundary tick labels ($30K / $57K / $95K / $156K)
            y= 70–82:  Regional-avg mini-row: ▲ + "{Region} avg ($X)"
          The user marker is just an arrow — no line through the bar — so
          the band-color shifts read through. Regional avg gets its own
          lane below the tick labels so the two never collide.
        */}
        <div
          style={{
            position: 'relative',
            height: 86,
            marginBottom: 8,
            marginLeft: 4,
            marginRight: 4,
          }}
        >
          {/* The banded bar */}
          <div
            style={{
              position: 'absolute',
              top: 22,
              left: 0,
              right: 0,
              height: 24,
              display: 'flex',
            }}
          >
            {bands.map((z) => {
              const w = pos(z.end) - pos(z.start);
              // Q1/Q2 are light, Q3+ are darker — pick a band-label color
              // that reads on each background.
              const labelColor =
                z.id === 'q1' || z.id === 'q2' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.85)';
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
                      top: 6,
                      left: 6,
                      fontSize: rem(10),
                      letterSpacing: '0.12em',
                      color: labelColor,
                      fontFamily: fonts.body,
                      fontWeight: 600,
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
                top: 50,
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

          {/* User's income marker — arrow only, no line through the bar.
              The triangle tip touches the bar top so the X position is
              unambiguous, and the band color underneath stays visible. */}
          <div
            style={{
              position: 'absolute',
              top: 14,
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
          </div>
          {/* Income label, above the marker */}
          <div
            style={{
              position: 'absolute',
              top: 0,
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

          {/* Regional-avg mini-row in its own lane below the tick labels.
              The ▲ glyph anchors the X position; the label flows to the
              right so it doesn't have to stack above/below. */}
          <div
            style={{
              position: 'absolute',
              top: 70,
              left: `${pos(regionalMean)}%`,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: rem(10),
              color: T.inkSoft,
              fontFamily: fonts.body,
              fontStyle: 'italic',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            <span style={{ transform: 'translateX(-50%)', color: T.ink, opacity: 0.55 }}>▲</span>
            <span>
              {region} avg · {fmt(regionalMean)}
            </span>
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
          {fmt(income)}/yr puts this household in the <strong>{qLabel[quintile]}</strong> of US{' '}
          <HoverGloss
            gloss={
              <>
                BLS surveys <strong>consumer units</strong> — people who share major expenses.
                Roughly the same as a household (a married couple = one CU = one household), with
                edge cases: unrelated roommates with separate finances count as separate CUs even in
                one address. ~135.8M CUs in the 2024 sample.
              </>
            }
          >
            households
          </HoverGloss>{' '}
          — {fmt(meanDelta)} {aboveOrBelow} the {quintile.toUpperCase()} mean of {fmt(meanForQ)}.
          The average {region} household earns {fmt(regionalMean)}; this household is{' '}
          {fmt(regionDelta)} {regionAboveOrBelow}.
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
          regional mean from <Cite source={SOURCES['bls-cex-region-2024']!} />. State-level median
          household income (Census ACS) would be a finer comparison and is on the roadmap.
        </div>
      </div>
    </div>
  );
}
