import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  CartesianGrid,
} from 'recharts';
import type { TooltipContentProps } from 'recharts/types/component/Tooltip';
import type { FilingStatus, Lifestyle } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { computeBudget } from '@/lib/budget';
import { BENEFIT_IDS } from '@/lib/benefits';
import { fpl } from '@/data/poverty';
import {
  MEDICAID_EXPANSION_LIMIT_FPL,
  STATE_CHIP_LIMIT_FPL,
  STATE_MEDICAID_POLICY,
  snapIncomeLimitFpl,
} from '@/data/benefits';
import { getCityData } from '@/data/cities';
import { computePitZones } from '@/lib/cliffs';
import { SectionTitle } from '@/components/ui';

interface SweepPoint {
  gross: number;
  takeHomePlusBenefits: number;
  benefits: number;
}

// Only one view now: take-home pay plus the dollar value of every safety-net
// benefit the household qualifies for (Medicaid, CHIP, SNAP). The total cash
// + in-kind resources reaching the household. We previously offered
// Discretionary and Take-home toggles too, but they cluttered the chrome and
// the cliff story reads cleanly off this single measure: drops are the
// dollar value of programs the household just lost.
const METRIC = {
  longLabel: 'Annual take-home pay + benefit value',
  key: 'takeHomePlusBenefits' as const,
  unitNoun: 'total resources',
} satisfies { longLabel: string; key: keyof SweepPoint; unitNoun: string };

/**
 * Income-sweep view that exposes the discontinuities baked into the safety
 * net. Holds the household configuration constant (city, kids, filing,
 * lifestyle) and varies gross income from $0 to $200K, plotting annual
 * discretionary income at each step. SNAP / Medicaid / CHIP are auto-claimed
 * during the sweep so the eligibility cliffs are visible — at the threshold
 * dollar, eligibility flips from yes to no and the curve drops vertically by
 * the program's annual benefit value.
 *
 * For dual-earner households, the sweep varies incomeA only and holds incomeB
 * fixed. That keeps the X-axis a single household-gross figure that the eye
 * can map back to the existing inputs.
 */
export function CliffCurve({
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
  const cityData = getCityData(city);
  const householdSize = (hasPartner ? 2 : 1) + kids;

  // Measure the chart wrapper so the label-stagger math can convert
  // pixel widths into gross-dollar minSpacing.
  const chartWrapperRef = useRef<HTMLDivElement | null>(null);
  const [chartWidthPx, setChartWidthPx] = useState(640);
  useEffect(() => {
    const el = chartWrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === 'number' && w > 0) setChartWidthPx(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const allBenefits = useMemo<ReadonlySet<string>>(() => new Set(BENEFIT_IDS), []);

  // Single fixed measure: take-home + benefits. See METRIC's docstring above.
  const metricMeta = METRIC;

  const currentGross = incomeA + incomeB;
  // Sweep up to $200K or 1.5× current income, whichever is higher, so the
  // user's dot is always visible with cliff territory still on screen.
  const maxGross = Math.max(200_000, Math.ceil((currentGross * 1.5) / 1000) * 1000);
  const stepCount = 240;
  const stepSize = Math.max(500, Math.round(maxGross / stepCount / 500) * 500);

  // Cliff threshold metadata (excluding stagger labelRow). Computed first
  // so the income-sweep loop can inject sample points exactly at each
  // cliff boundary — see `points` below.
  const cliffsBase = useMemo(() => {
    const fplBase = fpl(householdSize);
    const list: { id: string; shortLabel: string; label: string; gross: number; color: string }[] =
      [];

    list.push({
      id: 'snap',
      shortLabel: 'SNAP',
      label: 'SNAP',
      gross: Math.round(fplBase * snapIncomeLimitFpl(cityData.state)),
      color: T.warning,
    });

    const policy = STATE_MEDICAID_POLICY[cityData.state];
    if (policy.expanded) {
      list.push({
        id: 'medicaid',
        shortLabel: 'Medicaid',
        label: 'Medicaid (138% FPL)',
        gross: Math.round(fplBase * MEDICAID_EXPANSION_LIMIT_FPL),
        color: T.accent,
      });
    } else if (kids > 0 && policy.nonExpansionParentLimit !== undefined) {
      const pct = Math.round(policy.nonExpansionParentLimit * 100);
      list.push({
        id: 'medicaid',
        shortLabel: 'Medicaid parents',
        label: `Medicaid parents (${pct}% FPL)`,
        gross: Math.round(fplBase * policy.nonExpansionParentLimit),
        color: T.accent,
      });
    }

    if (kids > 0) {
      const chipLimit = STATE_CHIP_LIMIT_FPL[cityData.state];
      list.push({
        id: 'chip',
        shortLabel: 'CHIP',
        label: `CHIP (${Math.round(chipLimit * 100)}% FPL)`,
        gross: Math.round(fplBase * chipLimit),
        color: T.aiAccent,
      });
    }

    return list;
  }, [householdSize, cityData.state, kids]);

  const points = useMemo(() => {
    const out: SweepPoint[] = [];
    // The X axis represents household gross income, sweeping from $0 to
    // maxGross. For dual-earner households we preserve the current
    // partner-income ratio at every sweep point — both earners scale
    // together. At g=0 both are 0; at g=current both match their actual
    // values; above, both scale up. This keeps per-person FICA accurate
    // (Social Security has a per-earner wage base cap) and gives a clean
    // curve from $0 — the previous "floor at incomeB" approach started
    // the line mid-chart and read as a bug.
    const totalCurrent = (incomeA || 0) + (incomeB || 0);
    const ratioB = totalCurrent > 0 ? incomeB / totalCurrent : 0;
    // Inject sample points immediately before and after each cliff so
    // linear line interpolation produces near-vertical drops AND the
    // per-cliff caption math reads the actual cliff magnitude rather
    // than a $500-window-smudged drop that mixes in tax/benefit phaseouts.
    const sampleGrosses = new Set<number>();
    for (let g = 0; g <= maxGross; g += stepSize) sampleGrosses.add(g);
    for (const c of cliffsBase) {
      if (c.gross >= 0 && c.gross <= maxGross) {
        sampleGrosses.add(Math.max(0, c.gross - 1));
        sampleGrosses.add(Math.min(maxGross, c.gross + 1));
      }
    }
    const sortedGrosses = [...sampleGrosses].sort((a, b) => a - b);

    for (const g of sortedGrosses) {
      const sweepIncomeB = Math.round(g * ratioB);
      const sweepIncomeA = g - sweepIncomeB;
      const r = computeBudget({
        incomeA: sweepIncomeA,
        incomeB: sweepIncomeB,
        hasPartner,
        filing,
        city,
        kids,
        lifestyle,
        claimedBenefits: allBenefits,
      });
      const annualBenefits = r.totalBenefits * 12;
      out.push({
        gross: g,
        takeHomePlusBenefits: Math.round(r.netIncome + annualBenefits),
        benefits: Math.round(annualBenefits),
      });
    }
    return out;
  }, [
    maxGross,
    stepSize,
    incomeA,
    incomeB,
    hasPartner,
    filing,
    city,
    kids,
    lifestyle,
    allBenefits,
    cliffsBase,
  ]);

  // Stagger the cliffs (assign labelRow per collision check) on top of the
  // base list. Done as a separate memo since it depends on chartWidthPx
  // and we don't want to re-run the (expensive) point sweep when the
  // user resizes the window.
  const cliffs = useMemo(() => {
    // Drop any cliffs the household will never see (e.g. CHIP cutoff above
    // sweep range, or duplicate income points). Sort low-to-high, then
    // assign each cliff a vertical "row" so labels close together on the X
    // axis stagger upward instead of overprinting each other.
    const visible = cliffsBase
      .filter((c) => c.gross > 0 && c.gross <= maxGross)
      .sort((a, b) => a.gross - b.gross);
    // Stagger: each label takes the *lowest* row where it doesn't
    // horizontally overlap any label already placed at that row. Per-
    // label clearance is estimated at ~5.5px per character at the 10px
    // label font size (close enough for the all-caps short labels we
    // ship — Medicaid / SNAP / CHIP), converted to gross-dollar
    // clearance via the measured plot width.
    const plotWidthPx = Math.max(50, chartWidthPx - 56 - 24 - 8);
    const pxPerDollar = plotWidthPx / Math.max(1, maxGross);
    const labelHalfWidthDollars = (label: string) => (label.length * 5.5) / 2 / pxPerDollar;
    const placed: { gross: number; halfWidth: number; row: number }[] = [];
    return visible.map((c) => {
      const halfWidth = labelHalfWidthDollars(c.shortLabel);
      let row = 0;
      while (
        placed.some((p) => p.row === row && Math.abs(p.gross - c.gross) < halfWidth + p.halfWidth)
      ) {
        row += 1;
      }
      placed.push({ gross: c.gross, halfWidth, row });
      return { ...c, labelRow: row };
    });
  }, [cliffsBase, maxGross, chartWidthPx]);

  const userPoint = useMemo(() => {
    if (currentGross < 0 || currentGross > maxGross) return null;
    // Find the nearest swept point so the dot lines up with the actual curve.
    let best = points[0];
    let bestDist = Math.abs(points[0].gross - currentGross);
    for (const p of points) {
      const d = Math.abs(p.gross - currentGross);
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
    }
    return best;
  }, [points, currentGross, maxGross]);

  // Quantify each cliff's drop magnitude AND its recovery income — the
  // lowest income above the cliff where the curve climbs back up to the
  // pre-cliff value. If the curve never recovers within the swept range,
  // recoveryGross is null. Uses whichever metric the user has selected so
  // the caption matches the chart line.
  const cliffDrops = useMemo(() => {
    return cliffs.map((c) => {
      let before = points[0];
      for (const p of points) {
        if (p.gross <= c.gross) before = p;
        else break;
      }
      const after = points.find((p) => p.gross > c.gross) ?? points[points.length - 1];
      const beforeValue = before[metricMeta.key] as number;
      const drop = beforeValue - (after[metricMeta.key] as number);
      let recoveryGross: number | null = null;
      if (drop > 0) {
        for (const p of points) {
          if (p.gross > c.gross && (p[metricMeta.key] as number) >= beforeValue) {
            recoveryGross = p.gross;
            break;
          }
        }
      }
      return { ...c, drop, recoveryGross };
    });
  }, [cliffs, points, metricMeta]);

  // Uniform warning tint per /design-lab#compound V5: every pit zone
  // shaded the same color regardless of which program caused it. Avoids
  // overclaiming attribution when multiple cliffs contribute to a merged
  // pit (the compound case has no single "right" attribution).
  const pitZones = useMemo(
    () => computePitZones(points, metricMeta.key, cliffs),
    [points, metricMeta, cliffs],
  );

  return (
    <div style={{ marginBottom: 48 }}>
      <SectionTitle kicker="The shape of the safety net">
        Where one extra dollar costs you thousands
      </SectionTitle>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '20px 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 16,
            flexWrap: 'wrap',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontFamily: fonts.body,
              fontSize: rem(13),
              color: T.inkSoft,
              lineHeight: 1.5,
              flex: '1 1 280px',
            }}
          >
            Same household in {cityData.name}, {cityData.state} — sweeping gross income from $0 to{' '}
            {fmt(maxGross)}. The curve is smooth where the tax code phases things in gradually. The
            vertical drops are <em>cliffs</em>: a single dollar of additional income disqualifies
            the household from a program entirely.
          </div>
        </div>

        <div ref={chartWrapperRef}>
          <ResponsiveContainer width="100%" height={340}>
            <LineChart
              data={points}
              margin={{
                top: 20 + Math.max(0, ...cliffs.map((c) => c.labelRow)) * 13,
                right: 24,
                left: 8,
                bottom: 16,
              }}
            >
              <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
              <XAxis
                dataKey="gross"
                type="number"
                domain={[0, maxGross]}
                tickFormatter={(v) => `$${Math.round(v / 1000)}K`}
                stroke={T.inkMuted}
                tick={{ fontSize: 11, fontFamily: fonts.mono, fill: T.inkSoft }}
                label={{
                  value: 'Gross household income',
                  position: 'insideBottom',
                  offset: -8,
                  style: {
                    fontSize: 11,
                    fill: T.inkMuted,
                    fontFamily: fonts.body,
                    letterSpacing: '0.1em',
                  },
                }}
              />
              <YAxis
                tickFormatter={(v) => (v === 0 ? '$0' : `$${Math.round(v / 1000)}K`)}
                stroke={T.inkMuted}
                tick={{ fontSize: 11, fontFamily: fonts.mono, fill: T.inkSoft }}
                width={68}
                label={{
                  value: 'Annual take-home + benefit value',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 14,
                  style: {
                    fontSize: 11,
                    fontFamily: fonts.body,
                    fill: T.inkSoft,
                    textAnchor: 'middle',
                  },
                }}
              />
              <Tooltip
                content={(props) => <CliffTooltip {...props} cliffs={cliffs} metric={metricMeta} />}
              />
              {pitZones.map((z, i) => (
                <ReferenceArea
                  key={`pit-${i}`}
                  x1={z.x1}
                  x2={z.x2}
                  fill={T.warning}
                  fillOpacity={0.12}
                  stroke={T.warning}
                  strokeOpacity={0.3}
                  strokeDasharray="2 3"
                />
              ))}
              <ReferenceLine y={0} stroke={T.inkMuted} strokeWidth={1} />
              {cliffs.map((c) => (
                <ReferenceLine
                  key={c.id + c.gross}
                  x={c.gross}
                  stroke={c.color}
                  strokeDasharray="3 3"
                  label={(props: { viewBox?: { x?: number; y?: number } }) => {
                    const x = props.viewBox?.x ?? 0;
                    const y = props.viewBox?.y ?? 0;
                    // Label sits in the chart's top margin; for bumped rows
                    // it's even higher up. The ReferenceLine itself only
                    // draws inside the plot area, so when row > 0 we add a
                    // matching dashed connector from the chart top up to
                    // just below the label so the eye can follow line→label.
                    const labelY = y - 6 - c.labelRow * 13;
                    return (
                      <g>
                        {c.labelRow > 0 && (
                          <line
                            x1={x}
                            x2={x}
                            y1={y}
                            y2={labelY + 2}
                            stroke={c.color}
                            strokeDasharray="3 3"
                            strokeWidth={1}
                          />
                        )}
                        <text
                          x={x}
                          y={labelY}
                          fill={c.color}
                          fontSize={10}
                          fontFamily={fonts.body}
                          textAnchor="middle"
                        >
                          {c.shortLabel}
                        </text>
                      </g>
                    );
                  }}
                />
              ))}
              <Line
                type="linear"
                dataKey={metricMeta.key}
                stroke={T.ink}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {userPoint && (
                <ReferenceDot
                  x={userPoint.gross}
                  y={userPoint[metricMeta.key] as number}
                  r={5}
                  fill={T.positive}
                  stroke={T.bg}
                  strokeWidth={2}
                  ifOverflow="visible"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div
          style={{
            marginTop: 14,
            fontFamily: fonts.body,
            fontSize: rem(12),
            color: T.inkMuted,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <span>
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                background: T.positive,
                borderRadius: '50%',
                marginRight: 6,
                verticalAlign: 'middle',
              }}
            />
            Your current income ({fmt(currentGross)})
          </span>
          {pitZones.length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 10,
                  background: T.warning,
                  opacity: 0.3,
                  border: `1px dashed ${T.warning}`,
                }}
              />
              Worse off than at some lower income
            </span>
          )}
          {cliffs.map((c) => (
            <span key={c.id + c.gross}>
              <span
                style={{
                  display: 'inline-block',
                  width: 14,
                  height: 0,
                  borderTop: `2px dashed ${c.color}`,
                  marginRight: 6,
                  verticalAlign: 'middle',
                }}
              />
              {c.label} cutoff: {fmt(c.gross)}
            </span>
          ))}
        </div>

        {cliffDrops.some((c) => c.drop > 0) && (
          <ul
            style={{
              marginTop: 16,
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {cliffDrops
              .filter((c) => c.drop > 0)
              .map((c) => (
                <li
                  key={c.id + c.gross}
                  style={{
                    fontFamily: fonts.display,
                    fontSize: rem(15),
                    color: T.inkSoft,
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                    paddingLeft: 12,
                    borderLeft: `3px solid ${c.color}`,
                  }}
                >
                  At <strong style={{ color: T.ink, fontStyle: 'normal' }}>{fmt(c.gross)}</strong>,
                  losing <strong style={{ color: T.ink, fontStyle: 'normal' }}>{c.label}</strong>{' '}
                  costs roughly{' '}
                  <strong style={{ color: T.ink, fontStyle: 'normal' }}>{fmt(c.drop)}/yr</strong> in{' '}
                  {metricMeta.unitNoun}.{' '}
                  {c.recoveryGross !== null ? (
                    <>
                      The household isn't back to even until they earn{' '}
                      <strong style={{ color: T.ink, fontStyle: 'normal' }}>
                        {fmt(c.recoveryGross)}
                      </strong>{' '}
                      — a {fmt(c.recoveryGross - c.gross)} raise that nets them nothing.
                    </>
                  ) : (
                    <>
                      The curve doesn't recover within the swept range — the household stays poorer
                      than they were at {fmt(c.gross)} all the way to {fmt(maxGross)}.
                    </>
                  )}
                </li>
              ))}
          </ul>
        )}

        {cliffDrops.some((c) => c.id === 'medicaid' && c.drop > 0) &&
          cliffDrops.some((c) => c.id === 'chip' && c.drop > 0) && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                background: T.bgAlt,
                border: `1px dashed ${T.border}`,
                borderRadius: 4,
                fontFamily: fonts.body,
                fontSize: rem(12),
                color: T.inkSoft,
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: T.ink, fontWeight: 600 }}>
                Note the Medicaid → CHIP handoff.
              </strong>{' '}
              At the Medicaid cutoff, the kids transition to CHIP automatically — so the visible
              Medicaid cliff only reflects the <em>adults'</em> coverage loss, not the full family
              premium. The kids' coverage cliff comes later, at the CHIP cutoff. Together the two
              drops add up to the full family healthcare cost.
            </div>
          )}
      </div>
    </div>
  );
}

function CliffTooltip({
  active,
  payload,
  label,
  cliffs,
  metric,
}: TooltipContentProps & {
  cliffs: { id: string; label: string; gross: number }[];
  metric: typeof METRIC;
}) {
  if (!active || !payload || !payload.length) return null;
  const gross = typeof label === 'number' ? label : Number(label);
  const point = payload[0]?.payload as SweepPoint | undefined;
  if (!point) return null;
  const value = point[metric.key] as number;
  const activePrograms = cliffs.filter((c) => gross <= c.gross);
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: '8px 12px',
        fontFamily: fonts.body,
        fontSize: rem(12),
      }}
    >
      <div style={{ color: T.inkMuted, marginBottom: 2 }}>Gross {fmt(gross)}/yr</div>
      <div style={{ fontFamily: fonts.mono, color: value >= 0 ? T.positive : T.accent }}>
        {fmt(value)}/yr {metric.unitNoun}
      </div>
      {point.benefits > 0 && metric.key !== 'takeHomePlusBenefits' && (
        <div style={{ fontFamily: fonts.mono, color: T.inkSoft, marginTop: 2 }}>
          + {fmt(point.benefits)}/yr in benefits
        </div>
      )}
      {activePrograms.length > 0 && (
        <div style={{ color: T.inkMuted, marginTop: 4 }}>
          Eligible: {activePrograms.map((c) => c.id.toUpperCase()).join(', ')}
        </div>
      )}
    </div>
  );
}
