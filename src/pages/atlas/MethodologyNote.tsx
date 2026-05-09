import { theme as T, fonts, rem } from '@/theme';
import { navigate } from '@/lib/nav';

/**
 * Front-and-center methodology framing — sits between the Masthead and
 * the Customize panel so a first-time reader knows what kind of thing
 * they're looking at before they push any knobs.
 *
 * Replaces the previous bottom-of-page Caveats block: keeping the
 * "what we deliberately simplify" honesty pass at the bottom meant
 * casual readers never saw it. Promoting it up here means the framing
 * lands first, when it shapes how the user reads everything that
 * follows.
 *
 * Per-line source provenance lives in the Expenses detail view (dot
 * legend + hover popovers); this is the high-level "what kind of
 * thing is this?" framing for everyone, including readers who never
 * open the detail view.
 */
export function MethodologyNote() {
  const linkStyle = {
    color: T.accent,
    textDecoration: 'none',
    fontWeight: 600,
    borderBottom: `1px solid ${T.border}`,
    paddingBottom: 1,
  } as const;

  return (
    <div
      style={{
        margin: '8px 0 28px',
        padding: '16px 20px',
        background: T.bgAlt,
        border: `1px solid ${T.border}`,
        borderLeft: `3px solid ${T.accent}`,
        fontFamily: fonts.body,
        fontSize: rem(13),
        lineHeight: 1.65,
        color: T.inkSoft,
      }}
    >
      <div
        style={{
          fontSize: rem(10),
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        About this model
      </div>
      <p style={{ margin: '0 0 10px' }}>
        The numbers here are produced by a custom budget model — not lifted whole from any single
        source. Some lines come from primary government data (BLS, IRS, state agencies), some from
        peer-respected references (KFF), some from commercial datasets (RentCafe, Care.com), and a
        handful are still our current best guess. Where the math overrides BLS for a household type
        (e.g. transit-only, no-kids), we surface the override and the reason inline.
      </p>
      <p style={{ margin: '0 0 10px' }}>
        Models always simplify. This one assumes employer-sponsored health insurance, no student
        loans, no debt servicing, no employer 401(k) pre-tax contributions, no homeownership (rents
        only), and average local prices. EITC and Child Tax Credit are approximated. Real households
        have wide variance even within the same city and income.{' '}
        <strong style={{ color: T.ink, fontWeight: 600 }}>
          Medicaid and CHIP are modeled as binary full/none
        </strong>{' '}
        — when a household qualifies, healthcare costs zero out; when not, full out-of-pocket. The
        real-world variation in adult dental, vision, and other state-level Medicaid scope (which
        ranges from comprehensive to emergency-only depending on state) isn't modeled yet.
      </p>
      <p style={{ margin: '0 0 10px' }}>
        Cost-of-living lines combine BLS Consumer Expenditure Survey data across three axes — income
        quintile, geography, and household size — using a synthetic blend. Because BLS publishes
        single-axis cross-tabs only, the blend treats the axes as independent. This is most accurate
        for diffuse lines (groceries, utilities) and less so where size and income correlate (small
        households skew older and lower-income; larger households skew toward middle quintiles and
        peak earning years). Microdata could resolve this; the blend is the published-table-only
        approximation.
      </p>
      <p style={{ margin: 0 }}>
        We try to be as transparent as possible about where each number comes from — hover the
        colored dots in the Expenses detail view for per-line source notes. We may still be missing
        some; if something seems off,{' '}
        <a
          href="https://github.com/TheBudgetAtlas/thebudgetatlas/issues/new?template=source-report.yml"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle}
        >
          please report it
        </a>
        . We aim to improve the source mix over time — every honest gap is a future commit. For a
        longer explanation of how the math works,{' '}
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
  );
}
