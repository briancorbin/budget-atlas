/**
 * /sources — Public, auditable record of every citation the model relies on.
 *
 * Renders the same registry that powers the audit pipeline, joined with the
 * human-review log from `audit/links/reviewed.tsv`. Sources are grouped by
 * category (matching the divisions inside `src/data/sources.ts`); long
 * state-keyed groups are wrapped in disclosure widgets to keep the page
 * scannable.
 *
 * Editorial intent: the page is a bibliography, not a dashboard. Anyone
 * landing here should be able to see what we cite, who put each citation in,
 * when, and whether it's been independently verified. The deeper audit
 * machinery (current curl status, broken-link issues) lives at
 * `audit/links/status.md` on GitHub.
 */

import { theme as T, fonts } from '@/theme';
import { SectionTitle } from './ui';
import {
  SOURCES,
  STATE_DOR,
  STATE_SNAP_AGENCY,
  STATE_MEDICAID_AGENCY,
  STATE_CHIP_AGENCY,
} from '@/data/sources';
import type { Source } from '@/types';
// Vite inlines this file's contents as a string at build time.
import reviewedTsv from '../../audit/links/reviewed.tsv?raw';

const GITHUB_REPO = 'https://github.com/TheBudgetAtlas/thebudgetatlas';

interface Review {
  date: string;
  reviewer: string;
  notes: string;
}

const REVIEWS = parseReviews(reviewedTsv);

function parseReviews(tsv: string): Map<string, Review[]> {
  const map = new Map<string, Review[]>();
  for (const line of tsv.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('url\t')) continue;
    const [url, date, reviewer, notes] = line.split('\t');
    if (!url) continue;
    if (!map.has(url)) map.set(url, []);
    map.get(url)!.push({ date, reviewer, notes: notes ?? '' });
  }
  for (const list of map.values()) {
    list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }
  return map;
}

interface Group {
  readonly kicker: string;
  readonly title: string;
  readonly description?: string;
  readonly sources: readonly Source[];
  /** True for the long state-keyed groups — wraps in <details>. */
  readonly collapsible?: boolean;
}

const GROUPS: readonly Group[] = [
  {
    kicker: 'Federal',
    title: 'Federal taxes & Social Security',
    sources: [SOURCES['irs-rev-proc-2025-32'], SOURCES['ssa-wage-base']],
  },
  {
    kicker: 'Cost of living',
    title: 'City cost-of-living references',
    description: 'Used for per-city rent, groceries, transit, childcare, healthcare estimates.',
    sources: [
      SOURCES['rentcafe-national'],
      SOURCES['zillow-rent-index'],
      SOURCES['bls-cex'],
      SOURCES['care-com-childcare'],
      SOURCES['kff-employer-health-benefits'],
      SOURCES['numbeo-cost-of-living'],
    ],
  },
  {
    kicker: 'Methodology',
    title: 'Rent & occupancy methodology',
    description: 'Backs the "household-of-N → bedroom count" rule that drives rent estimates.',
    sources: [
      SOURCES['hud-handbook-4350-3'],
      SOURCES['epi-family-budget-calculator'],
      SOURCES['zillow-rent-by-bedroom'],
    ],
  },
  {
    kicker: 'Statewide fallbacks',
    title: 'Statewide cost profiles',
    description: 'Used when a household is in a state without a curated city profile.',
    sources: [
      SOURCES['hud-fair-market-rents'],
      SOURCES['bls-cex-regional'],
      SOURCES['eia-residential'],
      SOURCES['child-care-aware'],
      SOURCES['aaa-driving-costs'],
    ],
  },
  {
    kicker: 'Aggregators',
    title: 'Cross-state aggregators',
    sources: [SOURCES['tax-foundation-state-rates'], SOURCES['ncsl-state-min-wage']],
  },
  {
    kicker: 'Safety net',
    title: 'Federal poverty & safety-net programs',
    sources: [
      SOURCES['hhs-poverty-guidelines'],
      SOURCES['usda-snap-eligibility'],
      SOURCES['cbpp-snap-bbce'],
      SOURCES['medicaid-gov'],
      SOURCES['kff-medicaid-expansion'],
      SOURCES['insurekidsnow'],
      SOURCES['medicaid-gov-chip-eligibility'],
    ],
  },
  {
    kicker: '50 states + DC',
    title: 'State Departments of Revenue',
    description: 'Per-state tax authority, surfaced inline in the bracket walkthrough.',
    sources: Object.values(STATE_DOR),
    collapsible: true,
  },
  {
    kicker: '50 states + DC',
    title: 'State SNAP administering agencies',
    description: 'Program names vary — CalFresh, OTDA, DTA, 3SquaresVT, FoodShare, etc.',
    sources: Object.values(STATE_SNAP_AGENCY),
    collapsible: true,
  },
  {
    kicker: '50 states + DC',
    title: 'State Medicaid administering agencies',
    sources: Object.values(STATE_MEDICAID_AGENCY),
    collapsible: true,
  },
  {
    kicker: '50 states + DC',
    title: 'State CHIP administering agencies',
    description: 'Some states have distinct CHIP brands; others bundle into Medicaid.',
    sources: Object.values(STATE_CHIP_AGENCY),
    collapsible: true,
  },
];

const ALL_SOURCES = GROUPS.flatMap((g) => g.sources);

const SUMMARY = (() => {
  const total = ALL_SOURCES.length;
  let primary = 0;
  let secondary = 0;
  let editorial = 0;
  for (const s of ALL_SOURCES) {
    const tier = (s as Source & { tier?: string }).tier;
    if (tier === 'primary') primary++;
    else if (tier === 'secondary') secondary++;
    else if (tier === 'editorial') editorial++;
  }
  const reviewedUrls = new Set<string>();
  for (const url of REVIEWS.keys()) reviewedUrls.add(url);
  // Only count reviewed sources that are actually in the registry.
  let reviewed = 0;
  for (const s of ALL_SOURCES) {
    if (reviewedUrls.has(s.url)) reviewed++;
  }
  return { total, primary, secondary, editorial, reviewed };
})();

export function Sources({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.ink,
        fontFamily: fonts.body,
        padding: '40px 24px 80px',
        backgroundImage: `radial-gradient(circle at 20% 0%, rgba(166, 38, 28, 0.04), transparent 50%),
         radial-gradient(circle at 80% 100%, rgba(45, 80, 22, 0.03), transparent 50%)`,
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Header onBack={onBack} />
        <Intro />
        <Summary />
        {GROUPS.map((g) => (
          <GroupSection key={g.title} group={g} />
        ))}
        <Footer onBack={onBack} />
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderTop: `2px solid ${T.ink}`,
        paddingTop: 16,
        marginBottom: 32,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 600,
        }}
      >
        The Budget Atlas · Vol. 2026 · Sources
      </div>
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.inkSoft,
          textDecoration: 'none',
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: 2,
        }}
      >
        ← Back to the atlas
      </a>
    </div>
  );
}

function Intro() {
  return (
    <div style={{ marginBottom: 40 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 'clamp(28px, 7vw, 44px)',
          fontWeight: 500,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          marginBottom: 16,
        }}
      >
        Where every number comes from
      </div>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.6,
          color: T.inkSoft,
          maxWidth: 680,
          margin: '0 0 12px',
        }}
      >
        Every figure the atlas displays — every tax bracket, every rent benchmark, every benefits
        threshold — traces back to a citation in the registry below. This page is the bibliography:
        what's cited, who put it there, when, and whether a human has independently verified it
        since.
      </p>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: T.inkMuted,
          maxWidth: 680,
          margin: 0,
        }}
      >
        Spotted a citation that's broken or no longer says what we claim? Click{' '}
        <em>Report a problem</em> on any source below to file a structured report — a maintainer
        will triage it, and the resolution becomes a row in the public audit trail. A nightly{' '}
        <a
          href={`${GITHUB_REPO}/tree/main/audit/links`}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          link audit
        </a>{' '}
        catches dead URLs automatically; everything else needs human eyes —{' '}
        <strong style={{ color: T.ink }}>your eyes</strong>, not an AI's. Reports must be 100%
        manual. Don't ask a chatbot to read the page for you; that's the failure mode this audit
        exists to catch. Affirmative <em>"this is correct"</em> reviews are reserved for periodic
        sweeps by maintainers — this form is for problems only.
      </p>
    </div>
  );
}

function Summary() {
  const stats: ReadonlyArray<{ label: string; value: number; tone?: 'accent' | 'positive' }> = [
    { label: 'Total cited', value: SUMMARY.total },
    { label: 'Primary sources', value: SUMMARY.primary, tone: 'positive' },
    { label: 'Secondary', value: SUMMARY.secondary },
    { label: 'Human-reviewed', value: SUMMARY.reviewed, tone: 'accent' },
  ];
  return (
    <section
      style={{
        marginBottom: 48,
        padding: '20px 24px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16,
      }}
    >
      {stats.map((s) => (
        <div key={s.label}>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 32,
              fontWeight: 500,
              lineHeight: 1,
              color: s.tone === 'accent' ? T.accent : s.tone === 'positive' ? T.positive : T.ink,
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: T.inkMuted,
              marginTop: 4,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </section>
  );
}

function GroupSection({ group }: { group: Group }) {
  const body = (
    <div>
      {group.description && (
        <p
          style={{
            fontSize: 14,
            color: T.inkSoft,
            margin: '0 0 16px',
            maxWidth: 640,
          }}
        >
          {group.description}
        </p>
      )}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {group.sources.map((s) => (
          <SourceRow key={`${group.title}-${s.url}-${s.label}`} source={s} />
        ))}
      </ul>
    </div>
  );

  if (group.collapsible) {
    return (
      <section style={{ marginBottom: 32 }}>
        <details>
          <summary
            style={{
              cursor: 'pointer',
              listStyle: 'none',
              outline: 'none',
            }}
          >
            <SectionTitle kicker={group.kicker}>
              {group.title}{' '}
              <span
                style={{
                  fontSize: 14,
                  color: T.inkMuted,
                  fontWeight: 400,
                }}
              >
                · {group.sources.length} sources (click to expand)
              </span>
            </SectionTitle>
          </summary>
          <div style={{ marginTop: 16 }}>{body}</div>
        </details>
      </section>
    );
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <SectionTitle kicker={group.kicker}>{group.title}</SectionTitle>
      <div style={{ marginTop: 16 }}>{body}</div>
    </section>
  );
}

function SourceRow({ source }: { source: Source }) {
  const reviews = REVIEWS.get(source.url) ?? [];
  const latest = reviews[0];
  const tier = (source as Source & { tier?: string }).tier;

  // Single-column stacked layout. Title leads (it's the content); metadata
  // strip contextualizes it; URL is the reference / wayfinding; actions
  // (review log, submit button) live at the bottom. Review expansion gets
  // the full row width without escaping a grid cell.
  return (
    <li
      style={{
        padding: '18px 0',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        style={{
          color: T.ink,
          textDecoration: 'none',
          borderBottom: `1px solid ${T.border}`,
          fontSize: 16,
          fontWeight: 500,
          lineHeight: 1.35,
          alignSelf: 'flex-start',
        }}
      >
        {source.label}
      </a>

      <MetaStrip
        tier={tier}
        addedBy={source.addedBy ?? null}
        addedAt={source.addedAt ?? null}
        addedFallback={source.date ?? null}
        latestReview={latest ?? null}
        reviewCount={reviews.length}
      />

      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: 11,
          color: T.inkMuted,
          wordBreak: 'break-all',
        }}
      >
        {source.url}
      </div>

      <div
        style={{
          display: 'flex',
          // baseline-align so the disclosure summary text and the submit
          // link sit on the same typographic baseline; switching to
          // flex-start would line up the box tops (off because the
          // disclosure carries a triangle marker), and alignItems:center
          // would float submit down beside the expanded review log.
          alignItems: 'baseline',
          gap: 18,
          flexWrap: 'wrap',
        }}
      >
        {reviews.length > 0 && <ReviewLog reviews={reviews} />}
        <ReportProblemLink source={source} />
      </div>
    </li>
  );
}

function MetaStrip({
  tier,
  addedBy,
  addedAt,
  addedFallback,
  latestReview,
  reviewCount,
}: {
  tier?: string;
  addedBy: string | null;
  addedAt: string | null;
  addedFallback: string | null;
  latestReview: Review | null;
  reviewCount: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '6px 14px',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: T.inkMuted,
        fontWeight: 600,
      }}
    >
      {tier && <TierPill tier={tier} />}
      <MetaFact label="Added" date={addedAt ?? addedFallback} handle={addedBy} />
      {latestReview && (
        <MetaFact
          label={`Reviewed${reviewCount > 1 ? ` ×${reviewCount}` : ''}`}
          date={latestReview.date}
          handle={latestReview.reviewer}
          tone="positive"
        />
      )}
    </div>
  );
}

function MetaFact({
  label,
  date,
  handle,
  tone,
}: {
  label: string;
  date: string | null;
  handle: string | null;
  tone?: 'positive';
}) {
  if (!date && !handle) return null;
  const labelColor = tone === 'positive' ? T.positive : T.inkMuted;
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline' }}>
      <span style={{ color: labelColor }}>{label}</span>
      {date && <span style={{ color: T.inkSoft }}>{date}</span>}
      {handle && (
        <a
          href={`https://github.com/${handle.replace(/^@/, '')}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: T.accent, textDecoration: 'none' }}
        >
          @{handle.replace(/^@/, '')}
        </a>
      )}
    </span>
  );
}

function reportSubmissionUrl(source: Source): string {
  const params = new URLSearchParams({
    template: 'source-report.yml',
    title: `Report: ${source.label}`,
    'source-url': source.url,
    'report-date': new Date().toISOString().slice(0, 10),
  });
  return `${GITHUB_REPO}/issues/new?${params.toString()}`;
}

function ReportProblemLink({ source }: { source: Source }) {
  return (
    <a
      href={reportSubmissionUrl(source)}
      target="_blank"
      rel="noreferrer"
      style={{
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        color: T.accent,
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span aria-hidden="true">⚑</span> Report a problem
    </a>
  );
}

function ReviewLog({ reviews }: { reviews: readonly Review[] }) {
  const count = reviews.length;
  return (
    <details
      style={{
        fontSize: 13,
        // Comfortable reading measure when expanded — review notes get
        // ~70ch width so quotes don't break into 6-word lines on mobile.
        maxWidth: '70ch',
        flex: '1 1 auto',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          listStyle: 'none',
          color: T.positive,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span aria-hidden="true">▸</span>
        {count === 1 ? '1 review' : `${count} reviews`}
      </summary>
      <ol
        style={{
          listStyle: 'none',
          padding: '12px 0 0 16px',
          margin: 0,
          borderLeft: `2px solid ${T.border}`,
          marginTop: 8,
        }}
      >
        {reviews.map((r, i) => (
          <li key={`${r.date}-${r.reviewer}-${i}`} style={{ marginBottom: 12 }}>
            <div
              style={{
                fontSize: 11,
                color: T.inkMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              <span style={{ color: T.ink }}>{r.date}</span>
              {r.reviewer && (
                <>
                  {' · '}
                  <a
                    href={`https://github.com/${r.reviewer.replace(/^@/, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: T.accent,
                      textDecoration: 'none',
                    }}
                  >
                    @{r.reviewer.replace(/^@/, '')}
                  </a>
                </>
              )}
            </div>
            {r.notes && (
              <div
                style={{
                  fontSize: 13,
                  color: T.inkSoft,
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                “{r.notes}”
              </div>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

function TierPill({ tier }: { tier: string }) {
  const palette =
    tier === 'primary'
      ? { bg: 'rgba(45, 80, 22, 0.12)', fg: T.positive }
      : tier === 'editorial'
        ? { bg: 'rgba(184, 116, 43, 0.18)', fg: T.warning }
        : { bg: 'rgba(166, 38, 28, 0.10)', fg: T.accent };
  return (
    <span
      style={{
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        background: palette.bg,
        color: palette.fg,
        padding: '2px 8px',
        borderRadius: 2,
      }}
    >
      {tier}
    </span>
  );
}

function Footer({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        borderTop: `2px solid ${T.ink}`,
        paddingTop: 24,
        marginTop: 48,
        textAlign: 'center',
      }}
    >
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '10px 18px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          color: T.ink,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        ← Back to the atlas
      </a>
    </div>
  );
}

const linkStyle = {
  color: T.accent,
  textDecoration: 'none',
  fontWeight: 600,
  borderBottom: `1px solid ${T.border}`,
} as const;
