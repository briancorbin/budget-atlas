import type { BudgetResult } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { SectionTitle } from '@/components/ui';

export function DiscretionaryPlan({ result }: { result: BudgetResult }) {
  if (result.discretionary < 0) return null;

  const cards: {
    label: string;
    value: number;
    color: string;
    sub: React.ReactNode;
  }[] = [
    {
      label: 'SAVINGS / RETIREMENT',
      value: result.suggestedSavings,
      color: T.positive,
      sub: (
        <>
          {fmt(result.suggestedSavings * 12)}/yr. At 7% real return, ~
          {fmt(result.suggestedSavings * 12 * 47.6)} in 25 yrs.
        </>
      ),
    },
    {
      label: 'VACATION',
      value: result.suggestedVacation,
      color: T.warning,
      sub: (
        <>
          {fmt(result.suggestedVacation * 12)}/yr.{' '}
          {result.suggestedVacation * 12 < 1500
            ? 'Camping or short trips.'
            : result.suggestedVacation * 12 < 4000
              ? '1 modest week away.'
              : result.suggestedVacation * 12 < 10000
                ? '2 weeks domestic.'
                : 'International travel possible.'}
        </>
      ),
    },
    {
      label: 'SPLURGE / DINING',
      value: result.suggestedSplurge,
      color: '#8A4A6E',
      sub: <>Restaurants, hobbies, gifts, gear, the occasional indulgence.</>,
    },
    {
      label: 'EMERGENCY BUFFER',
      value: result.suggestedEmergency,
      color: T.accent,
      sub: <>Builds a 3–6 month fund. Ideal target: {fmt(result.totalExpenses * 4)}.</>,
    },
  ];

  return (
    <div style={{ marginBottom: 48 }}>
      <SectionTitle kicker="What the surplus could become">
        The future, the trip, the splurge
      </SectionTitle>
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 24 }}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: rem(16),
            color: T.inkSoft,
            marginBottom: 20,
            lineHeight: 1.5,
            fontStyle: 'italic',
          }}
        >
          Suggested allocation of the {fmt(result.discretionary)}/mo surplus that's left after
          essentials AND the modeled lifestyle (dining out, entertainment, etc. — already a
          {fmt(result.lifestyleExpenses)}/mo line). Rough 50 / 20 / 20 / 10 split (savings ·
          vacation · splurge · emergency cushion).
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {cards.map((c) => (
            <div
              key={c.label}
              style={{
                padding: 20,
                background: T.bg,
                borderTop: `3px solid ${c.color}`,
              }}
            >
              <div
                style={{
                  fontSize: rem(11),
                  color: T.inkMuted,
                  letterSpacing: '0.12em',
                  marginBottom: 6,
                }}
              >
                {c.label}
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: rem(22), color: T.ink }}>
                {fmt(c.value)}/mo
              </div>
              <div style={{ fontSize: rem(12), color: T.inkSoft, marginTop: 8, lineHeight: 1.5 }}>
                {c.sub}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
