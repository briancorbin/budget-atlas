import type { BudgetResult } from '@/types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { theme as T, fonts, PIE_COLORS } from '@/theme';
import { fmt } from '@/lib/format';
import { SectionTitle, CustomTooltip } from './ui';

export function ExpenseBreakdown({ result }: { result: BudgetResult }) {
  const entries = Object.entries(result.expenses)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ marginBottom: 48 }}>
      <SectionTitle kicker="Where every dollar goes — Part II">Monthly cost of living</SectionTitle>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
        }}
      >
        {/* Pie */}
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
                  data={entries.map(([name, value]) => ({ name, value }))}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                >
                  {entries.map((_, i) => (
                    <Cell
                      key={i}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      stroke={T.surface}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 11, color: T.inkMuted, letterSpacing: '0.1em' }}>
                TOTAL / MO
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: 24, color: T.ink, marginTop: 4 }}>
                {fmt(result.totalExpenses)}
              </div>
            </div>
          </div>
        </div>

        {/* List */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {entries.map(([name, val], i) => {
            const pct = val / result.totalExpenses;
            const pctIncome = val / result.monthlyNet;
            const color = PIE_COLORS[i % PIE_COLORS.length];
            return (
              <div
                key={name}
                style={{
                  padding: '14px 18px',
                  borderBottom: i < entries.length - 1 ? `1px solid ${T.border}` : 'none',
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
                      style={{ width: 8, height: 8, background: color, display: 'inline-block' }}
                    />
                    <span style={{ fontSize: 14, color: T.ink }}>{name}</span>
                  </div>
                  <span style={{ fontFamily: fonts.mono, fontSize: 14, color: T.ink }}>
                    {fmt(val)}
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
                      background: color,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: T.inkMuted,
                    marginTop: 4,
                    fontFamily: fonts.mono,
                  }}
                >
                  {(pct * 100).toFixed(1)}% of expenses · {(pctIncome * 100).toFixed(1)}% of
                  take-home
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
