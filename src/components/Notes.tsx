import type { FilingStatus, Source } from '@/types';
import { theme as T, fonts } from '@/theme';
import { fmt } from '@/lib/format';
import { FEDERAL_TAX_SOURCE, SS_WAGE_BASE_SOURCE, STD_DEDUCTION_2026 } from '@/data/federalTax';
import { STATE_TAX_SOURCE, STATE_MIN_WAGE_SOURCE } from '@/data/states';
import { CITY_COL_SOURCES } from '@/data/cities';

function buildFooterSources(stateSource?: Source): readonly Source[] {
  return [
    FEDERAL_TAX_SOURCE,
    SS_WAGE_BASE_SOURCE,
    STATE_TAX_SOURCE,
    ...(stateSource ? [stateSource] : []),
    STATE_MIN_WAGE_SOURCE,
    ...CITY_COL_SOURCES,
  ];
}

export function Notes({
  filing,
  stateTaxSource,
}: {
  filing: FilingStatus;
  stateTaxSource?: Source;
}) {
  const footerSources = buildFooterSources(stateTaxSource);
  const filingLabel =
    filing === 'married'
      ? 'married filing jointly'
      : filing === 'head'
        ? 'head of household'
        : 'single';

  const notes = [
    {
      title: 'How taxes work here',
      body: (
        <>
          The U.S. federal system is progressive — only the dollars within each bracket are taxed at
          that rate. The 2026 standard deduction ({fmt(STD_DEDUCTION_2026[filing])} for{' '}
          {filingLabel}) is subtracted before brackets apply. State tax uses the same machinery:
          each state's actual graduated brackets and standard deduction, applied to gross income.
          No-tax states (TX, FL, WA, etc.) use a single 0% bracket; flat-tax states (CO, IL, PA) use
          a single positive bracket.
        </>
      ),
    },
    {
      title: 'The childcare cliff',
      body: (
        <>
          Try setting kids to 2 in San Francisco vs. rural Iowa at the same income. Childcare alone
          can run $25–35K/yr per child in major metros — often more than rent and frequently the
          single largest budget line for working parents until kids reach school age.
        </>
      ),
    },
    {
      title: 'The no-income-tax illusion',
      body: (
        <>
          Texas, Tennessee, Florida, Washington and Wyoming impose 0% income tax — but they recover
          revenue through property tax (Texas effective rates near 1.6%) and sales tax. For a
          moderate income, the savings are real; for renters at low incomes, sales tax is regressive
          and bites harder than it appears.
        </>
      ),
    },
    {
      title: 'Two earners, one return — or two',
      body: (
        <>
          Married couples filing jointly combine income on one return; cohabitating partners file
          separately as singles, each with their own standard deduction. For asymmetric incomes
          (e.g. $200K + $80K), MFJ usually wins — a "marriage bonus." For two near-equal high
          earners, MFJ can produce a small "marriage penalty" above ~$770K combined. FICA is always
          calculated per person, so two earners at $150K each pay more Social Security tax than one
          earner at $300K.
        </>
      ),
    },
    {
      title: 'Caveats',
      body: (
        <>
          Models always simplify. This one assumes employer-sponsored health insurance, no student
          loans, no debt servicing, no employer 401(k) pre-tax contributions, no homeownership
          (rents only), and average local prices. EITC and Child Tax Credit are approximated. Real
          households have wide variance even within the same city and income.
        </>
      ),
    },
  ];

  return (
    <>
      <div
        style={{
          marginTop: 60,
          paddingTop: 24,
          borderTop: `1px solid ${T.border}`,
          fontSize: 13,
          color: T.inkSoft,
          fontFamily: fonts.body,
          lineHeight: 1.7,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 32,
        }}
      >
        {notes.map((n) => (
          <div key={n.title}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: T.accent,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              {n.title}
            </div>
            <p style={{ marginTop: 0 }}>{n.body}</p>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 40,
          paddingTop: 20,
          borderTop: `2px solid ${T.ink}`,
          textAlign: 'center',
          fontSize: 11,
          color: T.inkMuted,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          lineHeight: 1.9,
        }}
      >
        Sources ·{' '}
        {footerSources.map((s, i) => (
          <span key={i}>
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              style={{
                color: T.inkMuted,
                textDecoration: 'underline',
                textDecorationStyle: 'dotted',
              }}
            >
              {s.label}
            </a>
            {i < footerSources.length - 1 && ' · '}
          </span>
        ))}
      </div>
    </>
  );
}
