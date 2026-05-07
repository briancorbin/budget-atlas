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
 * landing here should be able to see what we cite, who put each citation
 * in, when, and whether it's been independently verified. Machine status
 * is fetched from /api/audit/latest at render time; broken-link triage
 * lives in the rolling [`audit:link`] issue.
 */

import { useMemo, useState, type ReactNode } from 'react';
import { theme as T, fonts, rem } from '@/theme';
import { SectionTitle } from '@/components/ui';
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
  STALENESS_THRESHOLDS_DAYS,
  STALENESS_DEFAULT_DAYS,
  isBrokenStatus,
  isBotBlockedVerified,
  isOverdue,
  getStatusKind,
  type Review,
  type StatusKind,
} from '@/lib/audit/status';
import { useStatusByUrl, useIntermittentUrls } from '@/lib/audit/store';
import { StatusDot } from '@/components/audit/StatusDot';

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

// Tier counts don't depend on audit status, so they can be computed once
// at module load. Status counts (broken/overdue/verified/ai-verified) move
// with each /api/audit/latest fetch and are recomputed inside the
// component via `computeStatusSummary` + useMemo.
const TIER_SUMMARY = (() => {
  let primary = 0;
  let reference = 0;
  let commercial = 0;
  for (const s of ALL_SOURCES) {
    const tier = (s as Source & { tier?: string }).tier;
    if (tier === 'primary') primary++;
    else if (tier === 'reference') reference++;
    else if (tier === 'commercial') commercial++;
  }
  return { total: ALL_SOURCES.length, primary, reference, commercial };
})();

// Status classifier mirrors `getStatusKind` exactly so the four Status
// cells partition every source (sum equals total). Precedence: broken >
// overdue > ai-verified > human-verified. Counting broken and overdue
// independently would double-count any source that's both, breaking the
// row-level totals' agreement with the per-source dot. Overdue uses the
// tier-aware staleness check; never-reviewed sources count as overdue
// from day one — the audit's job is to honestly represent how much human
// verification has happened, not to soft-start with addedAt as a free
// pass. See audit/staleness/ for the rolling-issue workflow that
// surfaces the queue for triage.
function computeStatusSummary(
  statusByUrl: ReadonlyMap<string, string>,
  intermittentUrls: ReadonlySet<string>,
) {
  // Stays at four cells. The two softer states are bucketed by their
  // underlying review provenance instead of getting their own cells:
  //   - `bot-blocked-verified` always counts as humanVerified — the
  //     verified-bot-blocked TSV row is itself a human action ("I
  //     loaded the URL in a browser within the last 30 days").
  //   - `intermittent` defers to the latest entry in REVIEWS for the
  //     source: kind=human → humanVerified, kind=ai → aiVerified, no
  //     review → broken (the audit's flap history isn't a citation
  //     review and shouldn't pretend to be one).
  // The dot colour in the row below carries the audit-caveat nuance;
  // the Summary cells answer "is this citation human-verified, AI-
  // verified, overdue, or actually broken?" without inventing a fifth
  // bucket the row layout doesn't have room for.
  let humanVerified = 0;
  let aiVerified = 0;
  let overdue = 0;
  let broken = 0;
  for (const s of ALL_SOURCES) {
    if (isBrokenStatus(statusByUrl.get(s.url))) {
      if (isBotBlockedVerified(s)) {
        humanVerified++;
        continue;
      }
      if (intermittentUrls.has(s.url)) {
        const latest = REVIEWS.get(s.id)?.[0];
        if (latest?.kind === 'human') humanVerified++;
        else if (latest?.kind === 'ai') aiVerified++;
        else broken++;
        continue;
      }
      broken++;
      continue;
    }
    if (isOverdue(s)) {
      overdue++;
      continue;
    }
    const latest = REVIEWS.get(s.id)?.[0];
    if (latest?.kind === 'ai') aiVerified++;
    else humanVerified++;
  }
  return { humanVerified, aiVerified, overdue, broken };
}

export function Sources({ onBack }: { onBack: () => void }) {
  // Single subscription to the audit-status store for the whole page —
  // the snapshot is identical for every SourceRow, so registering one
  // listener here and passing the map down is equivalent to per-row
  // subscriptions in correctness, lighter on the store's notify loop.
  const statusByUrl = useStatusByUrl();
  const intermittentUrls = useIntermittentUrls();
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
          <Summary statusByUrl={statusByUrl} intermittentUrls={intermittentUrls} />
          <ThresholdsNote />
          {GROUPS.map((g) => (
            <GroupSection
              key={g.title}
              group={g}
              statusByUrl={statusByUrl}
              intermittentUrls={intermittentUrls}
            />
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
        will triage it, and the resolution lands as a row in the public{' '}
        <a
          href={`${GITHUB_REPO}/blob/main/audit/links/reviewed.tsv`}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          audit trail
        </a>
        . A nightly{' '}
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
        Every citation has a class that determines how often it should be re-verified:
      </div>
      <ul style={{ margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.6 }}>
        <li>
          <strong style={{ color: T.positive }}>Primary</strong> — every{' '}
          <strong>{TIER_REVIEW_DAYS.primary} days</strong>. Direct from the agency or data
          publisher: federal agencies (IRS, BLS, SSA, HUD, eCFR) and state agencies on their own
          programs (state DORs, SNAP / Medicaid / CHIP portals). Highest stakes if drifted.
        </li>
        <li>
          <strong style={{ color: T.aiAccent }}>Reference</strong> — every{' '}
          <strong>{TIER_REVIEW_DAYS.reference} days</strong>. Peer-respected third-party
          interpretation, methodology document, or research-org survey (KFF, EPI, CBPP, Tax
          Foundation, NCSL, AAA, HUD Handbook, Child Care Aware). Public methodology, one step
          removed from the publisher.
        </li>
        <li>
          <strong style={{ color: T.commercialAccent }}>Commercial</strong> — every{' '}
          <strong>{TIER_REVIEW_DAYS.commercial} days</strong>. Commercial or crowd-sourced data
          product (Zillow, RentCafe, Care.com, Numbeo). Methodology proprietary or community-driven,
          not peer-reviewed. Index-style data updates frequently, so the cadence matches Primary.
        </li>
      </ul>
      <div
        style={{
          fontSize: rem(12),
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: T.inkMuted,
          fontWeight: 600,
          marginTop: 18,
          marginBottom: 10,
        }}
      >
        Status indicators
      </div>
      <StatusLegend />
    </div>
  );
}

/**
 * Six rows, one per `StatusKind`, each rendering the live `StatusDot` so
 * the legend stays in sync with whatever the dots actually look like —
 * change a colour or hollow/filled in StatusDot and the legend updates
 * automatically. Two-column grid (dot + label / description) keeps the
 * reading rhythm consistent with the class list above.
 */
function StatusLegend() {
  const entries: ReadonlyArray<{
    kind: StatusKind;
    label: string;
    color: string;
    body: ReactNode;
  }> = [
    {
      kind: 'verified',
      label: 'Human verified',
      color: T.positive,
      body: (
        <>
          Loads correctly <em>and</em> the most recent review was eyes-on-source by a human within
          the tier window.
        </>
      ),
    },
    {
      kind: 'ai-verified',
      label: 'AI verified',
      color: T.positive,
      body: (
        <>
          Loads correctly and was reviewed within the window, but the most recent pass was
          AI-flavoured — awaiting a human signoff.
        </>
      ),
    },
    {
      kind: 'bot-blocked-verified',
      label: 'Bot-blocked',
      color: T.aiAccent,
      body: (
        <>
          The audit can't reach the URL from CI (a state agency that refuses non-browser user
          agents), but a human verified it loads in a real browser within the last 30 days.
        </>
      ),
    },
    {
      kind: 'intermittent',
      label: 'Intermittent',
      color: T.aiAccent,
      body: (
        <>
          Broken in the latest run but reachable in at least one of the last 3 — held back from
          escalation while the flap clears.
        </>
      ),
    },
    {
      kind: 'overdue',
      label: 'Overdue',
      color: T.warning,
      body: <>No review of any kind within the tier window.</>,
    },
    {
      kind: 'broken',
      label: 'Broken',
      color: T.accent,
      body: <>The audit can't reach the URL and there's no recent human verification.</>,
    },
  ];
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 12,
        rowGap: 8,
        alignItems: 'baseline',
        color: T.inkMuted,
        fontSize: rem(12),
        lineHeight: 1.5,
      }}
    >
      {entries.map((e) => (
        <li key={e.kind} style={{ display: 'contents' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 14,
              paddingTop: 4,
            }}
          >
            <StatusDot kind={e.kind} size={10} showTooltip={false} />
          </span>
          <span>
            <strong style={{ color: e.color }}>{e.label}</strong> — {e.body}
          </span>
        </li>
      ))}
    </ul>
  );
}

type StatTone = 'accent' | 'positive' | 'warning' | 'broken' | 'ai' | 'reference' | 'commercial';

const TONE_COLOR: Record<StatTone | 'default', string> = {
  accent: T.accent,
  positive: T.positive,
  warning: T.warning,
  broken: T.accent,
  // AI provenance and the Reference tier both render in slate-blue. They
  // mean different things ("AI-reviewed" vs "Reference tier") but the
  // user's design decision was to share the colour — Reference sits in
  // the same "supporting / one step removed" register as AI-flavoured
  // review, so the visual rhyme is intentional.
  ai: T.aiAccent,
  reference: T.aiAccent,
  commercial: T.commercialAccent,
  default: T.ink,
};
interface Stat {
  label: string;
  value: number;
  tone?: StatTone;
  /**
   * Optional editorial tooltip surfaced when the user hovers/focuses the
   * label. Used to explain what each cell counts — what a "Primary"
   * source is, how long until a tier goes "Overdue," what makes a row
   * "AI verified" rather than "Human verified," etc.
   */
  tooltip?: string;
}

const TIER_REVIEW_DAYS = {
  primary: STALENESS_THRESHOLDS_DAYS.primary ?? STALENESS_DEFAULT_DAYS,
  reference: STALENESS_THRESHOLDS_DAYS.reference ?? STALENESS_DEFAULT_DAYS,
  commercial: STALENESS_THRESHOLDS_DAYS.commercial ?? STALENESS_DEFAULT_DAYS,
} as const;

function Summary({
  statusByUrl,
  intermittentUrls,
}: {
  statusByUrl: ReadonlyMap<string, string>;
  intermittentUrls: ReadonlySet<string>;
}) {
  const statusSummary = useMemo(
    () => computeStatusSummary(statusByUrl, intermittentUrls),
    [statusByUrl, intermittentUrls],
  );
  // Two semantic rows: composition (what's in the registry by class) on top,
  // current state (how the registry is doing) below. Each row gets four
  // cells, fits cleanly without auto-fit awkwardness.
  const composition: ReadonlyArray<Stat> = [
    {
      label: 'Total cited',
      value: TIER_SUMMARY.total,
      tooltip:
        'Every citation the model relies on, across all categories. Each source has a tier (Primary / Reference / Commercial) that determines how often it gets re-reviewed.',
    },
    {
      label: 'Primary',
      value: TIER_SUMMARY.primary,
      tone: 'positive',
      tooltip: `Direct from the agency or data publisher: federal agencies (IRS, BLS, SSA, HUD, eCFR) and state agencies on their own programs (state DORs, SNAP / Medicaid / CHIP portals). Highest-confidence tier. Re-reviewed every ${TIER_REVIEW_DAYS.primary} days.`,
    },
    {
      label: 'Reference',
      value: TIER_SUMMARY.reference,
      tone: 'reference',
      tooltip: `Peer-respected third-party interpretation, methodology document, or research-org survey (KFF, EPI, CBPP, Tax Foundation, NCSL, AAA, HUD Handbook, Child Care Aware). Public methodology, one step removed from the publisher. Re-reviewed every ${TIER_REVIEW_DAYS.reference} days.`,
    },
    {
      label: 'Commercial',
      value: TIER_SUMMARY.commercial,
      tone: 'commercial',
      tooltip: `Commercial or crowd-sourced data product (Zillow, RentCafe, Care.com, Numbeo). Methodology is proprietary or community-driven, not peer-reviewed; treat with appropriate skepticism. Re-reviewed every ${TIER_REVIEW_DAYS.commercial} days.`,
    },
  ];
  // Status row: per-source health, split by who did the most recent
  // review. "Human verified" is the gold standard (URL live + eyes-on-
  // source within window); "AI verified" is the same health but the
  // latest pass was AI-flavoured, awaiting a human signoff. The audit's
  // purpose is honesty about what's been verified and how — collapsing
  // these into a single "verified" count would launder AI work as the
  // same kind of evidence as human review. Heading uses "Status" rather
  // than "State" to avoid colliding with the dozens of US-state-keyed
  // citations on this page.
  // Status cells stay in their tone colour regardless of count — the
  // colour is what the cell *means*, not "alert level." A cell at zero
  // still represents the same concept and should read as the same colour
  // as a cell at 50, just without anything in that bucket today.
  const status: ReadonlyArray<Stat> = [
    {
      label: 'Human verified',
      value: statusSummary.humanVerified,
      tone: 'positive',
      tooltip:
        'URL is live and the most recent review was eyes-on-source by a human within the tier window. The gold standard.',
    },
    {
      label: 'AI verified',
      value: statusSummary.aiVerified,
      tone: 'ai',
      tooltip:
        'URL is live and reviewed within the tier window, but the most recent review was AI-assisted rather than eyes-on-source by a human. Provisional — awaiting a human pass.',
    },
    {
      label: 'Overdue',
      value: statusSummary.overdue,
      tone: 'warning',
      tooltip: `No review within the tier-specific window (Primary ${TIER_REVIEW_DAYS.primary}d, Reference ${TIER_REVIEW_DAYS.reference}d, Commercial ${TIER_REVIEW_DAYS.commercial}d). Picked up during periodic sweeps.`,
    },
    {
      label: 'Broken',
      value: statusSummary.broken,
      tone: 'broken',
      tooltip:
        'URL is currently unreachable (404 or other error code from the periodic curl audit). Bot-blocked and Intermittent citations are bucketed by their underlying review kind (Human or AI verified) — see the dot colour in the list below for that nuance. Broken here means: actually unreachable AND no recent human browser-verification AND no successful audit run in the last 3.',
    },
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
      <StatRow heading="Status" stats={status} />
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
          <StatCell key={s.label} stat={s} />
        ))}
      </div>
    </div>
  );
}

/**
 * One cell in a summary stat row. Renders the value (large, tone-coloured)
 * and the label (small, uppercase). When the stat carries a `tooltip`, the
 * label gets a dotted underline and a hover/focus tooltip explaining what
 * the cell counts — used to define source tiers and review states without
 * cluttering the page with permanent prose.
 */
function StatCell({ stat }: { stat: Stat }) {
  const [hover, setHover] = useState(false);
  const valueColor = TONE_COLOR[stat.tone ?? 'default'];
  const interactive = !!stat.tooltip;
  // Slugify the label for use in element ids — labels like "Human verified"
  // would otherwise produce ids with spaces, which are invalid HTML and
  // break the aria-describedby relationship for assistive tech.
  const tipId = `stat-tip-${stat.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}`;
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: rem(32),
          fontWeight: 500,
          lineHeight: 1,
          color: valueColor,
        }}
      >
        {stat.value}
      </div>
      <span
        onMouseEnter={() => interactive && setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => interactive && setHover(true)}
        onBlur={() => setHover(false)}
        tabIndex={interactive ? 0 : -1}
        aria-describedby={interactive ? tipId : undefined}
        style={{
          display: 'inline-block',
          fontSize: rem(12),
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: T.inkMuted,
          marginTop: 4,
          cursor: interactive ? 'help' : 'default',
          borderBottom: interactive ? `1px dotted ${T.inkMuted}` : 'none',
          paddingBottom: interactive ? 1 : 0,
        }}
      >
        {stat.label}
      </span>
      {interactive && hover && stat.tooltip && (
        <span
          id={tipId}
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            padding: '8px 12px',
            background: T.ink,
            color: T.bg,
            fontSize: rem(12),
            fontFamily: fonts.body,
            lineHeight: 1.4,
            fontWeight: 400,
            textTransform: 'none',
            letterSpacing: '0.01em',
            borderRadius: 3,
            whiteSpace: 'normal',
            width: 'max-content',
            maxWidth: 'min(280px, calc(100vw - 32px))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          {/* Tooltip label echoes the cell's tone colour so the tooltip
              feels of-a-piece with the number above. Default-tone cells
              (Total cited) keep the cream colour since their valueColor
              is T.ink and dark-on-dark is unreadable. */}
          <span
            style={{
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: valueColor === T.ink ? T.bg : valueColor,
            }}
          >
            {stat.label}
          </span>
          <span style={{ color: T.bg }}> — {stat.tooltip}</span>
        </span>
      )}
    </div>
  );
}

function GroupSection({
  group,
  statusByUrl,
  intermittentUrls,
}: {
  group: Group;
  statusByUrl: ReadonlyMap<string, string>;
  intermittentUrls: ReadonlySet<string>;
}) {
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
          <SourceRow
            key={`${group.title}-${s.url}-${s.label}`}
            source={s}
            statusByUrl={statusByUrl}
            intermittentUrls={intermittentUrls}
          />
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

function SourceRow({
  source,
  statusByUrl,
  intermittentUrls,
}: {
  source: Source;
  statusByUrl: ReadonlyMap<string, string>;
  intermittentUrls: ReadonlySet<string>;
}) {
  const reviews = REVIEWS.get(source.id) ?? [];
  const latest = reviews[0];
  const tier = (source as Source & { tier?: string }).tier;
  const statusKind = getStatusKind(source, statusByUrl, intermittentUrls);

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

      <MetaStrip tier={tier} latestReview={latest ?? null} />

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
  latestReview,
}: {
  tier?: string;
  // Hard-stop convention: every source has at least one row in
  // reviewed.tsv (CI enforces it for new sources, backfill covered the
  // rest). `latestReview` is therefore non-null in production. We type
  // it as nullable for defensive compile-time safety only — if it does
  // somehow arrive null, MetaStrip just renders the tier pill without
  // metadata, which is loud enough that it'll get noticed in review.
  latestReview: Review | null;
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
      {latestReview && <ReviewedFact latestReview={latestReview} />}
    </div>
  );
}

/**
 * Renders the "Human reviewed" / "AI reviewed" line on a /sources row. The
 * verb itself carries the provenance of the latest review:
 *
 *   - Human reviewed (green) — eyes-on-source, no AI assistance.
 *   - AI reviewed (blue)     — AI-assisted or AI-proposed.
 *
 * This pairs with the hollow-green status dot rendered upstream when the
 * latest review is AI-only — two reinforcing signals on the same row.
 */
function ReviewedFact({ latestReview }: { latestReview: Review }) {
  const isAi = latestReview.kind === 'ai';
  const verb = isAi ? 'AI reviewed' : 'Human reviewed';
  const color = isAi ? T.aiAccent : T.positive;
  const handle = latestReview.reviewer?.replace(/^@/, '') ?? null;
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'baseline' }}>
      <span style={{ color, fontWeight: 700 }}>{verb}</span>
      <span style={{ color: T.inkSoft }}>{latestReview.date}</span>
      {handle && (
        <a
          href={`https://github.com/${handle}`}
          target="_blank"
          rel="noreferrer"
          style={{ color: T.accent, textDecoration: 'none' }}
        >
          @{handle}
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
  // Tier colours: green for primary, slate-blue for reference (authoritative
  // but one step removed — not a "warning" colour), gold for commercial
  // (proprietary or crowd-sourced methodology, treat with appropriate skepticism).
  const palette =
    tier === 'primary'
      ? { bg: 'rgba(45, 80, 22, 0.12)', fg: T.positive }
      : tier === 'commercial'
        ? { bg: 'rgba(122, 102, 40, 0.15)', fg: T.commercialAccent }
        : { bg: 'rgba(62, 90, 122, 0.16)', fg: T.aiAccent };
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
 * Compact pill rendering a review's kind — human / ai. Surfaces the level
 * of human involvement honestly: AI assistance is allowed and visible, not
 * absent and laundered. Same shape as TierPill for visual consistency.
 */
function ReviewKindPill({ kind }: { kind: string }) {
  const palette: { bg: string; fg: string; label: string } =
    kind === 'human'
      ? { bg: 'rgba(45, 80, 22, 0.12)', fg: T.positive, label: 'human' }
      : kind === 'ai'
        ? { bg: 'rgba(62, 90, 122, 0.16)', fg: T.aiAccent, label: 'ai' }
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
