import type { BudgetResult, FilingStatus, Lifestyle, StateCode } from '@/types';
import { useMemo } from 'react';
import { theme as T, fonts, rem } from '@/theme';
import { fmt, fmtSigned } from '@/lib/format';
import { CITIES, stateSlug } from '@/data/cities';
import { STATES } from '@/data/states';
import { computeBudget } from '@/lib/budget';
import { SearchableSelect, SectionTitle, type SearchableOption } from '@/components/ui';

export function CityComparison({
  result,
  compareCity,
  setCompareCity,
  incomeA,
  incomeB,
  hasPartner,
  filing,
  kids,
  lifestyle,
}: {
  result: BudgetResult;
  compareCity: string;
  setCompareCity: (c: string) => void;
  incomeA: number;
  incomeB: number;
  hasPartner: boolean;
  filing: FilingStatus;
  kids: number;
  lifestyle: Lifestyle;
}) {
  const compare = useMemo(
    () =>
      computeBudget({ incomeA, incomeB, hasPartner, filing, city: compareCity, kids, lifestyle }),
    [incomeA, incomeB, hasPartner, filing, compareCity, kids, lifestyle],
  );

  const sides = [
    { city: result.cityData, data: result, label: 'Current' },
    { city: compare.cityData, data: compare, label: 'Comparison' },
  ];

  // Paired-picker state for the comparison side. Mirrors the main inputs.
  const compareState = compare.cityData.state;
  const stateOptions: SearchableOption<StateCode>[] = (Object.keys(STATES) as StateCode[])
    .sort((a, b) => STATES[a].name.localeCompare(STATES[b].name))
    .map((code) => ({ value: code, label: STATES[code].name, hint: code }));

  const tierRank: Record<string, number> = {
    'Very High': 0,
    High: 1,
    Moderate: 2,
    Lower: 3,
    'Very Low': 4,
  };
  const curatedInState = Object.entries(CITIES)
    .filter(([, c]) => c.state === compareState)
    .sort(
      ([, a], [, b]) =>
        (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9) || a.name.localeCompare(b.name),
    );
  const localityOptions: SearchableOption<string>[] = [
    ...curatedInState.map(([id, c]) => ({ value: id, label: c.name, hint: c.tier })),
    { value: stateSlug(compareState), label: 'Statewide average', hint: 'approx.' },
  ];

  const onStateChange = (code: StateCode) => {
    const firstCurated = Object.entries(CITIES).find(([, c]) => c.state === code);
    setCompareCity(firstCurated ? firstCurated[0] : stateSlug(code));
  };

  return (
    <div style={{ marginBottom: 40 }}>
      <SectionTitle kicker="The same income, somewhere else">A geographic comparison</SectionTitle>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, padding: 24 }}>
        <div
          style={{ marginBottom: 18, fontFamily: fonts.body, fontSize: rem(14), color: T.inkSoft }}
        >
          Same household, same income — different city.
        </div>
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              fontSize: rem(12),
              color: T.inkSoft,
              display: 'block',
              marginBottom: 6,
              letterSpacing: '0.05em',
            }}
          >
            COMPARE WITH
          </label>
          <div
            style={{
              display: 'grid',
              // auto-fit so the two pickers sit side-by-side when there's room
              // and stack into a single column on narrow phones.
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: 8,
              maxWidth: 520,
            }}
          >
            <SearchableSelect<StateCode>
              value={compareState}
              options={stateOptions}
              onChange={onStateChange}
              placeholder="State"
              ariaLabel="Comparison state"
            />
            <SearchableSelect<string>
              value={compareCity}
              options={localityOptions}
              onChange={setCompareCity}
              placeholder="City or statewide"
              ariaLabel="Comparison locality"
            />
          </div>
          {compare.cityData.kind === 'statewide' && (
            <div style={{ fontSize: rem(11), color: T.accent, marginTop: 6 }}>
              Statewide approximation
            </div>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 1,
            background: T.border,
          }}
        >
          {sides.map((side, idx) => {
            const other = sides[1 - idx].data;
            const winning =
              side.data.discretionary >= 0 && side.data.discretionary >= other.discretionary;
            return (
              <div key={idx} style={{ background: T.bg, padding: 24, position: 'relative' }}>
                {winning && side.data.discretionary >= 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 16,
                      fontSize: rem(10),
                      letterSpacing: '0.15em',
                      color: T.positive,
                      fontWeight: 600,
                    }}
                  >
                    ▲ MORE LEFT OVER
                  </div>
                )}
                <div style={{ fontSize: rem(11), color: T.inkMuted, letterSpacing: '0.12em' }}>
                  {side.label.toUpperCase()}
                </div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: rem(22),
                    marginTop: 4,
                    marginBottom: 16,
                  }}
                >
                  {side.city.name}, {side.city.state}
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    columnGap: 24,
                    rowGap: 8,
                    fontSize: rem(13),
                  }}
                >
                  <span style={{ color: T.inkSoft }}>State tax</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {fmt(side.data.stateTax + side.data.localTax)}
                  </span>
                  <span style={{ color: T.inkSoft }}>Take-home</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right', color: T.positive }}>
                    {fmt(side.data.netIncome)}
                  </span>
                  <span style={{ color: T.inkSoft }}>Housing</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {fmt(side.data.expenses.Housing)}/mo
                  </span>
                  <span style={{ color: T.inkSoft }}>Childcare</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {kids > 0 ? fmt(side.data.expenses.Childcare) + '/mo' : '—'}
                  </span>
                  <span style={{ color: T.inkSoft }}>Total expenses</span>
                  <span style={{ fontFamily: fonts.mono, textAlign: 'right' }}>
                    {fmt(side.data.totalExpenses)}/mo
                  </span>
                </div>
                <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 18, paddingTop: 14 }}>
                  <div style={{ fontSize: rem(11), color: T.inkMuted, letterSpacing: '0.12em' }}>
                    SURPLUS / MO
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: rem(26),
                      color: side.data.discretionary >= 0 ? T.positive : T.accent,
                    }}
                  >
                    {fmtSigned(side.data.discretionary)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

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
          {result.discretionary > compare.discretionary
            ? `Difference: ${fmt(result.discretionary - compare.discretionary)}/mo more breathing room in ${result.cityData.name}.`
            : `Difference: ${fmt(compare.discretionary - result.discretionary)}/mo more breathing room in ${compare.cityData.name}.`}{' '}
          Geography is destiny — but only after you net out housing, taxes, and childcare.
        </div>

        {(() => {
          // Editorial footnote — surface the "graduated beats flat at moderate income"
          // surprise when one state is single-bracket (flat) and the other is multi-
          // bracket (graduated), AND the flat-rate state owes MORE state tax. Top
          // marginal rates lie: graduated states tax their bottom dollars gently, so
          // a 12.3%-top-rate state can owe less than a 5.4%-flat state at moderate
          // incomes.
          const isFlat = (s: BudgetResult) =>
            s.stateData.brackets[filing].length === 1 && s.stateData.brackets[filing][0]![1] > 0;
          const isGraduated = (s: BudgetResult) => s.stateData.brackets[filing].length > 1;
          const a = result;
          const b = compare;
          const surprise =
            isFlat(a) && isGraduated(b) && a.stateTax > b.stateTax
              ? { flat: a, grad: b }
              : isFlat(b) && isGraduated(a) && b.stateTax > a.stateTax
                ? { flat: b, grad: a }
                : null;
          if (!surprise) return null;
          const flatBrackets = surprise.flat.stateData.brackets[filing];
          const gradBrackets = surprise.grad.stateData.brackets[filing];
          const flatRate = (flatBrackets[0]![1] * 100).toFixed(2).replace(/\.?0+$/, '');
          const gradTopRate = (gradBrackets[gradBrackets.length - 1]![1] * 100)
            .toFixed(2)
            .replace(/\.?0+$/, '');
          return (
            <div
              style={{
                marginTop: 16,
                paddingTop: 16,
                borderTop: `1px dashed ${T.border}`,
                fontFamily: fonts.body,
                fontSize: rem(13),
                color: T.inkSoft,
                lineHeight: 1.6,
                fontStyle: 'italic',
              }}
            >
              <strong style={{ fontStyle: 'normal', color: T.ink }}>Top marginal rates lie:</strong>{' '}
              {surprise.flat.cityData.state} owes more state income tax here (
              {fmt(surprise.flat.stateTax)}/yr) on a flat {flatRate}% rate than{' '}
              {surprise.grad.cityData.state} owes ({fmt(surprise.grad.stateTax)}/yr) on graduated
              brackets that top out at {gradTopRate}%. The graduated structure taxes bottom dollars
              gently — the headline top rate isn't what most middle-income households actually pay.
            </div>
          );
        })()}
      </div>
    </div>
  );
}
