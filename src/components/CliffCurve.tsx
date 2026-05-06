import { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
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
import { SectionTitle } from './ui';

type MetricId = 'discretionary' | 'takeHome' | 'takeHomePlusBenefits';

interface SweepPoint {
  gross: number;
  discretionary: number;
  takeHome: number;
  takeHomePlusBenefits: number;
  benefits: number;
}

const METRICS: Record<MetricId, { label: string; longLabel: string; key: keyof SweepPoint; unitNoun: string }> = {
  discretionary: {
    label: 'Discretionary',
    longLabel: 'Annual discretionary income',
    key: 'discretionary',
    unitNoun: 'discretionary',
  },
  takeHome: {
    label: 'Take-home',
    longLabel: 'Annual take-home pay (net of taxes)',
    key: 'takeHome',
    unitNoun: 'take-home',
  },
  takeHomePlusBenefits: {
    label: 'Take-home + benefits',
    longLabel: 'Annual take-home pay + benefit value',
    key: 'takeHomePlusBenefits',
    unitNoun: 'total resources',
  },
};

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
  const allBenefits = useMemo<ReadonlySet<string>>(() => new Set(BENEFIT_IDS), []);

  // Which financial measure to plot on the Y axis. Discretionary is the most
  // editorial (what's actually left over after expenses), but it muddies
  // the cliff visually because some lost benefits — Medicaid in particular
  // — also raise the household's healthcare expense, partially offsetting
  // the take-home drop. Take-home and total-resources views isolate the
  // pure cash impact.
  const [metric, setMetric] = useState<MetricId>('discretionary');
  const metricMeta = METRICS[metric];

  const currentGross = incomeA + incomeB;
  // Sweep up to $200K or 1.5× current income, whichever is higher, so the
  // user's dot is always visible with cliff territory still on screen.
  const maxGross = Math.max(200_000, Math.ceil((currentGross * 1.5) / 1000) * 1000);
  const stepCount = 240;
  const stepSize = Math.max(500, Math.round(maxGross / stepCount / 500) * 500);

  const points = useMemo(() => {
    const out: SweepPoint[] = [];
    for (let g = 0; g <= maxGross; g += stepSize) {
      const sweepIncomeA = Math.max(0, g - incomeB);
      const r = computeBudget({
        incomeA: sweepIncomeA,
        incomeB,
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
        discretionary: Math.round(r.annualDiscretionary),
        takeHome: Math.round(r.netIncome),
        takeHomePlusBenefits: Math.round(r.netIncome + annualBenefits),
        benefits: Math.round(annualBenefits),
      });
    }
    return out;
  }, [maxGross, stepSize, incomeB, hasPartner, filing, city, kids, lifestyle, allBenefits]);

  // Cliff thresholds — annual gross income at which each program's
  // eligibility flips off. Computed from FPL × the program's multiplier
  // for this household size and state.
  const cliffs = useMemo(() => {
    const fplBase = fpl(householdSize);
    const list: { id: string; label: string; gross: number; color: string }[] = [];

    list.push({
      id: 'snap',
      label: 'SNAP',
      gross: Math.round(fplBase * snapIncomeLimitFpl(cityData.state)),
      color: T.warning,
    });

    const policy = STATE_MEDICAID_POLICY[cityData.state];
    if (policy.expanded) {
      list.push({
        id: 'medicaid',
        label: 'Medicaid (138% FPL)',
        gross: Math.round(fplBase * MEDICAID_EXPANSION_LIMIT_FPL),
        color: T.accent,
      });
    } else if (kids > 0 && policy.nonExpansionParentLimit !== undefined) {
      const pct = Math.round(policy.nonExpansionParentLimit * 100);
      list.push({
        id: 'medicaid',
        label: `Medicaid parents (${pct}% FPL)`,
        gross: Math.round(fplBase * policy.nonExpansionParentLimit),
        color: T.accent,
      });
    }

    if (kids > 0) {
      const chipLimit = STATE_CHIP_LIMIT_FPL[cityData.state];
      list.push({
        id: 'chip',
        label: `CHIP (${Math.round(chipLimit * 100)}% FPL)`,
        gross: Math.round(fplBase * chipLimit),
        color: T.aiAccent,
      });
    }

    // Drop any cliffs the household will never see (e.g. CHIP cutoff above
    // sweep range, or duplicate income points). Sort low-to-high, then
    // assign each cliff a vertical "row" so labels close together on the X
    // axis stagger upward instead of overprinting each other.
    const visible = list
      .filter((c) => c.gross > 0 && c.gross <= maxGross)
      .sort((a, b) => a.gross - b.gross);
    // Stagger: each label takes the *lowest* row where it doesn't
    // horizontally overlap any label already placed at that row. So three
    // close-together labels go (0, 1, 2), but if the third one is actually
    // far enough from the first, it drops back to row 0 instead of
    // climbing forever. Two labels far apart both stay at row 0.
    const minSpacing = maxGross * 0.1;
    const placed: { gross: number; row: number }[] = [];
    return visible.map((c) => {
      let row = 0;
      while (placed.some((p) => p.row === row && Math.abs(p.gross - c.gross) < minSpacing)) {
        row += 1;
      }
      placed.push({ gross: c.gross, row });
      return { ...c, labelRow: row };
    });
  }, [householdSize, cityData.state, kids, maxGross]);

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

  // Quantify each cliff's drop magnitude — useful for the editorial caption.
  // Uses whichever metric the user has selected so the caption matches the
  // chart line.
  const cliffDrops = useMemo(() => {
    return cliffs.map((c) => {
      let before = points[0];
      for (const p of points) {
        if (p.gross <= c.gross) before = p;
        else break;
      }
      const after = points.find((p) => p.gross > c.gross) ?? points[points.length - 1];
      const drop = (before[metricMeta.key] as number) - (after[metricMeta.key] as number);
      return { ...c, drop };
    });
  }, [cliffs, points, metricMeta]);

  const biggestCliff = cliffDrops.reduce<(typeof cliffDrops)[number] | null>(
    (max, c) => (c.drop > (max?.drop ?? 0) ? c : max),
    null,
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
            {fmt(maxGross)}. The curve is smooth where the tax code phases things in gradually.
            The vertical drops are <em>cliffs</em>: a single dollar of additional income
            disqualifies the household from a program entirely.
          </div>
          <MetricToggle metric={metric} onChange={setMetric} />
        </div>

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
              width={56}
            />
            <Tooltip
              content={(props) => (
                <CliffTooltip {...props} cliffs={cliffs} metric={metricMeta} />
              )}
            />
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
                  return (
                    <text
                      x={x}
                      y={y - 6 - c.labelRow * 13}
                      fill={c.color}
                      fontSize={10}
                      fontFamily={fonts.body}
                      textAnchor="middle"
                    >
                      {c.label}
                    </text>
                  );
                }}
              />
            ))}
            <Line
              type="monotone"
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

        {biggestCliff && biggestCliff.drop > 0 && (
          <div
            style={{
              marginTop: 16,
              fontFamily: fonts.display,
              fontSize: rem(16),
              color: T.inkSoft,
              fontStyle: 'italic',
              lineHeight: 1.5,
            }}
          >
            At {fmt(biggestCliff.gross)} of gross income, earning one more dollar costs this
            household roughly {fmt(biggestCliff.drop)} a year in {metricMeta.unitNoun} — the value
            of the {biggestCliff.label} coverage they no longer qualify for. A raise of less than
            that leaves them poorer than before.
          </div>
        )}
      </div>
    </div>
  );
}

function MetricToggle({
  metric,
  onChange,
}: {
  metric: MetricId;
  onChange: (m: MetricId) => void;
}) {
  return (
    <div role="group" aria-label="Metric to plot" style={{ display: 'inline-flex', gap: 0 }}>
      {(Object.keys(METRICS) as MetricId[]).map((id, i) => {
        const isActive = metric === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={isActive}
            style={{
              fontFamily: fonts.body,
              fontSize: rem(11),
              letterSpacing: '0.04em',
              padding: '6px 10px',
              border: `1px solid ${isActive ? T.ink : T.border}`,
              borderLeftWidth: i === 0 ? 1 : 0,
              background: isActive ? T.ink : T.bg,
              color: isActive ? T.bg : T.inkSoft,
              cursor: 'pointer',
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
            }}
          >
            {METRICS[id].label}
          </button>
        );
      })}
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
  metric: (typeof METRICS)[MetricId];
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
