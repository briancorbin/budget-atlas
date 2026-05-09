import type { BudgetResult } from '@/types';
import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { theme as T, fonts, PIE_COLORS, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { SectionTitle } from '@/components/ui';
import { EXPENSE_SOURCE, type ExpenseSource } from '@/lib/budget';
import type { BLSCEXLineItem } from '@/data/cex';

/**
 * Map detail-view leaf labels to the CEX line item that drives them.
 * Used to surface a per-cell geographic-granularity badge (msa /
 * division / region) next to each CEX-anchored leaf, sourced from
 * `BudgetResult.cexProvenance`. Composite leaves (Utilities) pick the
 * dominant subline for the badge; non-CEX leaves (Housing, Home
 * internet, Renters insurance, Childcare, Mortgage P&I, Property tax,
 * Homeowners insurance, Maintenance & repairs, Transit) get no badge —
 * those are sourced from per-city / per-state hand formulas or
 * commercial / placeholder values, none of which carry a CEX geographic
 * provenance to surface. Healthcare is intentionally omitted because
 * it's a mixed-source leaf (CEX OOP + KFF premium) and a single
 * granularity badge would misrepresent half the line.
 */
const QUINTILE_LABEL: Record<'q1' | 'q2' | 'q3' | 'q4' | 'q5', string> = {
  q1: 'lowest fifth',
  q2: 'second fifth',
  q3: 'middle fifth',
  q4: 'fourth fifth',
  q5: 'top fifth',
};

const LEAF_TO_CEX_ITEM: Readonly<Partial<Record<string, BLSCEXLineItem>>> = {
  Utilities: 'utilitiesElectricGas', // composite — pick electric/gas as the headline subline
  'Cell service': 'cellularService',
  'Life & disability insurance': 'lifeInsurance',
  'Housekeeping Supplies': 'housekeepingSupplies',
  Education: 'education',
  'Food at home': 'foodAtHome',
  'Food away': 'foodAway',
  Alcohol: 'alcohol',
  Gasoline: 'gasoline',
  'Vehicle insurance': 'vehicleInsurance',
  'Vehicle maintenance & repair': 'vehicleMaintRepair',
  'Vehicle (other expenses)': 'vehicleOther',
  'Vehicle (purchase)': 'vehiclePurchase',
  Apparel: 'apparel',
  Entertainment: 'entertainment',
  Pets: 'pets',
  'Personal Care': 'personalCare',
  'Household Operations': 'householdOperations',
  Furnishings: 'furnishings',
  'Travel & lodging': 'otherLodging',
};

const TIER_COLOR: Record<ExpenseSource['tier'], string> = {
  primary: '#5B7C3F', // muted green — primary BLS / agency
  reference: '#A88A40', // muted gold — single-source reference (KFF, EPI, etc.)
  mixed: '#6E7AA8', // muted blue — multi-source combinations (KFF + BLS, etc.)
  commercial: '#7A6B5A', // muted brown — commercial / proprietary
  none: '#B85C5C', // muted red — audit gap, no formal source
};

const TIER_NAME: Record<ExpenseSource['tier'], string> = {
  primary: 'Primary',
  reference: 'Reference',
  mixed: 'Mixed',
  commercial: 'Commercial',
  none: 'No formal source',
};

/**
 * Hover-popover source dot. A small tier-colored dot next to each
 * line label — compact and consistent in width regardless of how
 * long the source name is (a previous text-badge version wrapped
 * under the label for long sources like KFF+BLS, breaking the row
 * alignment). The dot is the trigger; the popover shows the tier
 * name + full source description on hover/focus.
 */
function SourceBadge({ src }: { src: ExpenseSource }) {
  const [open, setOpen] = useState(false);
  // Escape closes the popover, mirroring HoverGloss / Cite for a
  // consistent dismissal across the popover family.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);
  // Stable id wires aria-describedby → tooltip so screen readers
  // reach the description text when the badge is focused.
  const tooltipId = `source-tooltip-${src.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`;
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      aria-label={`Source: ${src.label}`}
      aria-describedby={open ? tooltipId : undefined}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        outline: 'none',
        cursor: 'help',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: TIER_COLOR[src.tier],
          display: 'inline-block',
          opacity: 0.85,
        }}
      />
      {open && (
        <span
          role="tooltip"
          id={tooltipId}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: 0,
            zIndex: 10,
            width: 320,
            maxWidth: '90vw',
            padding: '10px 12px',
            background: T.surface,
            border: `1px solid ${T.border}`,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            fontFamily: fonts.body,
            fontSize: rem(12),
            lineHeight: 1.5,
            color: T.ink,
            whiteSpace: 'normal',
            textTransform: 'none',
            letterSpacing: 0,
          }}
        >
          <div
            style={{
              fontSize: rem(10),
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: TIER_COLOR[src.tier],
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            {TIER_NAME[src.tier]} · {src.label}
          </div>
          <div style={{ color: T.inkSoft }}>{src.description}</div>
        </span>
      )}
    </span>
  );
}

/**
 * Rollup definitions. Each rollup is a high-level category visible in
 * the pie + the top-line summary list. Constituent lines (from
 * `result.expenses`) appear in the separate "Detailed breakdown"
 * disclosure below the summary. Order is essentials first (sectioned),
 * then mixed, then lifestyle — `kind` drives both badges and section
 * grouping.
 *
 * Keys in `lines` must match the keys produced by `computeBudget` in
 * `result.expenses`. Zero-value lines (e.g. Childcare with no kids,
 * Vehicle (purchase) for a transit-city resident) are dropped from
 * the summary pie + top list (so the chart doesn't render empty
 * slices) but kept in the detailed-breakdown panel — Brian's
 * observation that "$0 is useful info" — to show what categories
 * the model considered for this household.
 */
type RollupKind = 'essential' | 'mixed' | 'lifestyle';
interface RollupDef {
  id: string;
  label: string;
  kind: RollupKind;
  lines: readonly string[];
}

const ROLLUPS: readonly RollupDef[] = [
  {
    id: 'housing',
    label: 'Housing',
    kind: 'essential',
    // Tenure-gated: renters see Housing (rent); owners see Mortgage P&I /
    // Property tax / Homeowners insurance / Maintenance. Inapplicable
    // leaves are $0 + filtered from the summary, but kept in the detail
    // panel with an `expenseModelNotes` reason badge.
    lines: [
      'Housing',
      'Mortgage P&I',
      'Property tax',
      'Homeowners insurance',
      'Maintenance & repairs',
    ],
  },
  {
    id: 'bills',
    label: 'Bills & home upkeep',
    kind: 'essential',
    lines: [
      'Utilities',
      'Cell service',
      'Home internet',
      'Renters insurance',
      'Life & disability insurance',
      'Housekeeping Supplies',
    ],
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
  // a lifestyle portion (dining out / alcohol / vehicle upgrades).
  // Drill-down reveals the split.
  { id: 'food', label: 'Food', kind: 'mixed', lines: ['Food at home', 'Food away', 'Alcohol'] },
  {
    id: 'transport',
    label: 'Transportation',
    kind: 'mixed',
    // Transit / Gasoline / Vehicle keys are always present in
    // result.expenses; the model zeros the inapplicable ones for this
    // household type (transit-only households have $0 vehicle keys;
    // car households have $0 transit). The summary list filters $0
    // out; the detail panel keeps them with a "no car modeled" or
    // similar reason badge.
    lines: [
      'Transit',
      'Gasoline',
      'Vehicle insurance',
      'Vehicle maintenance & repair',
      'Vehicle (other expenses)',
      'Vehicle (purchase)',
    ],
  },
  {
    id: 'lifestyle',
    label: 'Personal & lifestyle',
    kind: 'lifestyle',
    lines: [
      'Apparel',
      'Entertainment',
      'Pets',
      'Personal Care',
      'Household Operations',
      'Furnishings',
      'Travel & lodging',
    ],
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
  /**
   * BLS-only model total — sum of each line's `modelValue` (where the
   * model overrode it) or shipped value (where it didn't). Used in
   * the summary card to show the model-vs-shipped comparison
   * inline, mirroring the line-level treatment in the detail panel.
   */
  modelTotal: number;
  /** Distinct reasons across all overridden lines in this rollup. */
  overrideReasons: string[];
  lines: { label: string; value: number }[];
  color: string;
}

export function ExpenseBreakdown({ result }: { result: BudgetResult }) {
  // Detailed breakdown is a separate disclosure below the pie + summary,
  // not an inline expand on each rollup row. Reasons:
  //   - Inline expand made the right column grow, which forced the left
  //     (pie) column to grow too via grid stretch — pie ended up small in
  //     a tall box.
  //   - Mirrors the BracketWalkthrough pattern (single button, opens a
  //     full panel below).
  //   - Gives unlimited room to grow the detail view in future (more
  //     granular sub-lines, percentile context, geo-granularity badges)
  //     without compressing the summary view.
  const [detailOpen, setDetailOpen] = useState(false);
  // Hover state for the pie. Drives the dynamic center label so we
  // don't need a separate floating tooltip — the center is the
  // tooltip, no fly-in animation, no collision with the static
  // "TOTAL / MO" text.
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Build rollup rows from result.expenses. The detailed breakdown
  // shows EVERY line — including ones that came back as $0 for this
  // household (e.g. Childcare with no kids, Education when not modeled).
  // Per Brian: "$0 is useful info — it tells me we considered this
  // category and the household has nothing there." The summary pie +
  // top list still filter to non-zero so the chart doesn't render
  // empty slices and the visual rollup list stays clean.
  const allRows: RollupRow[] = ROLLUPS.map((def, i) => {
    const lines = def.lines.map((label) => ({ label, value: result.expenses[label] ?? 0 }));
    const total = lines.reduce((s, l) => s + l.value, 0);
    const reasons = new Set<string>();
    let modelTotal = 0;
    for (const line of lines) {
      const note = result.expenseModelNotes[line.label];
      if (note) reasons.add(note.reason);
      // When modelValue is null (no BLS counterpart, e.g. Childcare
      // sourced from cityData), fall back to the shipped value — the
      // pure-model total can't include numbers we don't have.
      modelTotal += note?.modelValue ?? line.value;
    }
    return {
      def,
      total,
      modelTotal,
      overrideReasons: Array.from(reasons),
      lines,
      color: PIE_COLORS[i % PIE_COLORS.length]!,
    };
  });
  const rows: RollupRow[] = allRows
    .map((r) => ({ ...r, lines: r.lines.filter((l) => l.value > 0) }))
    .filter((r) => r.total > 0);

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
                  innerRadius={75}
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
                  {hovered && Math.abs(hovered.modelTotal - hovered.total) > 0.5 && (
                    <div
                      style={{
                        fontSize: rem(10),
                        color: T.inkMuted,
                        marginTop: 2,
                        fontFamily: fonts.mono,
                      }}
                    >
                      <span style={{ textDecoration: 'line-through' }}>
                        {fmt(hovered.modelTotal)}
                      </span>{' '}
                      pure model
                    </div>
                  )}
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
                  // monthlyNet can be 0 for unemployed scenarios — guard
                  // against Infinity% / NaN%. Show an em dash when there's
                  // no take-home to compare against.
                  const pctIncome = result.monthlyNet > 0 ? r.total / result.monthlyNet : null;
                  return (
                    <div
                      key={r.def.id}
                      style={{
                        padding: '14px 18px',
                        borderBottom: i < sectionRows.length - 1 ? `1px solid ${T.border}` : 'none',
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
                        </div>
                        <span
                          style={{
                            fontFamily: fonts.mono,
                            fontSize: rem(14),
                            color: T.ink,
                            display: 'inline-flex',
                            alignItems: 'baseline',
                            gap: 6,
                          }}
                        >
                          {Math.abs(r.modelTotal - r.total) > 0.5 && (
                            <>
                              <span style={{ color: T.inkMuted, textDecoration: 'line-through' }}>
                                {fmt(r.modelTotal)}
                              </span>
                              <span style={{ color: T.inkMuted }}>→</span>
                            </>
                          )}
                          <span>{fmt(r.total)}</span>
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
                      {r.overrideReasons.length > 0 && (
                        <div
                          style={{
                            fontSize: rem(11),
                            color: T.inkMuted,
                            fontStyle: 'italic',
                            marginTop: 4,
                          }}
                        >
                          {r.overrideReasons.join(' · ')}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: rem(11),
                          color: T.inkMuted,
                          marginTop: 4,
                          fontFamily: fonts.mono,
                        }}
                      >
                        {(pct * 100).toFixed(1)}% of expenses ·{' '}
                        {pctIncome !== null
                          ? `${(pctIncome * 100).toFixed(1)}% of take-home`
                          : '— of take-home'}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed breakdown disclosure — separate from the pie + summary
          so opening it doesn't resize the chart container. Mirrors the
          BracketWalkthrough toggle pattern. Designed to grow with future
          drill-down depth (geographic-granularity badges, percentile
          context) without ever compressing the summary view above. */}
      <div style={{ marginTop: 16 }}>
        <button
          type="button"
          onClick={() => setDetailOpen((o) => !o)}
          aria-expanded={detailOpen}
          style={{
            fontFamily: fonts.body,
            fontSize: rem(12),
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            padding: '10px 14px',
            background: detailOpen ? T.bgAlt : T.surface,
            border: `1px solid ${T.border}`,
            color: T.ink,
            fontWeight: 600,
          }}
        >
          {detailOpen ? '− Hide' : '+ View'} detailed breakdown
        </button>
        {detailOpen && (
          <div
            style={{
              marginTop: 16,
              background: T.surface,
              border: `1px solid ${T.border}`,
              padding: 24,
            }}
          >
            <div
              style={{
                fontFamily: fonts.body,
                fontSize: rem(13),
                color: T.inkSoft,
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              Every line item that flows into the seven rollups above, sorted by value within each
              rollup. Where the model overrides the BLS value (e.g. transit-only households are
              modeled as carless; no-kids households have no childcare), the BLS-only value appears
              struck through alongside the shipped value with a short reason. One known small
              overlap: BLS's Education line includes a small share of daycare/preschool spending
              (averaged across all CUs), so households with kids in care see a few percent of
              modeled childcare double-counted between Education and Childcare — tracked in{' '}
              <a
                href="https://github.com/TheBudgetAtlas/thebudgetatlas/issues/190"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: T.accent }}
              >
                issue #190
              </a>
              .
            </div>
            {/* Quintile context — the synthetic-blend "where you sit on
                the income axis" anchor for every CEX-derived line below.
                Surfaces what was previously implicit in the model. */}
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'center',
                marginBottom: 16,
                fontSize: rem(11),
                color: T.inkSoft,
                fontFamily: fonts.body,
              }}
            >
              <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Income axis:
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  background: T.bgAlt,
                  border: `1px solid ${T.border}`,
                  borderRadius: 2,
                  fontFamily: fonts.mono,
                }}
              >
                You're in the{' '}
                <strong style={{ color: T.ink }}>{QUINTILE_LABEL[result.incomeQuintile]}</strong> of
                the national income distribution
              </span>
              <span style={{ color: T.inkMuted }}>
                (CEX shape interpolates smoothly between quintile means)
              </span>
            </div>
            {/* Source-tier legend. Each line label below carries a small
                colored dot indicating where its number came from; hover
                a dot for the full source name + description. */}
            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                marginBottom: 16,
                fontSize: rem(11),
                color: T.inkSoft,
                fontFamily: fonts.body,
              }}
            >
              <span style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>Source:</span>
              {/* Only show tiers actually used by the current EXPENSE_SOURCE
                  entries — keeps the legend honest (no dot for "Reference"
                  when no line uses it; dot appears when a future line does). */}
              {(() => {
                const used = new Set<ExpenseSource['tier']>();
                for (const v of Object.values(EXPENSE_SOURCE)) used.add(v.tier);
                const order: ExpenseSource['tier'][] = [
                  'primary',
                  'reference',
                  'mixed',
                  'commercial',
                  'none',
                ];
                return order.filter((t) => used.has(t));
              })().map((tier) => (
                <span key={tier} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: TIER_COLOR[tier],
                      display: 'inline-block',
                    }}
                  />
                  {TIER_NAME[tier]}
                </span>
              ))}
            </div>
            {SECTION_ORDER.map((kind) => {
              const sectionRows = allRows.filter((r) => r.def.kind === kind);
              if (sectionRows.length === 0) return null;
              return (
                <div key={kind} style={{ marginBottom: 24 }}>
                  <div
                    style={{
                      fontSize: rem(11),
                      letterSpacing: '0.14em',
                      color: T.inkMuted,
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      marginBottom: 10,
                      borderBottom: `1px solid ${T.border}`,
                      paddingBottom: 6,
                    }}
                  >
                    {SECTION_HEADER[kind].label}
                  </div>
                  {/* Two-column grid keeps each rollup card narrow so the
                      label and dollar amount sit close together. Cards
                      reflow to one column on narrow viewports. */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                      gap: '8px 32px',
                    }}
                  >
                    {sectionRows.map((r) => (
                      <div key={r.def.id} style={{ marginBottom: 6 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'baseline',
                            gap: 12,
                            marginBottom: 4,
                          }}
                        >
                          <span
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              color: T.ink,
                              minWidth: 0,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                background: r.color,
                                display: 'inline-block',
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ fontWeight: 600, fontSize: rem(13) }}>
                              {r.def.label}
                            </span>
                          </span>
                          <span
                            style={{
                              fontFamily: fonts.mono,
                              fontSize: rem(13),
                              color: T.ink,
                              flexShrink: 0,
                            }}
                          >
                            {fmt(r.total)}
                          </span>
                        </div>
                        {[...r.lines]
                          .sort((a, b) => b.value - a.value)
                          .map((line) => {
                            const note = result.expenseModelNotes[line.label];
                            // The strike+arrow comparison only makes sense
                            // when there's a real BLS number to compare
                            // against. For lines without a BLS counterpart
                            // (Childcare, Transit — sourced from cityData /
                            // Care.com), modelValue is null and we just
                            // show the shipped value with the reason —
                            // no fake "n/a → $0" comparison.
                            const showComparison =
                              !!note &&
                              note.modelValue !== null &&
                              Math.abs(note.modelValue - line.value) > 0.5;
                            return (
                              <div
                                key={line.label}
                                style={{
                                  padding: '3px 0 3px 14px',
                                  fontSize: rem(12),
                                  color: T.inkSoft,
                                }}
                              >
                                <div
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    gap: 12,
                                  }}
                                >
                                  <span
                                    style={{
                                      minWidth: 0,
                                      display: 'inline-flex',
                                      alignItems: 'baseline',
                                      gap: 6,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span>{line.label}</span>
                                    {(() => {
                                      const src = EXPENSE_SOURCE[line.label];
                                      return src ? <SourceBadge src={src} /> : null;
                                    })()}
                                    {(() => {
                                      // Per-cell geo-granularity badge —
                                      // tells the reader whether this line
                                      // resolved to MSA / division / region
                                      // data. Most-specific = MSA (for
                                      // cities BLS publishes separately);
                                      // falls through to division then
                                      // region. See cex.ts blendCexSpending.
                                      const cexItem = LEAF_TO_CEX_ITEM[line.label];
                                      const granularity = cexItem
                                        ? result.cexProvenance[cexItem]
                                        : undefined;
                                      if (!granularity) return null;
                                      const labelByG = {
                                        msa: 'MSA',
                                        division: 'div.',
                                        region: 'region',
                                      } as const;
                                      return (
                                        <span
                                          style={{
                                            fontSize: rem(9),
                                            letterSpacing: '0.06em',
                                            textTransform: 'uppercase',
                                            color: T.inkMuted,
                                            border: `1px solid ${T.border}`,
                                            padding: '0 4px',
                                            borderRadius: 2,
                                          }}
                                          title={`Geographic granularity used for this BLS lookup: ${granularity}. Most-specific = MSA; falls back to division then region.`}
                                        >
                                          {labelByG[granularity]}
                                        </span>
                                      );
                                    })()}
                                  </span>
                                  <span
                                    style={{
                                      fontFamily: fonts.mono,
                                      flexShrink: 0,
                                      display: 'inline-flex',
                                      alignItems: 'baseline',
                                      gap: 6,
                                    }}
                                  >
                                    {showComparison && note.modelValue !== null && (
                                      <>
                                        <span
                                          style={{
                                            color: T.inkMuted,
                                            textDecoration: 'line-through',
                                          }}
                                        >
                                          {fmt(note.modelValue)}
                                        </span>
                                        <span style={{ color: T.inkMuted }}>→</span>
                                      </>
                                    )}
                                    <span style={{ color: T.ink }}>{fmt(line.value)}</span>
                                  </span>
                                </div>
                                {note && (
                                  <div
                                    style={{
                                      fontSize: rem(11),
                                      color: T.inkMuted,
                                      fontStyle: 'italic',
                                      paddingTop: 2,
                                    }}
                                  >
                                    {note.reason}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
