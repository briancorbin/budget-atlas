import type { BudgetResult } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt, fmtSigned, fmtPct } from '@/lib/format';
import { Stat } from '@/components/ui';

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
        label="Essentials / mo"
        value={fmt(result.essentialExpenses)}
        sub="Housing, food at home, utilities, healthcare, childcare, baseline transit"
      />
      <Stat
        label="Lifestyle / mo"
        value={fmt(result.lifestyleExpenses)}
        sub="Dining out, entertainment, vehicle upgrades, apparel"
      />
      <Stat
        label="Surplus / mo"
        value={fmtSigned(result.discretionary)}
        sub={sustainable ? 'After essentials AND lifestyle' : 'Shortfall — unsustainable'}
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
        fontSize: rem(17),
        lineHeight: 1.5,
      }}
    >
      {sustainable ? (
        <>
          <strong style={{ color: T.positive }}>Sustainable.</strong> After essentials, this
          household has <strong>{fmt(result.discretionaryIncome)}/month</strong> of discretionary
          income — of which the modeled lifestyle spends{' '}
          <strong>{fmt(result.lifestyleExpenses)}</strong> (dining out, entertainment, etc.),
          leaving <strong>{fmt(result.discretionary)}/mo</strong> ({fmt(result.annualDiscretionary)}
          /yr) of surplus for savings, vacations, retirement, and the rest.
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
