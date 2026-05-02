import type { BudgetResult } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { theme as T, fonts } from '@/theme';
import { fmt, fmtPct } from '@/lib/format';
import { SectionTitle, CustomTooltip } from './ui';
import { STD_DEDUCTION_2026 } from '@/data/federalTax';

export function IncomeFlow({ result }: { result: BudgetResult }) {
  void STD_DEDUCTION_2026; // for IDE: kept available for inline annotations
  // Bars always grow upward; color encodes kind. A federal "tax" of negative
  // dollars (refundable credits net to a refund) becomes a green bar; a
  // negative take-home (rare — would mean total taxes exceed gross) becomes red.
  const data = [
    { name: 'Gross', value: result.grossIncome / 12, kind: 'gross' },
    {
      name: 'Federal',
      value: Math.abs(result.federalTax) / 12,
      kind: result.federalTax < 0 ? 'refund' : 'tax',
    },
    { name: 'State', value: result.stateTax / 12, kind: 'tax' },
    { name: 'Local', value: result.localTax / 12, kind: 'tax' },
    { name: 'FICA', value: result.fica / 12, kind: 'tax' },
    {
      name: 'Take-home',
      value: Math.abs(result.monthlyNet),
      kind: result.monthlyNet < 0 ? 'deficit' : 'net',
    },
  ] as const;

  const fillFor = (kind: string) =>
    kind === 'gross'
      ? T.ink
      : kind === 'tax'
        ? T.accent
        : kind === 'deficit'
          ? T.accent
          : T.positive; // refund, net

  const effRate = result.totalTaxes / result.grossIncome;

  return (
    <div style={{ marginBottom: 48 }}>
      <SectionTitle kicker="Where every dollar goes — Part I">
        From paycheck to take-home
      </SectionTitle>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '20px 16px' }}>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={[...data]} margin={{ top: 16, right: 16, left: 0, bottom: 8 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fontFamily: fonts.body, fill: T.inkSoft }}
              axisLine={{ stroke: T.border }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: fonts.mono, fill: T.inkMuted }}
              axisLine={{ stroke: T.border }}
              tickLine={false}
              tickFormatter={(v) => '$' + (v / 1000).toFixed(0) + 'k'}
            />
            <Tooltip content={CustomTooltip} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
            <Bar dataKey="value" radius={[2, 2, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={fillFor(entry.kind)} />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                formatter={(v) => fmt(v as number)}
                style={{ fontSize: 11, fontFamily: fonts.mono, fill: T.inkSoft }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: 12,
            marginTop: 20,
            paddingTop: 20,
            borderTop: `1px dashed ${T.border}`,
            fontSize: 13,
          }}
        >
          <Detail label="FEDERAL INCOME TAX" value={fmt(result.federalTax) + '/yr'}>
            {(result.ctc > 0 || result.eitc > 0) && (
              <div style={{ fontSize: 11, color: T.positive, marginTop: 2 }}>
                Credits: {fmt(result.ctc + result.eitc)} {result.eitc > 0 ? '(CTC+EITC)' : '(CTC)'}
              </div>
            )}
          </Detail>
          <Detail label="STATE + LOCAL" value={fmt(result.stateTax + result.localTax) + '/yr'}>
            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
              {result.cityData.state} effective:{' '}
              {fmtPct(result.grossIncome > 0 ? result.stateTax / result.grossIncome : 0)}
            </div>
          </Detail>
          <Detail label="FICA (PAYROLL)" value={fmt(result.fica) + '/yr'}>
            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>
              SS 6.2% + Medicare 1.45%
            </div>
          </Detail>
          <Detail label="EFFECTIVE TAX RATE" value={fmtPct(effRate)}>
            <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 2 }}>Of gross income</div>
          </Detail>
        </div>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ color: T.inkMuted, fontSize: 11, letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 16, color: T.ink }}>{value}</div>
      {children}
    </div>
  );
}
