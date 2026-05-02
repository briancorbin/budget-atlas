import type { BudgetResult } from '@/types';
import { theme as T, fonts } from '@/theme';
import { fmt, fmtSigned, fmtPct } from '@/lib/format';
import { Stat } from './ui';

export function StatRow({ result }: { result: BudgetResult }) {
  const sustainable = result.discretionary >= 0;
  const effRate = result.totalTaxes / result.grossIncome;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 1,
        marginBottom: 32,
        background: T.border,
      }}
    >
      <Stat
        label="Gross / yr"
        value={fmt(result.grossIncome)}
        sub={fmt(result.grossIncome / 12) + '/mo'}
      />
      <Stat
        label="Total taxes"
        value={fmt(result.totalTaxes)}
        sub={fmtPct(effRate) + ' effective'}
      />
      <Stat
        label="Take-home"
        value={fmt(result.netIncome)}
        sub={fmt(result.monthlyNet) + '/mo'}
        accent={T.positive}
      />
      <Stat
        label="Monthly expenses"
        value={fmt(result.totalExpenses)}
        sub={`Household of ${result.householdSize}`}
      />
      <Stat
        label="Discretionary"
        value={fmtSigned(result.discretionary)}
        sub={sustainable ? 'Per month, after needs' : 'Shortfall — unsustainable'}
        accent={sustainable ? T.positive : T.accent}
      />
    </div>
  );
}

export function StatusBanner({ result }: { result: BudgetResult }) {
  const sustainable = result.discretionary >= 0;
  return (
    <div
      style={{
        marginBottom: 36,
        padding: '18px 24px',
        background: sustainable ? '#E8EBDF' : '#F1DBD8',
        borderLeft: `4px solid ${sustainable ? T.positive : T.accent}`,
        fontFamily: fonts.display,
        fontSize: 17,
        lineHeight: 1.5,
      }}
    >
      {sustainable ? (
        <>
          <strong style={{ color: T.positive }}>Sustainable.</strong> After all essentials, this
          household has <strong>{fmt(result.discretionary)}/month</strong> (
          {fmt(result.annualDiscretionary)}/yr) for savings, vacations, retirement, and personal
          spending.
        </>
      ) : (
        <>
          <strong style={{ color: T.accent }}>
            Underwater by {fmt(-result.discretionary)}/mo.
          </strong>{' '}
          Income doesn't cover the assumed cost of essentials in {result.cityData.name}. In reality
          this looks like: roommates, doubling up with family, food assistance (SNAP), Medicaid,
          subsidized childcare, debt — or relocating.
        </>
      )}
    </div>
  );
}
