import type { Source } from '@/types';
import { navigate } from '@/lib/nav';
import { theme as T, fonts, rem } from '@/theme';
import { FEDERAL_TAX_SOURCE, SS_WAGE_BASE_SOURCE } from '@/data/federalTax';
import { STATE_TAX_SOURCE, STATE_MIN_WAGE_SOURCE } from '@/data/states';
import { CITY_COL_SOURCES } from '@/data/cities';
import { PageSources } from '@/components/ui';

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

/**
 * Notes section — kept lean. Caveats (what the model deliberately
 * simplifies) lives here as the page's honesty pass and source-list
 * grounding. The longer teaching content (how progressive tax math
 * works, two-earner FICA, marriage bonus / penalty, the childcare and
 * no-income-tax surprises) used to live here too but was moved to
 * /about's "How the math works" section — that content is evergreen
 * and didn't need to crowd every explorer view.
 */
export function Notes({ stateTaxSource }: { stateTaxSource?: Source }) {
  const footerSources = buildFooterSources(stateTaxSource);
  const linkStyle = {
    color: T.accent,
    textDecoration: 'none',
    fontWeight: 600,
    borderBottom: `1px solid ${T.border}`,
    paddingBottom: 1,
  } as const;

  return (
    <>
      <div
        style={{
          marginTop: 60,
          paddingTop: 24,
          borderTop: `1px solid ${T.border}`,
          fontSize: rem(13),
          color: T.inkSoft,
          fontFamily: fonts.body,
          lineHeight: 1.7,
          maxWidth: 680,
        }}
      >
        <div
          style={{
            fontSize: rem(11),
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: T.accent,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          Caveats
        </div>
        <p style={{ marginTop: 0 }}>
          Models always simplify. This one assumes employer-sponsored health insurance, no student
          loans, no debt servicing, no employer 401(k) pre-tax contributions, no homeownership
          (rents only), and average local prices. EITC and Child Tax Credit are approximated. Real
          households have wide variance even within the same city and income. For a longer
          explanation of how the tax math works,{' '}
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              navigate('/about');
            }}
            style={linkStyle}
          >
            see the About page
          </a>
          .
        </p>
      </div>

      <PageSources sources={footerSources} heading="Sources backing this calculation" />
    </>
  );
}
