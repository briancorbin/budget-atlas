import type { BudgetResult } from '@/types';
import { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { theme as T, fonts, PIE_COLORS, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { SectionTitle } from '@/components/ui';

/**
 * Rollup definitions. Each rollup is a high-level category visible in the
 * pie + the top-line list; clicking a rollup row reveals the constituent
 * lines that come from `result.expenses`. Order is essentials first
 * (sectioned), then mixed, then lifestyle — `kind` drives both badges
 * and section grouping.
 *
 * Keys in `lines` must match the keys produced by `computeBudget` in
 * `result.expenses`. Lines that come back as 0 (e.g. Childcare for a
 * household with no kids, Education when not modeled) are dropped at
 * render time so they don't clutter the drill-down.
 */
type RollupKind = 'essential' | 'mixed' | 'lifestyle';
interface RollupDef {
  id: string;
  label: string;
  kind: RollupKind;
  lines: readonly string[];
}

const ROLLUPS: readonly RollupDef[] = [
  { id: 'housing', label: 'Housing', kind: 'essential', lines: ['Housing'] },
  {
    id: 'bills',
    label: 'Bills & home upkeep',
    kind: 'essential',
    lines: ['Utilities', 'Phone & Internet', 'Insurance', 'Housekeeping Supplies'],
  },
  { id: 'healthcare', label: 'Healthcare', kind: 'essential', lines: ['Healthcare'] },
  {
    id: 'family-care',
    label: 'Childcare & education',
    kind: 'essential',
    lines: ['Childcare', 'Education'],
  },
  // Food and Transportation are "mixed": each bundles an essential
  // portion (food at home / transit + gasoline + vehicle upkeep) with
  // a lifestyle portion (dining out / vehicle upgrades). Drill-down
  // reveals the split.
  { id: 'food', label: 'Food', kind: 'mixed', lines: ['Food at home', 'Food away'] },
  {
    id: 'transport',
    label: 'Transportation',
    kind: 'mixed',
    // Transit / Gasoline / Vehicle keys are conditionally present based
    // on whether the household uses transit (childless transit-city) or
    // a car. The renderer drops zero-value lines, so listing all four
    // here is safe — only the populated ones appear.
    lines: ['Transit', 'Gasoline', 'Vehicle (insurance & maint.)', 'Vehicle (purchase)'],
  },
  {
    id: 'lifestyle',
    label: 'Personal & lifestyle',
    kind: 'lifestyle',
    lines: ['Apparel', 'Entertainment', 'Personal Care', 'Household Operations', 'Furnishings'],
  },
];

const KIND_LABEL: Record<RollupKind, string> = {
  essential: 'Essential',
  mixed: 'Mixed',
  lifestyle: 'Lifestyle',
};

const SECTION_ORDER: readonly RollupKind[] = ['essential', 'mixed', 'lifestyle'];
const SECTION_HEADER: Record<RollupKind, { label: string; description: string }> = {
  essential: {
    label: 'Essentials',
    description: 'Baseline cost of running this household.',
  },
  mixed: {
    label: 'Mixed',
    description: 'Each line bundles an essential portion with a lifestyle portion.',
  },
  lifestyle: {
    label: 'Lifestyle',
    description: 'Spending the household could step down — already part of how this CU lives.',
  },
};

interface RollupRow {
  def: RollupDef;
  total: number;
  lines: { label: string; value: number }[];
  color: string;
}

export function ExpenseBreakdown({ result }: { result: BudgetResult }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Hover state for the pie. Drives the dynamic center label so we
  // don't need a separate floating tooltip — the center is the
  // tooltip, no fly-in animation, no collision with the static
  // "TOTAL / MO" text.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Build rollup rows from result.expenses.
  const rows: RollupRow[] = ROLLUPS.map((def, i) => {
    const lines = def.lines
      .map((label) => ({ label, value: result.expenses[label] ?? 0 }))
      .filter((l) => l.value > 0);
    const total = lines.reduce((s, l) => s + l.value, 0);
    return { def, total, lines, color: PIE_COLORS[i % PIE_COLORS.length]! };
  }).filter((r) => r.total > 0);

  return (
    <div style={{ marginBottom: 48 }}>
      <SectionTitle kicker="Where every dollar goes — Part II">Monthly cost of living</SectionTitle>

      <div
        style={{
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          marginBottom: 16,
          fontFamily: fonts.body,
          fontSize: rem(13),
          color: T.inkSoft,
        }}
      >
        <div>
          <strong style={{ color: T.ink }}>Essentials:</strong>{' '}
          <span style={{ fontFamily: fonts.mono }}>{fmt(result.essentialExpenses)}/mo</span>
        </div>
        <div>
          <strong style={{ color: T.ink }}>Lifestyle:</strong>{' '}
          <span style={{ fontFamily: fonts.mono }}>{fmt(result.lifestyleExpenses)}/mo</span>
        </div>
        <div>
          <strong style={{ color: T.ink }}>Total:</strong>{' '}
          <span style={{ fontFamily: fonts.mono }}>{fmt(result.totalExpenses)}/mo</span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Pie — now 7 slices instead of 15, much more readable */}
        <div
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ position: 'relative', width: '100%', height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows.map((r) => ({ id: r.def.id, name: r.def.label, value: r.total }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  isAnimationActive={false}
                  // Recharts types the data callback as PieSectorDataItem,
                  // but the slice's underlying data object (with our `id`
                  // field) is passed through under `payload` at runtime.
                  onMouseEnter={(_, index) => setHoveredId(rows[index]?.def.id ?? null)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {rows.map((r) => (
                    <Cell key={r.def.id} fill={r.color} stroke={T.surface} strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {(() => {
              // Center "tooltip": shows the hovered slice's name + value
              // when one's hovered, otherwise the running total. Replaces
              // the floating Recharts tooltip — no fly-in animation, no
              // collision, always positioned in the donut hole.
              const hovered = hoveredId ? rows.find((r) => r.def.id === hoveredId) : null;
              return (
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    textAlign: 'center',
                    width: 140,
                  }}
                >
                  <div
                    style={{
                      fontSize: rem(11),
                      color: T.inkMuted,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {hovered ? hovered.def.label : 'Total / mo'}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: rem(24),
                      color: hovered ? hovered.color : T.ink,
                      marginTop: 4,
                    }}
                  >
                    {fmt(hovered ? hovered.total : result.totalExpenses)}
                  </div>
                  {hovered && (
                    <div
                      style={{
                        fontSize: rem(10),
                        color: T.inkMuted,
                        marginTop: 4,
                        fontFamily: fonts.mono,
                      }}
                    >
                      {((hovered.total / result.totalExpenses) * 100).toFixed(1)}% of expenses
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Sectioned, expandable list */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {SECTION_ORDER.map((kind, sectionIdx) => {
            const sectionRows = rows.filter((r) => r.def.kind === kind);
            if (sectionRows.length === 0) return null;
            const sectionTotal = sectionRows.reduce((s, r) => s + r.total, 0);
            const header = SECTION_HEADER[kind];
            return (
              <div key={kind}>
                <div
                  style={{
                    padding: '12px 18px',
                    background: T.bg,
                    borderTop: sectionIdx > 0 ? `1px solid ${T.border}` : 'none',
                    borderBottom: `1px solid ${T.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    gap: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: rem(11),
                        letterSpacing: '0.14em',
                        color: T.inkMuted,
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {header.label}
                    </div>
                    <div
                      style={{
                        fontSize: rem(11),
                        color: T.inkSoft,
                        marginTop: 2,
                        fontStyle: 'italic',
                      }}
                    >
                      {header.description}
                    </div>
                  </div>
                  <span style={{ fontFamily: fonts.mono, fontSize: rem(13), color: T.ink }}>
                    {fmt(sectionTotal)}/mo
                  </span>
                </div>
                {sectionRows.map((r, i) => {
                  const pct = r.total / result.totalExpenses;
                  const pctIncome = r.total / result.monthlyNet;
                  const isExpandable = r.lines.length > 1;
                  const isExpanded = expanded.has(r.def.id);
                  return (
                    <div
                      key={r.def.id}
                      style={{
                        borderBottom: i < sectionRows.length - 1 ? `1px solid ${T.border}` : 'none',
                      }}
                    >
                      <button
                        type="button"
                        onClick={isExpandable ? () => toggle(r.def.id) : undefined}
                        disabled={!isExpandable}
                        aria-expanded={isExpandable ? isExpanded : undefined}
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'left',
                          padding: '14px 18px',
                          background: 'transparent',
                          border: 'none',
                          cursor: isExpandable ? 'pointer' : 'default',
                          fontFamily: 'inherit',
                          color: 'inherit',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            marginBottom: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                background: r.color,
                                display: 'inline-block',
                              }}
                            />
                            <span style={{ fontSize: rem(14), color: T.ink }}>{r.def.label}</span>
                            <span
                              style={{
                                fontSize: rem(10),
                                letterSpacing: '0.1em',
                                textTransform: 'uppercase',
                                color: T.inkMuted,
                                border: `1px solid ${T.border}`,
                                padding: '1px 6px',
                                borderRadius: 2,
                              }}
                            >
                              {KIND_LABEL[r.def.kind]}
                            </span>
                            {isExpandable && (
                              <span
                                aria-hidden="true"
                                style={{
                                  fontSize: rem(11),
                                  color: T.inkMuted,
                                  fontFamily: fonts.mono,
                                }}
                              >
                                {isExpanded ? '▾' : '▸'}
                              </span>
                            )}
                          </div>
                          <span style={{ fontFamily: fonts.mono, fontSize: rem(14), color: T.ink }}>
                            {fmt(r.total)}
                          </span>
                        </div>
                        <div style={{ height: 3, background: T.bgAlt, position: 'relative' }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: `${pct * 100}%`,
                              background: r.color,
                            }}
                          />
                        </div>
                        <div
                          style={{
                            fontSize: rem(11),
                            color: T.inkMuted,
                            marginTop: 4,
                            fontFamily: fonts.mono,
                          }}
                        >
                          {(pct * 100).toFixed(1)}% of expenses · {(pctIncome * 100).toFixed(1)}% of
                          take-home
                        </div>
                      </button>
                      {isExpandable && isExpanded && (
                        <div
                          style={{
                            padding: '6px 18px 14px 36px',
                            background: T.bg,
                            borderTop: `1px solid ${T.border}`,
                          }}
                        >
                          {r.lines
                            .sort((a, b) => b.value - a.value)
                            .map((line) => (
                              <div
                                key={line.label}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  padding: '6px 0',
                                  fontSize: rem(13),
                                  color: T.inkSoft,
                                }}
                              >
                                <span>{line.label}</span>
                                <span style={{ fontFamily: fonts.mono, color: T.ink }}>
                                  {fmt(line.value)}
                                </span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
