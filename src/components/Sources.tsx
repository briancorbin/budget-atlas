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

import { theme as T, fonts, rem } from '@/theme';
import { SectionTitle } from './ui';
import {
  SOURCES,
  STATE_DOR,
  STATE_SNAP_AGENCY,
  STATE_MEDICAID_AGENCY,
  STATE_CHIP_AGENCY,
} from '@/data/sources';
import type { Source } from '@/types';
import {
  REVIEWS,
  STATUS_BY_URL,
  STALENESS_THRESHOLDS_DAYS,
  STALENESS_DEFAULT_DAYS,
  isBrokenStatus,
  isOverdue,
  StatusDot,
  type Review,
} from '@/lib/sourceStatus';

const GITHUB_REPO = 'https://github.com/TheBudgetAtlas/thebudgetatlas';

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
  let original = 0;
  let reference = 0;
  let estimate = 0;
  for (const s of ALL_SOURCES) {
    const tier = (s as Source & { tier?: string }).tier;
    if (tier === 'original') original++;
    else if (tier === 'reference') reference++;
    else if (tier === 'estimate') estimate++;
  }
  // Split the reviewed count by kind of latest review so the summary
  // honestly reflects the level of human involvement, not just "any
  // review at all." A source whose only review is `ai-proposed` should
  // not be counted next to one with eyes-on-source verification.
  let reviewedHuman = 0;
  let reviewedAiAssisted = 0;
  let reviewedAiProposed = 0;
  for (const s of ALL_SOURCES) {
    const latest = REVIEWS.get(s.id)?.[0];
    if (!latest) continue;
    if (latest.kind === 'ai-assisted') reviewedAiAssisted++;
    else if (latest.kind === 'ai-proposed') reviewedAiProposed++;
    else reviewedHuman++;
  }
  const reviewed = reviewedHuman + reviewedAiAssisted + reviewedAiProposed;

  // Overdue: tier-aware staleness check. Never-reviewed sources count as
  // overdue from day one — the audit's job is to honestly represent how
  // much human verification has happened, not to soft-start with addedAt
  // as a free pass. See audit/staleness/ for the rolling-issue workflow
  // that surfaces the queue for triage.
  const today = new Date();
  let overdue = 0;
  let broken = 0;
  for (const s of ALL_SOURCES) {
    if (isBrokenStatus(STATUS_BY_URL.get(s.url))) broken++;
    const tier = (s as Source & { tier?: string }).tier ?? 'reference';
    const thresholdDays = STALENESS_THRESHOLDS_DAYS[tier] ?? STALENESS_DEFAULT_DAYS;
    const latest = REVIEWS.get(s.id)?.[0];
    if (!latest) {
      overdue++;
      continue;
    }
    const reviewDate = new Date(latest.date + 'T00:00:00Z');
    if (Number.isNaN(reviewDate.valueOf())) continue;
    const dueDate = new Date(reviewDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + thresholdDays);
    if (today > dueDate) overdue++;
  }

  // verified = loading correctly AND reviewed within tier window
  let verified = 0;
  for (const s of ALL_SOURCES) {
    if (!isBrokenStatus(STATUS_BY_URL.get(s.url)) && !isOverdue(s)) verified++;
  }
  return {
    total,
    original,
    reference,
    estimate,
    reviewed,
    reviewedHuman,
    reviewedAiAssisted,
    reviewedAiProposed,
    overdue,
    broken,
    verified,
  };
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
        {/* Inner column caps content at editorial measure (~680), left-
            aligned with the header so the page reads as a single column with
            a wider header / footer chrome. */}
        <div style={{ maxWidth: 680 }}>
          <Intro />
          <Summary />
          <ThresholdsNote />
          {GROUPS.map((g) => (
            <GroupSection key={g.title} group={g} />
          ))}
        </div>
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
          fontSize: rem(12),
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
          fontSize: rem(12),
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
          fontSize: `clamp(${rem(28)}, 7vw, ${rem(44)})`,
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
          fontSize: rem(16),
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
          fontSize: rem(14),
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

function ThresholdsNote() {
  return (
    <div
      style={{
        fontSize: rem(13),
        color: T.inkSoft,
        marginTop: 12,
        marginBottom: 48,
        padding: '16px 24px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
      }}
    >
      <div
        style={{
          fontSize: rem(12),
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: T.inkMuted,
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        Source classes & review windows
      </div>
      <div style={{ lineHeight: 1.6 }}>
        Every citation has a class that determines how often it should be re-verified by a human:
      </div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
        <li>
          <strong>Original</strong> — every <strong>90 days</strong>. The rule's own publication
          (IRS Rev. Proc., HHS Poverty Guidelines, BLS CEX). Highest stakes if drifted.
        </li>
        <li>
          <strong>Reference</strong> — every <strong>180 days</strong>. Operational handbooks,
          agency landing pages, industry surveys. Drift more slowly.
        </li>
        <li>
          <strong>Estimate</strong> — every <strong>365 days</strong>. Approximations flagged
          honestly. Drift tolerance is part of the design.
        </li>
      </ul>
      <div style={{ marginTop: 10, color: T.inkMuted, fontSize: rem(12), lineHeight: 1.6 }}>
        A source is <strong style={{ color: T.positive }}>Verified</strong> when it loads correctly{' '}
        <em>and</em> has been reviewed within its window;{' '}
        <strong style={{ color: T.warning }}>Overdue</strong> when no human has verified it in time;{' '}
        <strong style={{ color: T.accent }}>Broken</strong> when curl can't reach it. Sources with
        no review row at all are flagged Overdue immediately, regardless of when they were added.
      </div>
    </div>
  );
}

type StatTone = 'accent' | 'positive' | 'warning' | 'broken';
interface Stat {
  label: string;
  value: number;
  tone?: StatTone;
}

function Summary() {
  // Two semantic rows: composition (what's in the registry by class) on top,
  // current state (how the registry is doing) below. Each row gets four
  // cells, fits cleanly without auto-fit awkwardness.
  const composition: ReadonlyArray<Stat> = [
    { label: 'Total cited', value: SUMMARY.total },
    { label: 'Original', value: SUMMARY.original, tone: 'positive' },
    { label: 'Reference', value: SUMMARY.reference },
    { label: 'Estimate', value: SUMMARY.estimate },
  ];
  // Review-kind row: how much of our verification came from eyes-on-source
  // vs AI-assisted vs AI-proposed. The audit's purpose is honesty about
  // what's been verified and how — collapsing these into a single
  // "reviewed" count would launder AI work as the same kind of evidence
  // as human review.
  const reviewKinds: ReadonlyArray<Stat> = [
    { label: 'Human', value: SUMMARY.reviewedHuman, tone: 'positive' },
    { label: 'AI-assisted', value: SUMMARY.reviewedAiAssisted, tone: 'warning' },
    { label: 'AI-proposed', value: SUMMARY.reviewedAiProposed, tone: 'accent' },
    { label: 'Unreviewed', value: SUMMARY.total - SUMMARY.reviewed },
  ];
  const state: ReadonlyArray<Stat> = [
    {
      label: 'Verified',
      value: SUMMARY.verified,
      tone: SUMMARY.verified > 0 ? 'positive' : undefined,
    },
    {
      label: 'Overdue',
      value: SUMMARY.overdue,
      tone: SUMMARY.overdue > 0 ? 'warning' : undefined,
    },
    { label: 'Broken', value: SUMMARY.broken, tone: SUMMARY.broken > 0 ? 'broken' : undefined },
  ];
  return (
    <section
      style={{
        marginBottom: 48,
        padding: '20px 24px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <StatRow heading="Composition" stats={composition} />
      <div style={{ height: 1, background: T.border, opacity: 0.6 }} />
      <StatRow heading="Review kinds" stats={reviewKinds} />
      <div style={{ height: 1, background: T.border, opacity: 0.6 }} />
      <StatRow heading="State" stats={state} />
    </section>
  );
}

function StatRow({ heading, stats }: { heading: string; stats: ReadonlyArray<Stat> }) {
  return (
    <div>
      <div
        style={{
          fontSize: rem(10),
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: T.inkMuted,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        {heading}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 16,
        }}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: rem(32),
                fontWeight: 500,
                lineHeight: 1,
                color:
                  s.tone === 'accent'
                    ? T.accent
                    : s.tone === 'positive'
                      ? T.positive
                      : s.tone === 'warning'
                        ? T.warning
                        : s.tone === 'broken'
                          ? T.accent
                          : T.ink,
              }}
            >
              {s.value}
            </div>
            <div
              style={{
                fontSize: rem(12),
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
      </div>
    </div>
  );
}

function GroupSection({ group }: { group: Group }) {
  const body = (
    <div>
      {group.description && (
        <p
          style={{
            fontSize: rem(14),
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
                  fontSize: rem(14),
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
  const reviews = REVIEWS.get(source.id) ?? [];
  const latest = reviews[0];
  const tier = (source as Source & { tier?: string }).tier;
  const broken = isBrokenStatus(STATUS_BY_URL.get(source.url));
  const overdue = isOverdue(source);
  const statusKind: 'broken' | 'overdue' | 'verified' = broken
    ? 'broken'
    : overdue
      ? 'overdue'
      : 'verified';

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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <StatusDot kind={statusKind} />
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          style={{
            color: T.ink,
            textDecoration: 'none',
            borderBottom: `1px solid ${T.border}`,
            fontSize: rem(16),
            fontWeight: 500,
            lineHeight: 1.35,
          }}
        >
          {source.label}
        </a>
      </div>

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
          fontSize: rem(12),
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
        fontSize: rem(12),
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: T.inkMuted,
        fontWeight: 600,
      }}
    >
      {tier && <TierPill tier={tier} />}
      {/* Surface the latest review's kind alongside the tier so a reader
          can scan a row and see at a glance whether the verification was
          eyes-on-source vs AI-assisted. Skip rendering for `human` to
          reduce visual noise — human is the baseline expectation. */}
      {latestReview && latestReview.kind !== 'human' && <ReviewKindPill kind={latestReview.kind} />}
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
        fontSize: rem(12),
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
        fontSize: rem(13),
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
          fontSize: rem(12),
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
                fontSize: rem(12),
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
              {' · '}
              <ReviewKindPill kind={r.kind} />
            </div>
            {r.notes && (
              <div
                style={{
                  fontSize: rem(13),
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
    tier === 'original'
      ? { bg: 'rgba(45, 80, 22, 0.12)', fg: T.positive }
      : tier === 'estimate'
        ? { bg: 'rgba(184, 116, 43, 0.18)', fg: T.warning }
        : { bg: 'rgba(166, 38, 28, 0.10)', fg: T.accent };
  return (
    <span
      style={{
        fontSize: rem(10),
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

/**
 * Compact pill rendering a review's kind — human / ai-assisted / ai-proposed.
 * Surfaces the level of human involvement honestly: AI assistance is
 * allowed and visible, not absent and laundered. Same shape as TierPill
 * for visual consistency.
 */
function ReviewKindPill({ kind }: { kind: string }) {
  const palette: { bg: string; fg: string; label: string } =
    kind === 'human'
      ? { bg: 'rgba(45, 80, 22, 0.12)', fg: T.positive, label: 'human' }
      : kind === 'ai-assisted'
        ? { bg: 'rgba(184, 116, 43, 0.18)', fg: T.warning, label: 'ai-assisted' }
        : kind === 'ai-proposed'
          ? { bg: 'rgba(166, 38, 28, 0.10)', fg: T.accent, label: 'ai-proposed' }
          : { bg: 'rgba(0, 0, 0, 0.06)', fg: T.inkMuted, label: kind };
  return (
    <span
      style={{
        fontSize: rem(10),
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        background: palette.bg,
        color: palette.fg,
        padding: '2px 8px',
        borderRadius: 2,
      }}
    >
      {palette.label}
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
          fontSize: rem(13),
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
