/**
 * /design-lab — internal UI variations playground.
 *
 * Not linked from anywhere user-facing. Reachable only by typing the path.
 * Intent: see multiple design variations side-by-side for the same data,
 * pick what reads best, then update the production component.
 *
 * Currently scoped to surfacing review `kind` (human / ai) on /sources
 * rows, the summary block, and the citation popover. Add new sections as
 * future iteration questions come up.
 *
 * Storybook will replace this when the component vocabulary outgrows a
 * single page — for now this is the lighter-weight option.
 */

import React, { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { theme as T, fonts, rem } from '@/theme';
import { Cite } from '@/components/ui';
import type { Source } from '@/types';
import type { ReviewKind } from '@/lib/audit/status';
import { computeBudget } from '@/lib/budget';
import { BENEFIT_IDS } from '@/lib/benefits';
import { computePitZones, type PitZone } from '@/lib/cliffs';
import { fpl } from '@/data/poverty';
import {
  MEDICAID_EXPANSION_LIMIT_FPL,
  STATE_CHIP_LIMIT_FPL,
  STATE_MEDICAID_POLICY,
  snapIncomeLimitFpl,
} from '@/data/benefits';
import { getCityData } from '@/data/cities';

/**
 * Each lab section gets an entry here. The sidebar reads this list to
 * build navigation; the main column maps over it to render. Adding a
 * new iteration topic means adding one row + writing one component.
 */
/**
 * `status: 'open'` means we're still iterating; the section sorts to the
 * top of the sidebar. `status: 'decided'` means a choice has shipped and
 * the section is kept around as a record. `decidedAs` is the short label
 * of the winning variation, surfaced in the status banner.
 */
type LabSectionStatus = 'open' | 'decided';
interface LabSection {
  readonly id: string;
  readonly nav: string;
  readonly count: number;
  readonly Component: React.ComponentType;
  readonly status: LabSectionStatus;
  readonly decidedAs?: string;
  readonly decidedNote?: string;
}
const LAB_SECTIONS: ReadonlyArray<LabSection> = [
  {
    id: 'status-dots',
    nav: 'Status dot palette',
    count: 1,
    Component: SectionStatusDotPalette,
    status: 'decided',
    decidedAs:
      'Single slate-blue family for both audit-caveat states; BBV filled, intermittent hollow',
    decidedNote:
      'Earlier draft introduced a second blue (auditAccent) for bot-blocked / intermittent. Sat too close to slate aiAccent and produced a two-blues collision. Resolution: collapse onto aiAccent, kill auditAccent. Slate-blue now means "machine-flavoured signal" generally — AI provenance for review pills, audit caveat for the dot pair. Hollow/filled is uniformly evidence strength within the family. Green stays reserved for "data verified against the model" (filled = human, hollow = AI). BBV outranks intermittent in `getStatusKind` because BBV has a positive human signal with no contradicting evidence, while intermittent has explicit current "broken" with only historical positive signal.',
  },
  {
    id: 'share',
    nav: 'Share-link affordance',
    count: 5,
    Component: SectionShareAffordance,
    status: 'decided',
    decidedAs: 'V5 — accent text link below the budget output',
    decidedNote:
      'Plain underline (avoids citation-popover collision), no ↗ (avoids "opens externally" misread), placed after DiscretionaryPlan where the share impulse naturally arises.',
  },
  {
    id: 'rows',
    nav: 'Sources row — kind pill',
    count: 9,
    Component: SectionRowVariations,
    status: 'decided',
    decidedAs: 'V9 hollow-green indicator',
    decidedNote: 'Shipped via PR #124.',
  },
  {
    id: 'summary',
    nav: 'Summary stats',
    count: 4,
    Component: SectionSummaryVariations,
    status: 'decided',
    decidedAs: 'V4 — Composition (tier) + Status (health × kind)',
    decidedNote: 'Synthesized from V1–V3 rather than picking one outright.',
  },
  {
    id: 'popover',
    nav: 'Citation popover',
    count: 3,
    Component: SectionPopoverVariations,
    status: 'decided',
    decidedAs: 'V3 — kind suffix (H / AI / AI-P) on the date',
    decidedNote: 'Shipped via PR #119.',
  },
  {
    id: 'tiers',
    nav: 'Source tier naming',
    count: 1,
    Component: SectionTierNaming,
    status: 'decided',
    decidedAs: 'Primary / Reference / Commercial · green / slate-blue / gold',
    decidedNote: 'Shipped via PR #125. Picker preloads to these names; iterate to compare.',
  },
  {
    id: 'cliffs',
    nav: 'Cliff threshold annotations',
    count: 5,
    Component: SectionCliffAnnotations,
    status: 'decided',
    decidedAs: 'V1 — top labels with smart stagger',
    decidedNote:
      'Lowest-row collision-avoidance keeps labels readable when cliffs cluster. Dashed cliff line now extends up to the label so the eye can follow line→label even on bumped rows.',
  },
  {
    id: 'pits',
    nav: 'Pit-zone presentation',
    count: 4,
    Component: SectionPitZones,
    status: 'decided',
    decidedAs: 'V1 — tinted full-height area, uniform warning color',
    decidedNote:
      'Per-program tinting was dropped (see compound-pit V5) — every pit zone uses the same warning color now. Hard to miss without overclaiming attribution.',
  },
  {
    id: 'compound',
    nav: 'Compound pit attribution',
    count: 7,
    Component: SectionCompoundPits,
    status: 'decided',
    decidedAs: 'V5 — uniform warning color, no per-program attribution',
    decidedNote:
      'Attribution-by-color was always going to lie when multiple cliffs contributed to a merged pit. V5 says "something is wrong here" without overclaiming which program. Per-cliff caption below the chart already names the responsible programs in plain language.',
  },
];

export function DesignLab({ onBack }: { onBack: () => void }) {
  // Selected section is sourced from the URL hash so deep-linking and the
  // browser back button work naturally. Default to the first section if
  // there's no hash or the hash doesn't match a known id.
  const [selected, setSelected] = useState<string>(() => initialSection());

  useEffect(() => {
    const onHashChange = () => setSelected(initialSection());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const current = LAB_SECTIONS.find((s) => s.id === selected) ?? LAB_SECTIONS[0];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.ink,
        fontFamily: fonts.body,
        padding: '40px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 1320, margin: '0 auto' }}>
        <Banner onBack={onBack} />
        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          <Sidebar
            selected={current.id}
            onSelect={(id) => {
              // Push a new history entry rather than replacing — back/forward
              // should step through `#rows` → `#summary` → `#tiers` like any
              // navigation. We bypass the anchor jump-to-element because the
              // section is rendered as the entire main column, not as a
              // mid-page anchor; let scrollTo handle the smooth-scroll instead.
              setSelected(id);
              window.history.pushState(null, '', `#${id}`);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
          <main style={{ flex: 1, minWidth: 0 }}>
            <SectionStatusBanner section={current} />
            <current.Component />
          </main>
        </div>
      </div>
    </div>
  );
}

function initialSection(): string {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '');
  return LAB_SECTIONS.some((s) => s.id === hash) ? hash : (LAB_SECTIONS[0]?.id ?? '');
}

/**
 * Sticky sidebar listing every lab section, grouped into two stacks:
 * 'Open for discussion' on top (still iterating), 'Decided' below
 * (shipped, kept as a record). Click a row to switch the main column.
 */
function Sidebar({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  const open = LAB_SECTIONS.filter((s) => s.status === 'open');
  const decided = LAB_SECTIONS.filter((s) => s.status === 'decided');
  return (
    <nav
      aria-label="Design lab sections"
      style={{
        position: 'sticky',
        top: 24,
        flexShrink: 0,
        width: 220,
        padding: '16px 0',
        fontSize: rem(13),
      }}
    >
      <SidebarGroup
        heading="Open for discussion"
        sections={open}
        selected={selected}
        onSelect={onSelect}
      />
      {decided.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SidebarGroup
            heading="Decided"
            sections={decided}
            selected={selected}
            onSelect={onSelect}
            muted
          />
        </div>
      )}
    </nav>
  );
}

function SidebarGroup({
  heading,
  sections,
  selected,
  onSelect,
  muted,
}: {
  heading: string;
  sections: ReadonlyArray<LabSection>;
  selected: string;
  onSelect: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <>
      <div
        style={{
          fontSize: rem(10),
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          color: T.inkMuted,
          fontWeight: 600,
          marginBottom: 12,
          paddingLeft: 12,
        }}
      >
        {heading}
      </div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {sections.map((s) => {
          const isActive = selected === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  borderLeft: isActive ? `2px solid ${T.accent}` : `2px solid ${T.border}`,
                  background: isActive ? T.bgAlt : 'transparent',
                  color: isActive ? T.ink : muted ? T.inkMuted : T.inkSoft,
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  fontWeight: isActive ? 600 : 400,
                  lineHeight: 1.3,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6 }}>
                  {s.status === 'decided' && (
                    <span aria-hidden style={{ color: T.inkMuted, fontSize: rem(10) }}>
                      ✓
                    </span>
                  )}
                  <span>{s.nav}</span>
                </span>
                <span
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: rem(10),
                    color: T.inkMuted,
                    flexShrink: 0,
                  }}
                >
                  {s.count}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/**
 * Shown above each section in the main column. Open sections get a soft
 * "still iterating" banner; decided sections get a green "shipped" banner
 * with the winning variation surfaced so the lab serves as a permanent
 * record of what we picked and why.
 */
function SectionStatusBanner({ section }: { section: LabSection }) {
  if (section.status === 'open') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          marginBottom: 20,
          background: T.bgAlt,
          border: `1px dashed ${T.border}`,
          borderRadius: 4,
          fontSize: rem(12),
          color: T.inkSoft,
          letterSpacing: '0.02em',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            width: 8,
            height: 8,
            borderRadius: '50%',
            border: `1.5px solid ${T.accent}`,
            background: 'transparent',
          }}
          aria-hidden
        />
        <strong style={{ color: T.ink, fontWeight: 600 }}>Open for discussion</strong>
        <span>· no decision shipped yet</span>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        marginBottom: 20,
        background: 'rgba(45, 80, 22, 0.08)',
        border: `1px solid rgba(45, 80, 22, 0.4)`,
        borderRadius: 4,
        fontSize: rem(12),
        color: T.inkSoft,
        letterSpacing: '0.02em',
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'rgb(45, 80, 22)',
        }}
        aria-hidden
      />
      <strong style={{ color: T.ink, fontWeight: 600 }}>Decided</strong>
      {section.decidedAs && (
        <>
          <span>·</span>
          <span style={{ color: T.ink }}>{section.decidedAs}</span>
        </>
      )}
      {section.decidedNote && (
        <>
          <span>·</span>
          <span>{section.decidedNote}</span>
        </>
      )}
    </div>
  );
}

// ── Banner ───────────────────────────────────────────────────────────────
function Banner({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        background: T.accent,
        color: T.bg,
        padding: '14px 20px',
        marginBottom: 32,
        borderRadius: 4,
        fontSize: rem(13),
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div>
        <strong>Design Lab</strong> — internal UI variations playground. Not linked from anywhere
        user-facing; reachable only by typing the path.
      </div>
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          color: T.bg,
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        ← Back to atlas
      </a>
    </div>
  );
}

// ── Shared synthetic data ────────────────────────────────────────────────
//
// Construct fake Source objects for each tier × kind combination so we can
// exercise the rendering paths visually. Real production data goes through
// the REVIEWS / SOURCES module-level constants — these synthetic copies
// just feed the visual primitives directly.

interface SyntheticRow {
  source: Source;
  kind: ReviewKind;
  reviewedAt: string;
  reviewer: string;
  broken?: boolean;
}

const SYNTHETIC_ROWS: readonly SyntheticRow[] = [
  {
    source: makeSrc('lab-primary-human', 'IRS Rev. Proc. 2025-32', 'primary'),
    kind: 'human',
    reviewedAt: '2026-05-03',
    reviewer: 'briancorbin',
  },
  {
    source: makeSrc('lab-primary-ai-1', 'BLS Consumer Expenditure Survey', 'primary'),
    kind: 'ai',
    reviewedAt: '2026-05-03',
    reviewer: 'briancorbin',
  },
  {
    source: makeSrc('lab-reference-ai-2', 'KFF Employer Health Benefits', 'reference'),
    kind: 'ai',
    reviewedAt: '2026-05-02',
    reviewer: 'briancorbin',
  },
  {
    source: makeSrc('lab-commercial-human', 'Zillow Observed Rent Index', 'commercial'),
    kind: 'human',
    reviewedAt: '2026-05-03',
    reviewer: 'briancorbin',
  },
  {
    source: makeSrc(
      'lab-reference-broken-human',
      'Child Care Aware State Fact Sheets',
      'reference',
    ),
    kind: 'human',
    reviewedAt: '2026-04-10',
    reviewer: 'briancorbin',
    broken: true,
  },
  {
    source: makeSrc('lab-reference-broken-ai', 'HUD FMR Archive Page', 'reference'),
    kind: 'ai',
    reviewedAt: '2026-04-22',
    reviewer: 'briancorbin',
    broken: true,
  },
];

function makeSrc(id: string, label: string, tier: 'primary' | 'reference' | 'commercial'): Source {
  return {
    id,
    label,
    url: 'https://example.com',
    tier,
    addedBy: 'briancorbin',
    addedAt: '2026-05-02',
  };
}

// ── Section: /sources row variations ─────────────────────────────────────
function SectionRowVariations() {
  return (
    <Section
      heading="/sources row — kind pill placement"
      subhead="Each variation renders the same 5 rows. Compare how readable the kind signal is across placements."
    >
      <Variation
        title="V1 — Pill next to TierPill (current, hidden for human)"
        description="Skip rendering for `human` since it's the baseline expectation."
      >
        <RowSetV1 />
      </Variation>
      <Variation
        title="V2 — Pill always shown including human"
        description="Always-visible kind pill. More signal, more visual weight."
      >
        <RowSetV2 />
      </Variation>
      <Variation
        title="V3 — Kind as text suffix on the reviewer line"
        description="Inline with the existing metadata; no extra pill."
      >
        <RowSetV3 />
      </Variation>
      <Variation
        title="V4 — Small icon prefix on reviewer (👤 / 🤝 / 🤖)"
        description="Maximum density; legibility depends on font support."
      >
        <RowSetV4 />
      </Variation>
      <Variation
        title="V5 — Status dot turns blue when AI-only (no human yet)"
        description="Encodes review provenance into the existing status dot: green = human-verified, blue = AI-reviewed but awaiting a human pass, amber = overdue/never. No extra pill needed."
      >
        <RowSetV5 />
      </Variation>
      <Variation
        title="V6 — Hollow green ring when AI-only"
        description="Same three-color palette. Filled green = human-verified; hollow green ring = AI-reviewed, awaiting a human pass. Says 'same kind of state, just provisional' — and degrades gracefully for colorblind users since shape carries info."
      >
        <RowSetV6 />
      </Variation>
      <Variation
        title="V7 — Status dot stays health-only; small AI badge for provenance"
        description="Dot encodes only URL health + recency (verified/overdue/broken). A separate AI badge flags provenance when a human hasn't reviewed yet. Treats the two axes as orthogonal."
      >
        <RowSetV7 />
      </Variation>
      <Variation
        title='V8 — "Reviewed" label says "AI reviewed" or "Human reviewed"'
        description="No new visual primitives. The verb itself carries the provenance, color-keyed (green = human, blue = AI). Maximum legibility, lowest visual cost — but the metadata line gets longer."
      >
        <RowSetV8 />
      </Variation>
      <Variation
        title="V9 — V6 + V8 (hollow ring AND labeled verb)"
        description="Belt-and-suspenders: hollow green ring for AI-only at the dot, plus the explicit 'AI reviewed' / 'Human reviewed' verb in the metadata line. Two reinforcing signals — redundant if you trust either one alone, robust if you don't."
        decided
      >
        <RowSetV9 />
      </Variation>
    </Section>
  );
}

const AI_ONLY_BLUE = '#3E5A7A';

type LabStatus = 'verified' | 'overdue' | 'ai-only' | 'broken';

const LAB_STATUS_PALETTE: Record<LabStatus, { color: string; short: string; long: string }> = {
  verified: {
    color: T.positive,
    short: 'Verified',
    long: 'Loads correctly and has been reviewed by a human within its window.',
  },
  overdue: {
    color: T.warning,
    short: 'Overdue',
    long: 'No review within the tier-specific window. Pick this up during a periodic sweep.',
  },
  'ai-only': {
    color: AI_ONLY_BLUE,
    short: 'AI-reviewed',
    long: 'Loads correctly and has been reviewed with AI assistance, but a human has not yet given it a pass.',
  },
  broken: {
    color: T.accent,
    short: 'Broken',
    long: 'URL is currently unreachable (404 / error). Needs a fix in src/data/sources.ts paired with a row in reviewed.tsv.',
  },
};

function rowStatus(r: SyntheticRow): LabStatus {
  if (r.broken) return 'broken';

  return 'verified';
}

function rowStatusV5(r: SyntheticRow): LabStatus {
  if (r.broken) return 'broken';

  if (r.kind === 'human') return 'verified';
  return 'ai-only';
}

function LabStatusDot({
  status,
  size = 10,
  hollow = false,
}: {
  status: LabStatus;
  size?: number;
  /** When true, render the dot as a ring (filled border only). V6 uses this for `ai-only`. */
  hollow?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const basePalette = LAB_STATUS_PALETTE[status];
  // Hollow rendering on a `verified` dot means "AI-reviewed, awaiting human" —
  // override the tooltip copy so it doesn't falsely claim a human pass.
  const palette =
    hollow && status === 'verified'
      ? {
          color: basePalette.color,
          short: 'AI-reviewed',
          long: 'Loads correctly and has been reviewed with AI assistance, but a human has not yet given it a pass.',
        }
      : basePalette;
  const ringWidth = Math.max(2, Math.round(size / 5));
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        alignSelf: 'flex-start',
        marginTop: 5,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={0}
      role="img"
      aria-label={`${palette.short}: ${palette.long}`}
    >
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: hollow ? 'transparent' : palette.color,
          boxShadow: hollow ? `inset 0 0 0 ${ringWidth}px ${palette.color}` : 'none',
        }}
      />
      {hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
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
            maxWidth: 'min(260px, calc(100vw - 32px))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontWeight: 600, color: palette.color }}>{palette.short}</span>
          <span style={{ color: T.bg }}> — {palette.long}</span>
        </span>
      )}
    </span>
  );
}

function MockRow({
  children,
  status = 'verified',
  hollow = false,
  badge,
}: {
  children: React.ReactNode;
  status?: LabStatus;
  hollow?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '12px 16px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        marginBottom: 8,
        borderRadius: 3,
      }}
    >
      <LabStatusDot status={status} hollow={hollow} />
      {badge}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

const AI_BADGE_BLUE = '#3E5A7A';

function AiBadge() {
  const [hover, setHover] = useState(false);
  const long =
    'AI helped propose or extract this entry; a human has not done an independent eyes-on-source pass.';
  return (
    <span
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={0}
      role="img"
      aria-label={`AI provenance. ${long}`}
      style={{
        position: 'relative',
        alignSelf: 'flex-start',
        marginTop: 3,
        fontSize: rem(9),
        fontFamily: fonts.mono,
        fontWeight: 700,
        letterSpacing: '0.05em',
        padding: '2px 5px',
        borderRadius: 2,
        background: AI_BADGE_BLUE,
        color: T.bg,
        flexShrink: 0,
        lineHeight: 1.2,
      }}
    >
      AI
      {hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
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
            maxWidth: 'min(260px, calc(100vw - 32px))',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontWeight: 600, color: AI_BADGE_BLUE }}>AI</span>
          <span> — {long}</span>
        </span>
      )}
    </span>
  );
}

/** V7 dot mapping: provenance lives in the badge, so the dot ignores kind. */
function rowStatusHealthOnly(r: SyntheticRow): LabStatus {
  if (r.broken) return 'broken';

  return 'verified';
}

function RowSetV1() {
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => (
        <MockRow key={r.source.id} status={rowStatus(r)}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
          <div
            style={{
              fontSize: rem(11),
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.inkMuted,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              fontWeight: 600,
            }}
          >
            <Pill
              bg={tierBg(r.source.tier)}
              fg={tierFg(r.source.tier)}
              label={r.source.tier ?? '—'}
            />
            {r.kind !== 'human' && <Pill bg={kindBg(r.kind)} fg={kindFg(r.kind)} label={r.kind} />}
            <span>
              Reviewed {r.reviewedAt ?? '—'} · {r.reviewer ? `@${r.reviewer}` : 'never'}
            </span>
          </div>
        </MockRow>
      ))}
    </>
  );
}

function RowSetV2() {
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => (
        <MockRow key={r.source.id} status={rowStatus(r)}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
          <div
            style={{
              fontSize: rem(11),
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.inkMuted,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              fontWeight: 600,
            }}
          >
            <Pill
              bg={tierBg(r.source.tier)}
              fg={tierFg(r.source.tier)}
              label={r.source.tier ?? '—'}
            />
            <Pill bg={kindBg(r.kind)} fg={kindFg(r.kind)} label={r.kind} />
            <span>
              Reviewed {r.reviewedAt ?? '—'} · {r.reviewer ? `@${r.reviewer}` : 'never'}
            </span>
          </div>
        </MockRow>
      ))}
    </>
  );
}

function RowSetV3() {
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => (
        <MockRow key={r.source.id} status={rowStatus(r)}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
          <div
            style={{
              fontSize: rem(11),
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.inkMuted,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              fontWeight: 600,
            }}
          >
            <Pill
              bg={tierBg(r.source.tier)}
              fg={tierFg(r.source.tier)}
              label={r.source.tier ?? '—'}
            />
            <span>
              Reviewed {r.reviewedAt} · @{r.reviewer}
              <span style={{ color: kindFg(r.kind), marginLeft: 6 }}>· {r.kind}</span>
            </span>
          </div>
        </MockRow>
      ))}
    </>
  );
}

function RowSetV4() {
  const icon = (k: ReviewKind | 'never') => (k === 'human' ? '👤' : k === 'ai' ? '🤖' : '·');
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => (
        <MockRow key={r.source.id} status={rowStatus(r)}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
          <div
            style={{
              fontSize: rem(11),
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.inkMuted,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              fontWeight: 600,
            }}
          >
            <Pill
              bg={tierBg(r.source.tier)}
              fg={tierFg(r.source.tier)}
              label={r.source.tier ?? '—'}
            />
            <span>
              <span style={{ marginRight: 4 }}>{icon(r.kind)}</span>
              Reviewed {r.reviewedAt ?? '—'} · {r.reviewer ? `@${r.reviewer}` : 'never'}
            </span>
          </div>
        </MockRow>
      ))}
    </>
  );
}

function RowSetV5() {
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => (
        <MockRow key={r.source.id} status={rowStatusV5(r)}>
          <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
          <div
            style={{
              fontSize: rem(11),
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: T.inkMuted,
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              flexWrap: 'wrap',
              fontWeight: 600,
            }}
          >
            <Pill
              bg={tierBg(r.source.tier)}
              fg={tierFg(r.source.tier)}
              label={r.source.tier ?? '—'}
            />
            <span>
              Reviewed {r.reviewedAt ?? '—'} · {r.reviewer ? `@${r.reviewer}` : 'never'}
            </span>
          </div>
        </MockRow>
      ))}
    </>
  );
}

function RowSetV6() {
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => {
        // Health-only dot status; the hollow flag conveys "AI-only" on top.
        const aiOnly = r.kind === 'ai';
        const status = rowStatusHealthOnly(r);
        return (
          <MockRow
            key={r.source.id}
            status={status}
            // Only hollow when the underlying state is "verified" — broken/overdue
            // should stay solid so the alert reads loudly.
            hollow={aiOnly && status === 'verified'}
          >
            <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
            <div
              style={{
                fontSize: rem(11),
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: T.inkMuted,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                fontWeight: 600,
              }}
            >
              <Pill
                bg={tierBg(r.source.tier)}
                fg={tierFg(r.source.tier)}
                label={r.source.tier ?? '—'}
              />
              <span>
                Reviewed {r.reviewedAt ?? '—'} · {r.reviewer ? `@${r.reviewer}` : 'never'}
              </span>
            </div>
          </MockRow>
        );
      })}
    </>
  );
}

function RowSetV7() {
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => {
        const status = rowStatusHealthOnly(r);
        const badge = r.kind === 'ai' ? <AiBadge /> : null;
        return (
          <MockRow key={r.source.id} status={status} badge={badge}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
            <div
              style={{
                fontSize: rem(11),
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: T.inkMuted,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                fontWeight: 600,
              }}
            >
              <Pill
                bg={tierBg(r.source.tier)}
                fg={tierFg(r.source.tier)}
                label={r.source.tier ?? '—'}
              />
              <span>
                Reviewed {r.reviewedAt ?? '—'} · {r.reviewer ? `@${r.reviewer}` : 'never'}
              </span>
            </div>
          </MockRow>
        );
      })}
    </>
  );
}

function RowSetV8() {
  // "AI REVIEWED" / "HUMAN REVIEWED" prefix on the metadata line itself.
  const prefix = (k: ReviewKind | 'never'): { text: string; color: string } | null => {
    if (k === 'never') return null;
    if (k === 'human') return { text: 'Human reviewed', color: T.positive };
    return { text: 'AI reviewed', color: AI_BADGE_BLUE };
  };
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => {
        const p = prefix(r.kind);
        return (
          <MockRow key={r.source.id} status={rowStatusHealthOnly(r)}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
            <div
              style={{
                fontSize: rem(11),
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: T.inkMuted,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                fontWeight: 600,
              }}
            >
              <Pill
                bg={tierBg(r.source.tier)}
                fg={tierFg(r.source.tier)}
                label={r.source.tier ?? '—'}
              />
              <span>
                {p ? (
                  <span style={{ color: p.color, fontWeight: 700 }}>{p.text}</span>
                ) : (
                  <span>Never reviewed</span>
                )}{' '}
                {r.reviewedAt ?? ''} · {r.reviewer ? `@${r.reviewer}` : 'never'}
              </span>
            </div>
          </MockRow>
        );
      })}
    </>
  );
}

function RowSetV9() {
  const prefix = (k: ReviewKind | 'never'): { text: string; color: string } | null => {
    if (k === 'never') return null;
    if (k === 'human') return { text: 'Human reviewed', color: T.positive };
    return { text: 'AI reviewed', color: AI_BADGE_BLUE };
  };
  return (
    <>
      {SYNTHETIC_ROWS.map((r) => {
        const aiOnly = r.kind === 'ai';
        const status = rowStatusHealthOnly(r);
        const p = prefix(r.kind);
        return (
          <MockRow key={r.source.id} status={status} hollow={aiOnly && status === 'verified'}>
            <div style={{ marginBottom: 4, fontWeight: 500 }}>{r.source.label}</div>
            <div
              style={{
                fontSize: rem(11),
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: T.inkMuted,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
                fontWeight: 600,
              }}
            >
              <Pill
                bg={tierBg(r.source.tier)}
                fg={tierFg(r.source.tier)}
                label={r.source.tier ?? '—'}
              />
              <span>
                {p ? (
                  <span style={{ color: p.color, fontWeight: 700 }}>{p.text}</span>
                ) : (
                  <span>Never reviewed</span>
                )}{' '}
                {r.reviewedAt ?? ''} · {r.reviewer ? `@${r.reviewer}` : 'never'}
              </span>
            </div>
          </MockRow>
        );
      })}
    </>
  );
}

// ── Section: Summary stats variations ────────────────────────────────────
function SectionSummaryVariations() {
  return (
    <Section
      heading="/sources summary block — kind breakdown"
      subhead="Variations on how the per-kind counts surface alongside Composition and State. The shipped design (V4) borrows from several of these explorations rather than picking one outright; V1–V3 are kept as a record of the alternatives that informed it."
    >
      <Variation
        title="V4 — Composition (tier) + Status (health × kind), as shipped"
        description="Two rows: Composition splits the tier mix (Primary / Reference / Commercial); Status splits per-source health by who did the latest review (Human verified / AI verified / Overdue / Broken). Mirrors what /sources renders today."
        decided
      >
        <SummaryV4 />
      </Variation>
      <Variation
        title="V1 — Three rows: Composition / Review kinds / State"
        description="Mirrors Composition's shape. Each row has 4 cells."
      >
        <SummaryV1 />
      </Variation>
      <Variation
        title="V2 — State row inlines kind breakdown"
        description="Compact; fewer rows. Trade-off: State row is now 7 cells, denser."
      >
        <SummaryV2 />
      </Variation>
      <Variation
        title="V3 — Kind matrix as a small table"
        description="Tier × Kind matrix. Useful if both dimensions matter together."
      >
        <SummaryV3 />
      </Variation>
    </Section>
  );
}

function SummaryV4() {
  return (
    <SummaryShell>
      <StatRow heading="Composition">
        <Stat label="Total cited" value={229} />
        <Stat label="Primary" value={92} tone="positive" />
        <Stat label="Reference" value={123} tone="reference" />
        <Stat label="Commercial" value={14} tone="commercial" />
      </StatRow>
      <Divider />
      <StatRow heading="Status">
        <Stat label="Human verified" value={5} tone="positive" />
        <Stat label="AI verified" value={171} tone="ai" />
        <Stat label="Overdue" value={53} tone="warning" />
        <Stat label="Broken" value={0} tone="broken" />
      </StatRow>
    </SummaryShell>
  );
}

const FAKE_SUMMARY = {
  total: 229,
  original: 11,
  reference: 218,
  estimate: 0,
  reviewedHuman: 5,
  reviewedAi: 224,
  verified: 18,
  overdue: 211,
  broken: 53,
};

function SummaryV1() {
  return (
    <SummaryShell>
      <StatRow heading="Composition">
        <Stat label="Total cited" value={FAKE_SUMMARY.total} />
        <Stat label="Original" value={FAKE_SUMMARY.original} tone="positive" />
        <Stat label="Reference" value={FAKE_SUMMARY.reference} />
        <Stat label="Estimate" value={FAKE_SUMMARY.estimate} />
      </StatRow>
      <Divider />
      <StatRow heading="Review kinds">
        <Stat label="Human" value={FAKE_SUMMARY.reviewedHuman} tone="positive" />
        <Stat label="AI" value={FAKE_SUMMARY.reviewedAi} tone="warning" />
      </StatRow>
      <Divider />
      <StatRow heading="State">
        <Stat label="Verified" value={FAKE_SUMMARY.verified} tone="positive" />
        <Stat label="Overdue" value={FAKE_SUMMARY.overdue} tone="warning" />
        <Stat label="Broken" value={FAKE_SUMMARY.broken} tone="accent" />
      </StatRow>
    </SummaryShell>
  );
}

function SummaryV2() {
  return (
    <SummaryShell>
      <StatRow heading="Composition">
        <Stat label="Total cited" value={FAKE_SUMMARY.total} />
        <Stat label="Original" value={FAKE_SUMMARY.original} tone="positive" />
        <Stat label="Reference" value={FAKE_SUMMARY.reference} />
        <Stat label="Estimate" value={FAKE_SUMMARY.estimate} />
      </StatRow>
      <Divider />
      <StatRow heading="State + reviews">
        <Stat label="Verified" value={FAKE_SUMMARY.verified} tone="positive" />
        <Stat label="Overdue" value={FAKE_SUMMARY.overdue} tone="warning" />
        <Stat label="Broken" value={FAKE_SUMMARY.broken} tone="accent" />
        <Stat label="Human" value={FAKE_SUMMARY.reviewedHuman} tone="positive" small />
        <Stat label="AI" value={FAKE_SUMMARY.reviewedAi} tone="warning" small />
      </StatRow>
    </SummaryShell>
  );
}

function SummaryV3() {
  // Tier × Kind grid. Counts faked for shape only.
  return (
    <SummaryShell>
      <div
        style={{
          fontSize: rem(11),
          color: T.inkMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        Tier × kind matrix
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px repeat(2, 1fr)',
          gap: 8,
          fontSize: rem(13),
        }}
      >
        <span></span>
        <Cell label="Human" tone="positive" />
        <Cell label="AI" tone="warning" />

        <RowLabel>Original</RowLabel>
        <Cell label="3" />
        <Cell label="8" />

        <RowLabel>Reference</RowLabel>
        <Cell label="2" />
        <Cell label="216" />

        <RowLabel>Estimate</RowLabel>
        <Cell label="0" />
        <Cell label="0" />
      </div>
    </SummaryShell>
  );
}

// ── Section: Citation popover variations ─────────────────────────────────
function SectionPopoverVariations() {
  return (
    <Section
      heading="Citation popover — kind in row metadata"
      subhead="Hover the citation pill below each variation to see the popover; rows show different kind treatments."
    >
      <Variation
        title="V1 — Live popover from the actual component (uses real REVIEWS data)"
        description="Kind pill rendered for non-human rows. None of the ALL_SOURCES references in this lab match a real review id, so no kind appears here yet."
      >
        <p style={{ fontSize: rem(13), color: T.inkSoft, marginBottom: 12 }}>
          Here is a citation: <Cite source={SYNTHETIC_ROWS[0].source} /> — click it to see the
          popover.
        </p>
      </Variation>
      <Variation
        title="V2 — Static mock with kind pill always visible"
        description="If we always show the kind, even for human, what does it look like?"
      >
        <PopoverMockV2 />
      </Variation>
      <Variation
        title="V3 — Kind as a tiny suffix character (H / AI / AI-P) prefixing the date"
        description="Maximum compactness; legible at a glance once you learn the codes. Shipped as the production behavior."
        decided
      >
        <PopoverMockV3 />
      </Variation>
    </Section>
  );
}

function PopoverMockV2() {
  return (
    <PopoverShell>
      {SYNTHETIC_ROWS.map((r, i) => (
        <PopoverRow key={i}>
          <PopoverDot row={r} />
          <div style={{ flex: 1 }}>
            <span style={{ color: T.ink }}>{r.source.label}</span>{' '}
            <span style={{ color: T.accent, fontWeight: 600 }}>↗</span>
            <div
              style={{
                fontSize: rem(11),
                color: T.inkMuted,
                marginTop: 2,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Pill
                bg={tierBg(r.source.tier)}
                fg={tierFg(r.source.tier)}
                label={r.source.tier ?? '—'}
              />
              <Pill bg={kindBg(r.kind)} fg={kindFg(r.kind)} label={r.kind} />
              <span>{r.reviewedAt}</span>
            </div>
          </div>
        </PopoverRow>
      ))}
    </PopoverShell>
  );
}

function PopoverMockV3() {
  const code = (k: ReviewKind | 'never') => (k === 'human' ? 'H' : k === 'ai' ? 'AI' : '—');
  return (
    <PopoverShell>
      {SYNTHETIC_ROWS.map((r, i) => (
        <PopoverRow key={i}>
          <PopoverDot row={r} />
          <div style={{ flex: 1 }}>
            <span style={{ color: T.ink }}>{r.source.label}</span>{' '}
            <span style={{ color: T.accent, fontWeight: 600 }}>↗</span>
            <div
              style={{
                fontSize: rem(11),
                color: T.inkMuted,
                marginTop: 2,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Pill
                bg={tierBg(r.source.tier)}
                fg={tierFg(r.source.tier)}
                label={r.source.tier ?? '—'}
              />
              <span>
                <span
                  style={{
                    color: kindFg(r.kind),
                    fontWeight: 700,
                    marginRight: 4,
                  }}
                >
                  {code(r.kind)}
                </span>
                {r.reviewedAt ?? '—'}
              </span>
            </div>
          </div>
        </PopoverRow>
      ))}
    </PopoverShell>
  );
}

// ── Section: Tier naming variations ──────────────────────────────────────
//
// "Reference" is currently a catch-all in src/data/sources.ts — operational
// handbooks, peer-respected research orgs, commercial aggregators, and 200+
// state-agency landing pages all share the label. "Estimate" is unused (zero
// rows in the registry). We're considering renaming/restructuring the tier
// vocabulary; this section shows the candidates side-by-side so we can
// eyeball them in pill form before committing to a refactor.
//
// Each variation shows the three (or four) tier labels rendered as the
// existing TierPill (same shape as production) with a one-line description
// of what each tier covers under that scheme.

/**
 * Color presets for tier pills. Each entry is a {bg, fg} pair tuned for the
 * editorial palette. Add new presets here to compare them across candidates.
 *
 * Lab convention: vary the middle-tier color across candidates so we can
 * eyeball olive / brown / inkSoft / etc. on the actual layout rather than
 * picking abstractly.
 */
const TIER_COLORS = {
  green: {
    bg: 'rgba(45, 80, 22, 0.12)',
    fg: T.positive,
    description: 'Forest green — editorial "positive" tone. Reads as authoritative / trusted.',
  },
  red: {
    bg: 'rgba(166, 38, 28, 0.10)',
    fg: T.accent,
    description: 'Editorial red — past Reference color. Reads as "warning"; pulls focus.',
  },
  inkSoft: {
    bg: 'rgba(90, 79, 66, 0.12)',
    fg: T.inkSoft,
    description: 'Muted warm brown — neutral metadata color, recedes visually.',
  },
  olive: {
    bg: 'rgba(92, 92, 45, 0.14)',
    fg: '#5C5C2D',
    description: 'Olive (chart palette #5C5C2D). Distinctive, editorial, slightly rustic.',
  },
  brown: {
    bg: 'rgba(122, 78, 42, 0.14)',
    fg: '#7A4E2A',
    description: 'Warm brown (chart palette #7A4E2A). Slightly richer than inkSoft.',
  },
  slateBlue: {
    bg: 'rgba(62, 90, 122, 0.16)',
    fg: T.aiAccent,
    description: 'Slate-blue (aiAccent). Cool, supporting tone — also used for AI provenance.',
  },
  amber: {
    bg: 'rgba(184, 116, 43, 0.18)',
    fg: T.warning,
    description: 'Burnt orange (warning). Past Estimate color; reads as "caution".',
  },
  teal: {
    bg: 'rgba(58, 110, 110, 0.14)',
    fg: '#3A6E6E',
    description: 'Teal (chart palette #3A6E6E). Cool and editorial; distinct from slate-blue.',
  },
  mauve: {
    bg: 'rgba(138, 74, 110, 0.13)',
    fg: '#8A4A6E',
    description: 'Mauve / wine (chart palette #8A4A6E). Warm, distinctive, slightly playful.',
  },
  warmGray: {
    bg: 'rgba(133, 120, 106, 0.14)',
    fg: T.inkMuted,
    description: 'Warm gray (inkMuted). Even more neutral than inkSoft; nearly background-tier.',
  },
  gold: {
    bg: 'rgba(154, 130, 50, 0.15)',
    fg: '#7A6628',
    description:
      'Deep gold — between olive and amber. Reads as commercial / aggregated without alarm.',
  },
} as const;
type TierColorKey = keyof typeof TIER_COLORS;

/**
 * Role within a 3- (or 4-) tier scheme. The picker at the top of the
 * tier-naming section maps each role to a color preset; candidates use
 * `role` rather than `color` so all of them re-render together when you
 * swap the picker. Tier4 is only used by candidate A (which has Estimate).
 */
type TierRole = 'tier1' | 'tier2' | 'tier3';

/**
 * Stable per-role meaning. Whatever name we pick for a tier, what it
 * represents semantically doesn't change — Primary is the publisher of the
 * underlying data, Reference is a peer-respected interpretation one step
 * removed, Commercial/Aggregator-style sources are commercial / crowd-sourced
 * data products. Captured in one place so the live preview reads coherently
 * regardless of which name the picker has selected.
 */
const TIER_MEANINGS: Record<TierRole, string> = {
  tier1:
    'Publisher of the underlying data or rule. Federal agencies + state agencies on their own programs.',
  tier2:
    'Peer-respected third-party interpretation, methodology document, or original research-org survey.',
  tier3: 'Commercial or crowd-sourced data product — methodology proprietary or community-driven.',
};

/**
 * Candidate names for each tier role plus a one-line tradeoff for each.
 * The picker walks these lists; the description surfaces both as a native
 * hover title AND as inline help text for whichever option is currently
 * picked, so the rationale is visible without hovering.
 */
interface NameOption {
  readonly name: string;
  readonly description: string;
}
const TIER_NAME_OPTIONS: Record<TierRole, ReadonlyArray<NameOption>> = {
  tier1: [
    {
      name: 'Primary',
      description:
        'Standard term for the source closest to the data — agency / statutory text / publisher of record.',
    },
    {
      name: 'Original',
      description: 'Past terminology. Emphasizes that this tier produces the data themselves.',
    },
    {
      name: 'Source',
      description: 'Generic but clear — these are the source of the data, not an interpreter.',
    },
    {
      name: 'Authoritative',
      description: 'Highlights the trust dimension explicitly. Slightly grandiose.',
    },
  ],
  tier2: [
    {
      name: 'Reference',
      description:
        'Peer-respected third-party interpretation, methodology document, or research-org survey.',
    },
    {
      name: 'Secondary',
      description: 'Academic taxonomy — interprets primaries. Loses the trust gradient.',
    },
    {
      name: 'Curated',
      description: 'Emphasizes editorial selection over raw aggregation.',
    },
    {
      name: 'Interpretive',
      description: 'Names the act of interpreting primary data. Slightly clinical.',
    },
  ],
  tier3: [
    {
      name: 'Commercial',
      description:
        'Plain English — for-profit data products. Mild stretch for Numbeo (free + ad-supported, paid product side).',
    },
    {
      name: 'Aggregator',
      description: 'Accurate domain term but slightly jargon-y.',
    },
    {
      name: 'Industry',
      description:
        "Sidesteps the 'is Numbeo really commercial?' debate. Neutral; reads as 'industry-side, not government / research.'",
    },
    {
      name: 'Estimate',
      description: 'Past terminology. Implies approximation; currently unused (zero rows).',
    },
    {
      name: 'Tertiary',
      description: 'Academic taxonomy. Numeric tier without semantic content.',
    },
    {
      name: 'Vendor',
      description: 'Names the kind of organization. Slightly transactional.',
    },
  ],
};

/**
 * What's actually in production today (`tier?: 'primary' | 'reference' |
 * 'commercial'` in src/types.ts). The picker initializes here; a "Reset to
 * shipped" button in the picker chrome snaps back to it.
 */
const SHIPPED_NAMES: Record<TierRole, string> = {
  tier1: 'Primary',
  tier2: 'Reference',
  tier3: 'Commercial',
};

type RoleColors = Record<TierRole, TierColorKey>;

/**
 * Defaults match the shipped palette in src/data/sources.ts:
 * primary = green, reference = slate-blue, commercial = gold. The picker
 * preloads here so a fresh visit to the lab shows what production looks
 * like; tweak swatches above to compare alternatives.
 */
const DEFAULT_ROLE_COLORS: RoleColors = {
  tier1: 'green',
  tier2: 'slateBlue',
  tier3: 'gold',
};

const ROLE_LABELS: Record<TierRole, string> = {
  tier1: 'Top tier',
  tier2: 'Middle tier',
  tier3: 'Bottom tier',
};

function SectionTierNaming() {
  // Names + colors are picked independently per tier role. The section
  // renders two cards above the pickers: a static record of what shipped
  // (always present, marked decided) and a live preview that reflects the
  // current picker state. The live preview never carries the `decided`
  // flag — it stays anchored to the right of the shipped card regardless
  // of whether the picks happen to match shipped, so the layout doesn't
  // jump as you compare alternatives.
  const [colors, setColors] = useState<RoleColors>(DEFAULT_ROLE_COLORS);
  const [names, setNames] = useState<Record<TierRole, string>>(SHIPPED_NAMES);

  const namesShipped =
    names.tier1 === SHIPPED_NAMES.tier1 &&
    names.tier2 === SHIPPED_NAMES.tier2 &&
    names.tier3 === SHIPPED_NAMES.tier3;
  const colorsShipped =
    colors.tier1 === DEFAULT_ROLE_COLORS.tier1 &&
    colors.tier2 === DEFAULT_ROLE_COLORS.tier2 &&
    colors.tier3 === DEFAULT_ROLE_COLORS.tier3;

  return (
    <Section
      heading="Source tier — naming + color picker"
      subhead="The card on the left is what we shipped; the card on the right reflects the current pickers. Tweak names and colors below to compare alternatives — the layout stays put."
    >
      <Variation
        title="Shipped — what we selected"
        description="A static record of the production tier scheme."
        decided
      >
        <TierLivePreview names={SHIPPED_NAMES} colors={DEFAULT_ROLE_COLORS} />
      </Variation>
      <Variation
        title="Live preview"
        description="Every change to the pickers below re-renders this preview."
      >
        <TierLivePreview names={names} colors={colors} />
      </Variation>
      <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <NamePickerRow
          names={names}
          onChange={setNames}
          matchesShipped={namesShipped}
          onResetShipped={() => setNames(SHIPPED_NAMES)}
        />
        <ColorPickerRow
          colors={colors}
          onChange={setColors}
          matchesShipped={colorsShipped}
          onResetShipped={() => setColors(DEFAULT_ROLE_COLORS)}
        />
      </div>
    </Section>
  );
}

function TierLivePreview({
  names,
  colors,
}: {
  names: Record<TierRole, string>;
  colors: RoleColors;
}) {
  const roles: ReadonlyArray<TierRole> = ['tier1', 'tier2', 'tier3'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {roles.map((role) => {
          const preset = TIER_COLORS[colors[role]];
          return <Pill key={role} bg={preset.bg} fg={preset.fg} label={names[role]} />;
        })}
      </div>
      <ul
        style={{ margin: 0, paddingLeft: 16, color: T.inkSoft, fontSize: rem(12), lineHeight: 1.5 }}
      >
        {roles.map((role) => {
          const nameOpt = TIER_NAME_OPTIONS[role].find((o) => o.name === names[role]);
          // Prefer the picked name's connotation; fall back to the stable
          // role meaning if the name isn't one of the candidates (shouldn't
          // happen via the picker, but guards against future direct edits).
          const description = nameOpt?.description ?? TIER_MEANINGS[role];
          return (
            <li key={role} style={{ marginBottom: 4 }}>
              <span style={{ color: TIER_COLORS[colors[role]].fg, fontWeight: 700 }}>
                {names[role]}
              </span>{' '}
              — {description}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function NamePickerRow({
  names,
  onChange,
  matchesShipped,
  onResetShipped,
}: {
  names: Record<TierRole, string>;
  onChange: (n: Record<TierRole, string>) => void;
  matchesShipped: boolean;
  onResetShipped: () => void;
}) {
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        background: T.surface,
        borderRadius: 4,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: rem(11),
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: T.inkMuted,
            fontWeight: 600,
          }}
        >
          Name picker — drives the live preview
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12 }}>
          {matchesShipped && (
            <span
              style={{
                fontSize: rem(10),
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 600,
                color: 'rgb(45, 80, 22)',
              }}
            >
              ✓ Matches shipped
            </span>
          )}
          <button
            type="button"
            onClick={onResetShipped}
            disabled={matchesShipped}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: matchesShipped ? 'default' : 'pointer',
              fontFamily: fonts.body,
              fontSize: rem(11),
              color: matchesShipped ? T.inkMuted : T.inkSoft,
              textDecoration: matchesShipped ? 'none' : 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: 3,
              letterSpacing: '0.02em',
            }}
          >
            Reset to shipped
          </button>
        </div>
      </div>
      {(Object.keys(ROLE_LABELS) as TierRole[]).map((role) => {
        const activeOption = TIER_NAME_OPTIONS[role].find((o) => o.name === names[role]);
        return (
          <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ minWidth: 110, fontSize: rem(12), fontWeight: 600, color: T.inkSoft }}>
                {ROLE_LABELS[role]}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {TIER_NAME_OPTIONS[role].map((option) => {
                  const isActive = names[role] === option.name;
                  const isShipped = SHIPPED_NAMES[role] === option.name;
                  return (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => onChange({ ...names, [role]: option.name })}
                      aria-pressed={isActive}
                      title={option.description}
                      style={{
                        cursor: 'pointer',
                        border: isActive ? `2px solid ${T.ink}` : `1px solid ${T.border}`,
                        background: isActive ? T.bgAlt : T.bg,
                        color: T.ink,
                        padding: '4px 10px',
                        borderRadius: 2,
                        fontFamily: fonts.body,
                        fontSize: rem(12),
                        fontWeight: isActive ? 600 : 400,
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: 4,
                      }}
                    >
                      {option.name}
                      {isShipped && (
                        <span
                          aria-label="shipped"
                          title="Shipped value"
                          style={{ color: 'rgb(45, 80, 22)', fontSize: rem(10) }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {activeOption && (
              <div
                style={{
                  paddingLeft: 122,
                  fontSize: rem(11),
                  color: T.inkMuted,
                  fontStyle: 'italic',
                  lineHeight: 1.4,
                }}
              >
                {activeOption.description}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ColorPickerRow({
  colors,
  onChange,
  matchesShipped,
  onResetShipped,
}: {
  colors: RoleColors;
  onChange: (c: RoleColors) => void;
  matchesShipped: boolean;
  onResetShipped: () => void;
}) {
  const presetKeys = Object.keys(TIER_COLORS) as TierColorKey[];
  return (
    <div
      style={{
        border: `1px solid ${T.border}`,
        background: T.surface,
        borderRadius: 4,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            fontSize: rem(11),
            textTransform: 'uppercase',
            letterSpacing: '0.18em',
            color: T.inkMuted,
            fontWeight: 600,
          }}
        >
          Color picker — drives the live preview
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12 }}>
          {matchesShipped && (
            <span
              style={{
                fontSize: rem(10),
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                fontWeight: 600,
                color: 'rgb(45, 80, 22)',
              }}
            >
              ✓ Matches shipped
            </span>
          )}
          <button
            type="button"
            onClick={onResetShipped}
            disabled={matchesShipped}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: matchesShipped ? 'default' : 'pointer',
              fontFamily: fonts.body,
              fontSize: rem(11),
              color: matchesShipped ? T.inkMuted : T.inkSoft,
              textDecoration: matchesShipped ? 'none' : 'underline',
              textDecorationStyle: 'dotted',
              textUnderlineOffset: 3,
              letterSpacing: '0.02em',
            }}
          >
            Reset to shipped
          </button>
        </div>
      </div>
      {(Object.keys(ROLE_LABELS) as TierRole[]).map((role) => {
        const activeColor = TIER_COLORS[colors[role]];
        return (
          <div key={role} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span
                style={{
                  minWidth: 110,
                  fontSize: rem(12),
                  fontWeight: 600,
                  color: T.inkSoft,
                }}
              >
                {ROLE_LABELS[role]}
              </span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {presetKeys.map((k) => {
                  const isActive = colors[role] === k;
                  const isShipped = DEFAULT_ROLE_COLORS[role] === k;
                  const preset = TIER_COLORS[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => onChange({ ...colors, [role]: k })}
                      aria-pressed={isActive}
                      title={isShipped ? `${preset.description} (shipped)` : preset.description}
                      style={{
                        cursor: 'pointer',
                        border: isActive ? `2px solid ${T.ink}` : `1px solid ${T.border}`,
                        background: preset.bg,
                        color: preset.fg,
                        padding: '4px 10px',
                        borderRadius: 2,
                        fontFamily: fonts.mono,
                        fontSize: rem(10),
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        display: 'inline-flex',
                        alignItems: 'baseline',
                        gap: 4,
                      }}
                    >
                      {k}
                      {isShipped && (
                        <span
                          aria-label="shipped"
                          style={{ color: 'rgb(45, 80, 22)', fontSize: rem(10) }}
                        >
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div
              style={{
                paddingLeft: 122,
                fontSize: rem(11),
                color: T.inkMuted,
                fontStyle: 'italic',
                lineHeight: 1.4,
              }}
            >
              {activeColor.description}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tiny primitives ──────────────────────────────────────────────────────
function Section({
  heading,
  subhead,
  columns = 'auto',
  children,
}: {
  heading: string;
  subhead?: string;
  /** 'auto' = responsive multi-column (default for compact variations).
   *  1 = single column, full width — for visualization variations that need
   *  the horizontal room to breathe. */
  columns?: 'auto' | 1;
  children: React.ReactNode;
}) {
  // Sort decided variations to the front so the chosen design is the first
  // thing the eye lands on. Variations are JSX children, so we partition on
  // the `decided` prop of each <Variation> element.
  const sorted = sortVariationsDecidedFirst(children);
  return (
    <section style={{ marginBottom: 56 }}>
      <h2
        style={{
          fontFamily: fonts.display,
          fontSize: rem(28),
          fontWeight: 500,
          marginBottom: 6,
          letterSpacing: '-0.01em',
        }}
      >
        {heading}
      </h2>
      {subhead && (
        <p style={{ fontSize: rem(14), color: T.inkSoft, marginBottom: 24, maxWidth: '70ch' }}>
          {subhead}
        </p>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns === 1 ? '1fr' : 'repeat(auto-fit, minmax(420px, 1fr))',
          gap: 24,
        }}
      >
        {sorted}
      </div>
    </section>
  );
}

function sortVariationsDecidedFirst(children: React.ReactNode): React.ReactNode[] {
  const arr = React.Children.toArray(children);
  const decided: React.ReactNode[] = [];
  const rest: React.ReactNode[] = [];
  for (const child of arr) {
    if (React.isValidElement<{ decided?: boolean }>(child) && child.props.decided === true) {
      decided.push(child);
    } else {
      rest.push(child);
    }
  }
  return [...decided, ...rest];
}

function Variation({
  title,
  description,
  decided,
  children,
}: {
  title: string;
  description?: string;
  /** Mark this variation as the shipped/selected one. Sorts to the top of the
   *  section and gets a green-bordered "Selected" badge. */
  decided?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: decided ? `1.5px solid rgb(45, 80, 22)` : `1px dashed ${T.border}`,
        background: decided ? 'rgba(45, 80, 22, 0.04)' : 'transparent',
        padding: 18,
        borderRadius: 4,
        boxShadow: decided ? '0 1px 0 rgba(45, 80, 22, 0.08)' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 4,
        }}
      >
        <div style={{ fontSize: rem(13), fontWeight: 600, color: T.ink }}>{title}</div>
        {decided && (
          <span
            style={{
              fontSize: rem(10),
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 600,
              color: 'rgb(45, 80, 22)',
              background: 'rgba(45, 80, 22, 0.12)',
              padding: '2px 8px',
              borderRadius: 2,
              whiteSpace: 'nowrap',
            }}
          >
            ✓ Selected
          </span>
        )}
      </div>
      {description && (
        <div style={{ fontSize: rem(12), color: T.inkSoft, marginBottom: 16 }}>{description}</div>
      )}
      {children}
    </div>
  );
}

function Pill({ bg, fg, label }: { bg: string; fg: string; label: string }) {
  return (
    <span
      style={{
        fontSize: rem(10),
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        background: bg,
        color: fg,
        padding: '2px 8px',
        borderRadius: 2,
      }}
    >
      {label}
    </span>
  );
}

function tierBg(tier?: string) {
  if (tier === 'primary') return 'rgba(45, 80, 22, 0.12)';
  if (tier === 'commercial') return 'rgba(122, 102, 40, 0.15)';
  return 'rgba(62, 90, 122, 0.16)';
}
function tierFg(tier?: string) {
  if (tier === 'primary') return T.positive;
  if (tier === 'commercial') return T.commercialAccent;
  return T.aiAccent;
}
function kindBg(kind: ReviewKind | 'never') {
  if (kind === 'human') return 'rgba(45, 80, 22, 0.12)';
  if (kind === 'ai') return 'rgba(62, 90, 122, 0.16)';
  return 'rgba(0, 0, 0, 0.06)';
}
function kindFg(kind: ReviewKind | 'never') {
  if (kind === 'human') return T.positive;
  if (kind === 'ai') return T.aiAccent;
  return T.inkMuted;
}

function SummaryShell({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        padding: '20px 24px',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 4,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      {children}
    </section>
  );
}

function Divider() {
  return <div style={{ height: 1, background: T.border, opacity: 0.6 }} />;
}

function StatRow({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        style={{
          fontSize: rem(11),
          color: T.inkMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
          fontWeight: 600,
          marginBottom: 10,
        }}
      >
        {heading}
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>{children}</div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  small,
}: {
  label: string;
  value: number;
  tone?: 'positive' | 'warning' | 'accent' | 'reference' | 'commercial' | 'ai' | 'broken';
  small?: boolean;
}) {
  const color =
    tone === 'positive'
      ? T.positive
      : tone === 'warning'
        ? T.warning
        : tone === 'accent'
          ? T.accent
          : tone === 'reference'
            ? T.aiAccent
            : tone === 'commercial'
              ? T.commercialAccent
              : tone === 'ai'
                ? T.aiAccent
                : tone === 'broken'
                  ? T.accent
                  : T.ink;
  return (
    <div style={{ minWidth: small ? 80 : 110 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: rem(small ? 22 : 30),
          fontWeight: 500,
          color,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: rem(11),
          color: T.inkMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function Cell({ label, tone }: { label: string; tone?: 'positive' | 'warning' | 'accent' }) {
  const color =
    tone === 'positive'
      ? T.positive
      : tone === 'warning'
        ? T.warning
        : tone === 'accent'
          ? T.accent
          : T.ink;
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '6px 4px',
        background: 'rgba(0,0,0,0.02)',
        color,
        fontWeight: 600,
        fontSize: rem(13),
      }}
    >
      {label}
    </div>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: rem(11),
        color: T.inkMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontWeight: 600,
        alignSelf: 'center',
      }}
    >
      {children}
    </div>
  );
}

function PopoverShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: '8px 0',
        maxWidth: 360,
        boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
        fontFamily: fonts.body,
        fontSize: rem(12),
      }}
    >
      {children}
    </div>
  );
}

function PopoverRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '6px 14px',
        lineHeight: 1.4,
      }}
    >
      {children}
    </div>
  );
}

function PopoverDot({ row }: { row: SyntheticRow }) {
  return <LabStatusDot status={rowStatusV5(row)} size={8} />;
}

// ── Section: Share-link affordance ───────────────────────────────────────
//
// The share affordance is a meta action — it copies a URL, it doesn't
// modify the household model. So it shouldn't compete visually with the
// input controls. These variations explore quieter placements and styles.
// Each variation mocks just enough surrounding chrome (the panel header,
// the lifestyle row) so the placement reads in context.

function SectionShareAffordance() {
  return (
    <Section
      heading="Share-link affordance"
      subhead="Where the 'Share this view' control lives in the Customize panel and how prominent it should be. It's a meta action (copy a URL) so it shouldn't read as another input."
    >
      <Variation
        title="V1 — Quiet text link in the panel header (current)"
        description="Sits inline with the 'CUSTOMIZE' label, right-aligned. Dotted underline + arrow. Lowest visual prominence; reads as utility, not input."
      >
        <ShareMockHeader variant="quiet-link" />
      </Variation>
      <Variation
        title="V2 — Outlined button on its own row"
        description="Standalone button at the bottom of the panel, right-aligned. Clear affordance but feels like another control. (Previous prototype.)"
      >
        <ShareMockBottom variant="outlined-button" />
      </Variation>
      <Variation
        title="V3 — Accent-colored link inline at end of inputs"
        description="Tucked at the bottom-right of the lifestyle row. Same dotted underline as V1 but accent-colored to nudge prominence up slightly."
      >
        <ShareMockInline />
      </Variation>
      <Variation
        title="V4 — Floating chip pinned to the panel corner"
        description="Absolute-positioned at the top-right of the panel, hovering above the inputs. Visually distinct, but introduces a free-floating element that doesn't reflow."
      >
        <ShareMockChip />
      </Variation>
      <Variation
        title="V5 — V1', placed after the data"
        description="Same editorial text-link spirit as V1, but: accent-colored (findable without shouting), plain underline (avoids the dotted-underline-means-citation collision), no ↗ (the arrow reads as 'opens externally' but this copies), placed below the budget output where 'I should share this' is the natural impulse."
        decided
      >
        <ShareMockPostData />
      </Variation>
    </Section>
  );
}

/** Minimal mock of the panel header row used by V1. */
function ShareMockHeader({ variant }: { variant: 'quiet-link' }) {
  return (
    <PanelShell>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontSize: rem(11),
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: T.accent,
            fontWeight: 600,
          }}
        >
          Customize
        </div>
        <FakeShareLink tone={variant === 'quiet-link' ? 'soft' : 'soft'} />
      </div>
      <FakeInputRow />
    </PanelShell>
  );
}

/** Mock of the panel bottom row used by V2 (standalone button). */
function ShareMockBottom({ variant }: { variant: 'outlined-button' }) {
  return (
    <PanelShell>
      <PanelHeading />
      <FakeInputRow />
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          style={{
            padding: '10px 18px',
            background: T.bg,
            color: T.ink,
            border: `1px solid ${T.border}`,
            fontFamily: fonts.body,
            fontSize: rem(13),
            letterSpacing: '0.04em',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Share this view
        </button>
      </div>
      <span aria-hidden style={{ display: 'none' }}>
        {variant}
      </span>
    </PanelShell>
  );
}

/** Mock with the share link tucked at the end of the lifestyle row (V3). */
function ShareMockInline() {
  return (
    <PanelShell>
      <PanelHeading />
      <div
        style={{ marginBottom: 8, fontSize: rem(11), color: T.inkSoft, letterSpacing: '0.05em' }}
      >
        LIFESTYLE LEVEL
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4, flex: 1 }}>
          {['Modest', 'Moderate', 'Comfortable'].map((l, i) => (
            <div
              key={l}
              style={{
                flex: 1,
                padding: '10px',
                background: i === 1 ? T.ink : T.bg,
                color: i === 1 ? T.bg : T.ink,
                border: `1px solid ${i === 1 ? T.ink : T.border}`,
                fontFamily: fonts.body,
                fontSize: rem(13),
                letterSpacing: '0.02em',
                textAlign: 'center',
              }}
            >
              {l}
            </div>
          ))}
        </div>
        <FakeShareLink tone="accent" />
      </div>
    </PanelShell>
  );
}

/** Mock with a floating chip in the panel's top-right corner (V4). */
function ShareMockChip() {
  return (
    <PanelShell relative>
      <div
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          background: T.bgAlt,
          border: `1px solid ${T.border}`,
          borderRadius: 999,
          fontFamily: fonts.body,
          fontSize: rem(11),
          color: T.inkSoft,
          letterSpacing: '0.04em',
          cursor: 'pointer',
        }}
      >
        Share view ↗
      </div>
      <PanelHeading />
      <FakeInputRow />
    </PanelShell>
  );
}

/** Visual shell that mimics the Customize panel chrome. */
function PanelShell({ children, relative }: { children: React.ReactNode; relative?: boolean }) {
  return (
    <div
      style={{
        position: relative ? 'relative' : 'static',
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: '18px 20px',
      }}
    >
      {children}
    </div>
  );
}

function PanelHeading() {
  return (
    <div
      style={{
        fontSize: rem(11),
        letterSpacing: '0.18em',
        textTransform: 'uppercase',
        color: T.accent,
        fontWeight: 600,
        marginBottom: 18,
      }}
    >
      Customize
    </div>
  );
}

/** Cheap stand-in for the dense input grid — just enough to feel real. */
function FakeInputRow() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {['Modest', 'Moderate', 'Comfortable'].map((l, i) => (
        <div
          key={l}
          style={{
            flex: 1,
            padding: '10px',
            background: i === 1 ? T.ink : T.bg,
            color: i === 1 ? T.bg : T.ink,
            border: `1px solid ${i === 1 ? T.ink : T.border}`,
            fontFamily: fonts.body,
            fontSize: rem(13),
            letterSpacing: '0.02em',
            textAlign: 'center',
          }}
        >
          {l}
        </div>
      ))}
    </div>
  );
}

function FakeShareLink({ tone }: { tone: 'soft' | 'accent' }) {
  return (
    <span
      style={{
        fontFamily: fonts.body,
        fontSize: rem(12),
        color: tone === 'accent' ? T.accent : T.inkSoft,
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: 3,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
      }}
    >
      Share this view ↗
    </span>
  );
}

/**
 * V5 mock: places the share link below the budget output rather than in
 * the inputs panel. Mocks a fake "discretionary" stat block and puts the
 * share affordance immediately under it, where "I should send this to
 * someone" is the natural impulse.
 */
function ShareMockPostData() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: rem(11),
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: T.accent,
            fontWeight: 600,
          }}
        >
          Discretionary
        </div>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: rem(28),
            fontWeight: 500,
            color: T.ink,
            lineHeight: 1.1,
          }}
        >
          $4,182<span style={{ fontSize: rem(14), color: T.inkSoft }}> / mo</span>
        </div>
        <div style={{ fontSize: rem(12), color: T.inkSoft }}>
          After taxes, FICA, rent, groceries, childcare, and benefits.
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span
          aria-hidden
          style={{
            fontSize: rem(12),
            color: T.inkSoft,
            letterSpacing: '0.02em',
          }}
        >
          Send this to someone:
        </span>
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: rem(13),
            color: T.accent,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Copy share link
        </span>
      </div>
    </div>
  );
}

// ── Section: cliff threshold annotations ─────────────────────────────────
//
// All five variations render the same income-sweep curve for one fixed
// scenario (Columbus, OH · HoH · 2 kids · $40K), where SNAP, Medicaid, and
// CHIP cutoffs cluster between $33K and $58K. Only the annotation
// strategy differs. A second scenario (NYC · single · no kids · $30K)
// renders below each variation to stress-test how each strategy handles
// fewer cliffs spread further apart — to surface designs that look great
// with three close cliffs but break down with one or two.

function SectionCliffAnnotations() {
  return (
    <Section
      columns={1}
      heading="Cliff threshold annotations"
      subhead="The Medicaid/SNAP/CHIP cutoffs cluster within $25K of each other for a Columbus household. The challenge: identify which vertical line is which program without overprinting labels, eating chart real estate, or burying the curve."
    >
      <Variation
        decided
        title="V1 — Top labels with smart stagger (current production)"
        description="Labels above each ReferenceLine; collisions auto-bump to a higher row. The dashed cliff line extends up to bumped labels so the eye can follow line→label."
      >
        <CliffStack Renderer={CliffChartTopLabelsStaggered} />
      </Variation>
      <Variation
        title="V2 — Bottom-axis tags below the X axis"
        description="Each cutoff gets a small color-coded tag below the axis at the right dollar amount. Chart stays clean above the curve; eye tracks dashed line down to its tag."
      >
        <CliffStack Renderer={CliffChartBottomAxisTags} />
      </Variation>
      <Variation
        title="V3 — Inline labels riding the curve at the drop"
        description="Each label sits next to the actual cliff drop on the curve, anchored to the data instead of floating overhead. Self-evidently which line maps to which program."
      >
        <CliffStack Renderer={CliffChartInlineAtDrop} />
      </Variation>
      <Variation
        title="V4 — Numbered markers + legend"
        description="Tiny ① ② ③ markers on the curve at each cliff; the legend below decodes them. Maximum chart cleanliness, minimum visual weight."
      >
        <CliffStack Renderer={CliffChartNumberedMarkers} />
      </Variation>
      <Variation
        title="V5 — Color-banded eligibility regions"
        description="Soft horizontal background bands shade the income ranges where each program is active. The transitions between bands ARE the cliffs — no separate markers needed. Reads as a stacked-area / state-of-the-world view."
      >
        <CliffStack Renderer={CliffChartColorBands} />
      </Variation>
    </Section>
  );
}

/** Renders the variation against the canonical Columbus scenario, which
 *  has all three program cutoffs clustered together — the hard case for
 *  any annotation strategy. */
function CliffStack({ Renderer }: { Renderer: React.ComponentType<CliffScenarioProps> }) {
  return (
    <Renderer scenarioLabel="Columbus, OH · HoH · 2 kids · $40K" scenario={CLIFF_SCENARIO_CMH} />
  );
}

interface CliffScenario {
  city: string;
  kids: number;
  filing: import('@/types').FilingStatus;
  lifestyle: import('@/types').Lifestyle;
  hasPartner: boolean;
  incomeA: number;
  incomeB: number;
}

interface CliffScenarioProps {
  scenarioLabel: string;
  scenario: CliffScenario;
}

const CLIFF_SCENARIO_CMH: CliffScenario = {
  city: 'cmh',
  kids: 2,
  filing: 'head',
  lifestyle: 'moderate',
  hasPartner: false,
  incomeA: 40000,
  incomeB: 0,
};

const CLIFF_COLORS: Record<string, string> = {
  snap: T.warning,
  medicaid: T.accent,
  chip: T.aiAccent,
};

interface CliffPoint {
  gross: number;
  discretionary: number;
}

interface CliffMark {
  id: string;
  label: string;
  shortLabel: string;
  gross: number;
  color: string;
}

/**
 * Compute the income-sweep curve and cliff thresholds for a scenario. Mirrors
 * the production CliffCurve component's math but returns plain data so each
 * variation can render annotations differently without re-doing the work.
 */
function useCliffScenario(scenario: CliffScenario): {
  points: CliffPoint[];
  cliffs: CliffMark[];
  pitZones: PitZone[];
  maxGross: number;
  currentGross: number;
} {
  return React.useMemo(() => {
    const cityData = getCityData(scenario.city);
    const householdSize = (scenario.hasPartner ? 2 : 1) + scenario.kids;
    const allBenefits = new Set<string>(BENEFIT_IDS);
    const currentGross = scenario.incomeA + scenario.incomeB;
    const maxGross = Math.max(120_000, Math.ceil((currentGross * 1.5) / 1000) * 1000);
    const stepSize = 500;

    const points: CliffPoint[] = [];
    for (let g = 0; g <= maxGross; g += stepSize) {
      const sweepIncomeA = Math.max(0, g - scenario.incomeB);
      const r = computeBudget({
        incomeA: sweepIncomeA,
        incomeB: scenario.incomeB,
        hasPartner: scenario.hasPartner,
        filing: scenario.filing,
        city: scenario.city,
        kids: scenario.kids,
        lifestyle: scenario.lifestyle,
        claimedBenefits: allBenefits,
      });
      points.push({ gross: g, discretionary: Math.round(r.annualDiscretionary) });
    }

    const fplBase = fpl(householdSize);
    const cliffs: CliffMark[] = [];

    cliffs.push({
      id: 'snap',
      label: `SNAP (${Math.round(snapIncomeLimitFpl(cityData.state) * 100)}% FPL)`,
      shortLabel: 'SNAP',
      gross: Math.round(fplBase * snapIncomeLimitFpl(cityData.state)),
      color: CLIFF_COLORS.snap,
    });

    const policy = STATE_MEDICAID_POLICY[cityData.state];
    if (policy.expanded) {
      cliffs.push({
        id: 'medicaid',
        label: `Medicaid (138% FPL)`,
        shortLabel: 'Medicaid',
        gross: Math.round(fplBase * MEDICAID_EXPANSION_LIMIT_FPL),
        color: CLIFF_COLORS.medicaid,
      });
    } else if (scenario.kids > 0 && policy.nonExpansionParentLimit !== undefined) {
      const pct = Math.round(policy.nonExpansionParentLimit * 100);
      cliffs.push({
        id: 'medicaid',
        label: `Medicaid parents (${pct}% FPL)`,
        shortLabel: 'Medicaid',
        gross: Math.round(fplBase * policy.nonExpansionParentLimit),
        color: CLIFF_COLORS.medicaid,
      });
    }

    if (scenario.kids > 0) {
      const chipLimit = STATE_CHIP_LIMIT_FPL[cityData.state];
      cliffs.push({
        id: 'chip',
        label: `CHIP (${Math.round(chipLimit * 100)}% FPL)`,
        shortLabel: 'CHIP',
        gross: Math.round(fplBase * chipLimit),
        color: CLIFF_COLORS.chip,
      });
    }

    const visibleCliffs = cliffs
      .filter((c) => c.gross > 0 && c.gross <= maxGross)
      .sort((a, b) => a.gross - b.gross);
    const pitZones = computePitZones(points, 'discretionary', visibleCliffs);
    return {
      points,
      cliffs: visibleCliffs,
      pitZones,
      maxGross,
      currentGross,
    };
  }, [scenario]);
}

function ScenarioFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      style={{ background: T.surface, border: `1px solid ${T.border}`, padding: '12px 12px 8px' }}
    >
      <div
        style={{
          fontSize: rem(10),
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: T.inkMuted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

const fmtK = (v: number) => (v === 0 ? '$0' : `$${Math.round(v / 1000)}K`);

/** Common pit-zone shading used in cliff-annotation variations so they
 *  reflect production. Uniform warning color per the decided pit-zone
 *  presentation (V1 uniform). */
function renderPitZones(zones: readonly PitZone[]) {
  return zones.map((z, i) => (
    <ReferenceArea
      key={`pit-${i}`}
      x1={z.x1}
      x2={z.x2}
      fill={T.warning}
      fillOpacity={0.12}
      stroke={T.warning}
      strokeOpacity={0.3}
      strokeDasharray="2 3"
    />
  ));
}

// V1 — Top labels with smart stagger (mirrors current production)
function CliffChartTopLabelsStaggered({ scenarioLabel, scenario }: CliffScenarioProps) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(scenario);

  // Stagger: each label takes the lowest row where it doesn't overlap any
  // already-placed label at that row.
  const minSpacing = maxGross * 0.05;
  const placed: { gross: number; row: number }[] = [];
  const annotated = cliffs.map((c) => {
    let row = 0;
    while (placed.some((p) => p.row === row && Math.abs(p.gross - c.gross) < minSpacing)) {
      row += 1;
    }
    placed.push({ gross: c.gross, row });
    return { ...c, row };
  });
  const maxRow = annotated.reduce((m, c) => Math.max(m, c.row), 0);

  return (
    <ScenarioFrame label={scenarioLabel}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 16 + maxRow * 13, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {annotated.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              label={(props: { viewBox?: { x?: number; y?: number } }) => {
                const x = props.viewBox?.x ?? 0;
                const y = props.viewBox?.y ?? 0;
                const labelY = y - 4 - c.row * 13;
                return (
                  <g>
                    {c.row > 0 && (
                      <line
                        x1={x}
                        x2={x}
                        y1={y}
                        y2={labelY + 2}
                        stroke={c.color}
                        strokeDasharray="3 3"
                        strokeWidth={1}
                      />
                    )}
                    <text x={x} y={labelY} fill={c.color} fontSize={10} textAnchor="middle">
                      {c.shortLabel}
                    </text>
                  </g>
                );
              }}
            />
          ))}
          {renderPitZones(pitZones)}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </ScenarioFrame>
  );
}

// V2 — Bottom-axis tags below the X axis
function CliffChartBottomAxisTags({ scenarioLabel, scenario }: CliffScenarioProps) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(scenario);

  return (
    <ScenarioFrame label={scenarioLabel}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 36 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {cliffs.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              label={(props: { viewBox?: { x?: number; y?: number; height?: number } }) => {
                const x = props.viewBox?.x ?? 0;
                const y = (props.viewBox?.y ?? 0) + (props.viewBox?.height ?? 0);
                return (
                  <g transform={`translate(${x}, ${y + 6})`}>
                    <rect x={-32} y={0} width={64} height={16} fill={c.color} rx={2} />
                    <text
                      x={0}
                      y={11}
                      fill={T.bg}
                      fontSize={10}
                      textAnchor="middle"
                      fontWeight={600}
                    >
                      {c.shortLabel}
                    </text>
                  </g>
                );
              }}
            />
          ))}
          {renderPitZones(pitZones)}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </ScenarioFrame>
  );
}

// V3 — Inline labels at the drop
function CliffChartInlineAtDrop({ scenarioLabel, scenario }: CliffScenarioProps) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(scenario);

  // For each cliff, find the discretionary value just before the drop —
  // that's where we anchor the label.
  const annotated = cliffs.map((c) => {
    let before = points[0];
    for (const p of points) {
      if (p.gross <= c.gross) before = p;
      else break;
    }
    return { ...c, anchorY: before.discretionary };
  });

  return (
    <ScenarioFrame label={scenarioLabel}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 8, right: 70, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {annotated.map((c) => (
            <ReferenceDot
              key={c.id}
              x={c.gross}
              y={c.anchorY}
              r={3}
              fill={c.color}
              stroke={T.bg}
              strokeWidth={1.5}
              ifOverflow="visible"
              label={(props: { viewBox?: { cx?: number; cy?: number } }) => (
                <g
                  transform={`translate(${(props.viewBox?.cx ?? 0) + 8}, ${(props.viewBox?.cy ?? 0) - 2})`}
                >
                  <text fill={c.color} fontSize={10} fontWeight={600}>
                    {c.shortLabel}
                  </text>
                </g>
              )}
            />
          ))}
          {renderPitZones(pitZones)}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </ScenarioFrame>
  );
}

// V4 — Numbered markers + legend
function CliffChartNumberedMarkers({ scenarioLabel, scenario }: CliffScenarioProps) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(scenario);

  const annotated = cliffs.map((c, i) => {
    let before = points[0];
    for (const p of points) {
      if (p.gross <= c.gross) before = p;
      else break;
    }
    return { ...c, anchorY: before.discretionary, num: i + 1 };
  });

  return (
    <ScenarioFrame label={scenarioLabel}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {annotated.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="2 4"
              strokeOpacity={0.6}
            />
          ))}
          {renderPitZones(pitZones)}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {annotated.map((c) => (
            <ReferenceDot
              key={c.id}
              x={c.gross}
              y={c.anchorY}
              r={9}
              fill={c.color}
              stroke={T.bg}
              strokeWidth={2}
              ifOverflow="visible"
              label={(props: { viewBox?: { cx?: number; cy?: number } }) => (
                <text
                  x={props.viewBox?.cx ?? 0}
                  y={(props.viewBox?.cy ?? 0) + 3}
                  fill={T.bg}
                  fontSize={10}
                  textAnchor="middle"
                  fontWeight={700}
                >
                  {c.num}
                </text>
              )}
            />
          ))}
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: rem(11),
          color: T.inkSoft,
          marginTop: 6,
        }}
      >
        {annotated.map((c) => (
          <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 16,
                height: 16,
                borderRadius: '50%',
                background: c.color,
                color: T.bg,
                textAlign: 'center',
                lineHeight: '16px',
                fontSize: rem(10),
                fontWeight: 700,
              }}
            >
              {c.num}
            </span>
            {c.label}
          </span>
        ))}
      </div>
    </ScenarioFrame>
  );
}

// V5 — Color-banded eligibility regions
function CliffChartColorBands({ scenarioLabel, scenario }: CliffScenarioProps) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(scenario);

  // Build sorted ascending cutoff list; each "region" is the interval
  // between two consecutive cutoffs (or 0 / maxGross at the bookends).
  // Each region's tint shows which programs are still active in it.
  const sortedCliffs = [...cliffs].sort((a, b) => a.gross - b.gross);
  interface Region {
    x1: number;
    x2: number;
    activeIds: string[];
  }
  const regions: Region[] = [];
  let prev = 0;
  // At income = 0, every program is active. As we cross each cutoff (in
  // ascending order), the program at that cutoff drops out.
  let active = sortedCliffs.map((c) => c.id);
  for (const c of sortedCliffs) {
    regions.push({ x1: prev, x2: c.gross, activeIds: [...active] });
    active = active.filter((id) => id !== c.id);
    prev = c.gross;
  }
  regions.push({ x1: prev, x2: maxGross, activeIds: [] });

  return (
    <ScenarioFrame label={scenarioLabel}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          {regions.map((r, i) => {
            // Tint: blend region color from the most "valuable" remaining
            // program (medicaid > chip > snap, by editorial weight). Using
            // a soft 8% opacity so it whispers rather than shouts.
            const dominant = r.activeIds.includes('medicaid')
              ? CLIFF_COLORS.medicaid
              : r.activeIds.includes('chip')
                ? CLIFF_COLORS.chip
                : r.activeIds.includes('snap')
                  ? CLIFF_COLORS.snap
                  : 'transparent';
            return (
              <ReferenceArea
                key={i}
                x1={r.x1}
                x2={r.x2}
                fill={dominant}
                fillOpacity={dominant === 'transparent' ? 0 : 0.08}
                stroke="none"
              />
            );
          })}
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {renderPitZones(pitZones)}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          fontSize: rem(11),
          color: T.inkSoft,
          marginTop: 6,
        }}
      >
        {sortedCliffs.map((c) => (
          <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <span
              style={{
                display: 'inline-block',
                width: 12,
                height: 12,
                background: c.color,
                opacity: 0.5,
              }}
            />
            {c.label} ends at {fmtK(c.gross)}
          </span>
        ))}
      </div>
    </ScenarioFrame>
  );
}

// ── Section: pit-zone presentation ───────────────────────────────────────
//
// Four ways to depict the income ranges where the household is worse off
// than at some lower income. All render against the canonical Columbus
// scenario where two pits exist (Medicaid and CHIP).

function SectionPitZones() {
  return (
    <Section
      columns={1}
      heading="Pit-zone presentation"
      subhead="Four ways to depict the income ranges where the household ends up with less than they'd have at some lower income. The data is identical; only the visual encoding changes."
    >
      <Variation
        decided
        title="V1 — Tinted full-height area (current production)"
        description="ReferenceArea spans the full chart height for each pit, uniformly tinted in the warning color. Hard to miss; doesn't claim per-program attribution."
      >
        <PitChartTintedArea />
      </Variation>
      <Variation
        title="V2 — Recolored line segment in the pit"
        description="Don't shade the background; instead, recolor the curve itself in pit segments to the program's accent. Chart stays clean; the pit is communicated by the line's color change rather than a tint."
      >
        <PitChartColoredSegment />
      </Variation>
      <Variation
        title="V3 — Ghost 'best-so-far' line"
        description="Render a faded line showing the running max of the metric. The visible gap between the actual curve and the ghost IS the pit. Powerful because it visually quantifies depth — you can see exactly how much money is being left on the table."
      >
        <PitChartGhostLine />
      </Variation>
      <Variation
        title="V4 — Bottom-band brackets"
        description="Pit ranges marked only by a small color-coded bracket along the X axis, not as background fill. Maximum chart cleanliness; pits are signaled but don't dominate the visual."
      >
        <PitChartBottomBand />
      </Variation>
    </Section>
  );
}

function PitChartTintedArea() {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(CLIFF_SCENARIO_CMH);
  return (
    <ScenarioFrame label="Columbus, OH · HoH · 2 kids · $40K">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {pitZones.map((z, i) => (
            <ReferenceArea
              key={i}
              x1={z.x1}
              x2={z.x2}
              fill={T.warning}
              fillOpacity={0.12}
              stroke={T.warning}
              strokeOpacity={0.3}
              strokeDasharray="2 3"
            />
          ))}
          {cliffs.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
            />
          ))}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </ScenarioFrame>
  );
}

function PitChartColoredSegment() {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(CLIFF_SCENARIO_CMH);

  // Build per-pit "in-segment" series so each can be drawn as its own
  // colored line on top of the base line. A point belongs to a pit's
  // segment when its gross is inside the zone.
  const segments = pitZones.map((z) => ({
    color: z.color ?? T.warning,
    data: points.map((p) => ({
      gross: p.gross,
      value: p.gross >= z.x1 && p.gross <= z.x2 ? p.discretionary : null,
    })),
  }));

  return (
    <ScenarioFrame label="Columbus, OH · HoH · 2 kids · $40K">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {cliffs.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          ))}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeOpacity={0.55}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          {segments.map((seg, i) => (
            <Line
              key={i}
              type="monotone"
              data={seg.data}
              dataKey="value"
              stroke={seg.color}
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
          ))}
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </ScenarioFrame>
  );
}

function PitChartGhostLine() {
  const { points, cliffs, maxGross, currentGross } = useCliffScenario(CLIFF_SCENARIO_CMH);

  // Running-max series: at each income, the max discretionary seen at any
  // lower income. The gap between this and the actual curve is the pit.
  const ghostPoints = points.reduce<{ gross: number; ghost: number; actual: number }[]>(
    (acc, p) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].ghost : -Infinity;
      const ghost = Math.max(prev, p.discretionary);
      acc.push({ gross: p.gross, ghost, actual: p.discretionary });
      return acc;
    },
    [],
  );

  return (
    <ScenarioFrame label="Columbus, OH · HoH · 2 kids · $40K">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={ghostPoints} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {cliffs.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
          ))}
          <Line
            type="stepAfter"
            dataKey="ghost"
            stroke={T.warning}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={ghostPoints.find((p) => p.gross >= currentGross)?.actual ?? ghostPoints[0].actual}
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
      <div
        style={{
          fontSize: rem(11),
          color: T.inkMuted,
          marginTop: 6,
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 0,
              borderTop: `2px solid ${T.ink}`,
              marginRight: 6,
              verticalAlign: 'middle',
            }}
          />
          Actual discretionary
        </span>
        <span>
          <span
            style={{
              display: 'inline-block',
              width: 14,
              height: 0,
              borderTop: `1.5px dashed ${T.warning}`,
              marginRight: 6,
              verticalAlign: 'middle',
            }}
          />
          Best-so-far (running max)
        </span>
      </div>
    </ScenarioFrame>
  );
}

function PitChartBottomBand() {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCliffScenario(CLIFF_SCENARIO_CMH);
  return (
    <ScenarioFrame label="Columbus, OH · HoH · 2 kids · $40K">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 28 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {cliffs.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          ))}
          {pitZones.map((z, i) => {
            // Render a small "[==]" bracket at the bottom of the chart
            // spanning the pit range. Uses ReferenceLine with a custom
            // SVG label to avoid pulling in extra primitives.
            const color = z.color ?? T.warning;
            return (
              <ReferenceLine
                key={i}
                segment={[
                  { x: z.x1, y: 0 },
                  { x: z.x2, y: 0 },
                ]}
                stroke={color}
                strokeWidth={4}
                ifOverflow="visible"
                label={(props: { viewBox?: { x?: number; y?: number; width?: number } }) => {
                  const cx = (props.viewBox?.x ?? 0) + (props.viewBox?.width ?? 0) / 2;
                  const y = (props.viewBox?.y ?? 0) + 16;
                  return (
                    <text x={cx} y={y} textAnchor="middle" fill={color} fontSize={10}>
                      pit
                    </text>
                  );
                }}
              />
            );
          })}
          <Line
            type="monotone"
            dataKey="discretionary"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={
              points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary
            }
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </ScenarioFrame>
  );
}

// ── Section: compound pit attribution ────────────────────────────────────
//
// When two cliffs fire close enough together that the curve hasn't
// recovered from the first by the time the second hits, the household's
// pit "merges" into one continuous zone driven by both programs. The
// production code attributes that whole zone to the first cliff's color
// (because it walks left→right and only records the cliff that opened
// the zone), making the second cliff's contribution invisible.
//
// These four variations explore how to expose multi-cliff contribution.

// User-editable program config. Each row defines one synthetic cliff: a
// label, the gross income at which it fires, the dollar drop in
// discretionary income, and its color. The compound section synthesizes
// a curve from this list (linear baseline minus accumulated drops) so
// the user can dial in scenarios that exhibit single pits, merged pits,
// triple-overlap pits, etc. — and watch each variation respond.
interface ProgramConfig {
  id: string;
  label: string;
  gross: number;
  drop: number;
  color: string;
}

const COMPOUND_COLOR_CHOICES = [
  { id: 'medicaid', value: CLIFF_COLORS.medicaid, label: 'Red' },
  { id: 'snap', value: CLIFF_COLORS.snap, label: 'Orange' },
  { id: 'chip', value: CLIFF_COLORS.chip, label: 'Slate' },
  { id: 'positive', value: T.positive, label: 'Green' },
  { id: 'commercial', value: T.commercialAccent, label: 'Gold' },
  { id: 'ai', value: T.aiAccent, label: 'Blue' },
] as const;

const COMPOUND_DEFAULT_PROGRAMS: ProgramConfig[] = [
  { id: 'p1', label: 'Medicaid', gross: 30_000, drop: 5_000, color: CLIFF_COLORS.medicaid },
  { id: 'p2', label: 'SNAP', gross: 40_000, drop: 3_000, color: CLIFF_COLORS.snap },
  { id: 'p3', label: 'CHIP', gross: 50_000, drop: 5_000, color: CLIFF_COLORS.chip },
];

interface CompoundConfig {
  programs: ProgramConfig[];
  slope: number;
  maxGross: number;
}

const COMPOUND_DEFAULT_CONFIG: CompoundConfig = {
  programs: COMPOUND_DEFAULT_PROGRAMS,
  slope: 0.3,
  maxGross: 80_000,
};

function useCompoundDemoData(config: CompoundConfig): {
  points: CliffPoint[];
  cliffs: CliffMark[];
  pitZones: PitZone[];
  maxGross: number;
  currentGross: number;
} {
  return React.useMemo(() => {
    const { programs, slope, maxGross } = config;
    const currentGross = Math.round(maxGross * 0.45);
    const stepSize = Math.max(250, Math.round(maxGross / 200 / 250) * 250);
    const intercept = -1_000;

    const sortedPrograms = [...programs].sort((a, b) => a.gross - b.gross);
    const points: CliffPoint[] = [];
    for (let g = 0; g <= maxGross; g += stepSize) {
      let disc = slope * g + intercept;
      for (const c of sortedPrograms) if (g >= c.gross) disc -= c.drop;
      points.push({ gross: g, discretionary: Math.round(disc) });
    }

    const cliffs: CliffMark[] = sortedPrograms.map((c) => ({
      id: c.id,
      label: c.label,
      shortLabel: c.label,
      gross: c.gross,
      color: c.color,
    }));
    const pitZones = computePitZones(points, 'discretionary', cliffs);

    return { points, cliffs, pitZones, maxGross, currentGross };
  }, [config]);
}

function SectionCompoundPits() {
  const [config, setConfig] = React.useState<CompoundConfig>(COMPOUND_DEFAULT_CONFIG);

  return (
    <Section
      columns={1}
      heading="Compound pit attribution"
      subhead="When two cliffs fire close enough that the household hasn't recovered from the first when the second hits, the resulting pit zone is caused by BOTH programs. Production today colors the merged zone by the first cliff only — losing the second cliff's signal. Edit the program list below to dial in any scenario; all four variations re-render against your config."
    >
      <CompoundConfigPanel config={config} setConfig={setConfig} />
      <Variation
        title="V1 — Single-color attribution (current production)"
        description="Whole merged zone gets the first cliff's color. Simple but understates the second cliff's role."
      >
        <CompoundChartSingleColor config={config} />
      </Variation>
      <Variation
        title="V2 — Split striping at each contributing cliff"
        description="Walk the merged zone and split at every cliff that fires inside it; each segment gets that cliff's color. The shading reads as 'first Medicaid, then SNAP also dropped you.'"
      >
        <CompoundChartSplitStriping config={config} />
      </Variation>
      <Variation
        title="V3 — Ghost 'best-so-far' line, no shading"
        description="Skip attribution entirely. Render a faded running-max line; the visible gap between actual and ghost IS the pit, and it naturally shows compound depth without choosing colors."
      >
        <CompoundChartGhost config={config} />
      </Variation>
      <Variation
        title="V4 — Per-cliff pit timeline (Gantt-style lanes)"
        description="Chart stays clean (no in-chart fills); pit attribution moves to a small per-program timeline below the chart. Each cliff gets its own labeled lane, colored only over the income range where that program contributes to the household being worse off. Comparing lanes vertically tells you which programs overlap and where."
      >
        <CompoundChartLayered config={config} />
      </Variation>
      <Variation
        decided
        title="V5 — Uniform warning color (no attribution at all)"
        description="Every pit zone shaded the same warning orange regardless of which program caused it. Cleanest possible read; sacrifices attribution entirely but never lies about which program is responsible since it never claims one."
      >
        <CompoundChartUniformColor config={config} />
      </Variation>
      <Variation
        title="V6 — Ghost line + uniform warning shading"
        description="V3 and V5 combined. Soft warning tint behind every pit (says 'look here, something's wrong'); faded best-so-far line above the actual curve (shows how much money the household is leaving on the table at every income). No attribution decisions, depth is automatic."
      >
        <CompoundChartGhostShaded config={config} />
      </Variation>
      <Variation
        title="V7 — Slim impact bar below the chart, crosshatched on overlap"
        description="Chart stays as V5 (uniform tint); a thin bar pinned below the X axis shows each program's impact zone in its own color. Where two impact zones overlap, the segment uses a diagonal crosshatch combining both colors. Triple overlap = three-color hatch. Attribution lives in the bar; the chart stays calm."
      >
        <CompoundChartImpactBar config={config} />
      </Variation>
    </Section>
  );
}

function CompoundConfigPanel({
  config,
  setConfig,
}: {
  config: CompoundConfig;
  setConfig: React.Dispatch<React.SetStateAction<CompoundConfig>>;
}) {
  const updateProgram = (id: string, patch: Partial<ProgramConfig>) =>
    setConfig((c) => ({
      ...c,
      programs: c.programs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  const removeProgram = (id: string) =>
    setConfig((c) => ({ ...c, programs: c.programs.filter((p) => p.id !== id) }));
  const addProgram = () => {
    const nextId = `p${Date.now()}`;
    const usedColors = new Set(config.programs.map((p) => p.color));
    const nextColor =
      COMPOUND_COLOR_CHOICES.find((c) => !usedColors.has(c.value))?.value ?? T.warning;
    setConfig((c) => ({
      ...c,
      programs: [
        ...c.programs,
        {
          id: nextId,
          label: 'New program',
          gross: Math.round(c.maxGross * 0.6),
          drop: 3_000,
          color: nextColor,
        },
      ],
    }));
  };
  const reset = () => setConfig(COMPOUND_DEFAULT_CONFIG);
  const [collapsed, setCollapsed] = React.useState(true);

  return (
    <div
      style={{
        gridColumn: '1 / -1',
        // Sticky so the config stays in reach as the user scrolls down
        // through the variations. Top offset clears the page's outer
        // padding; z-index keeps the panel above variation cards.
        position: 'sticky',
        top: 8,
        zIndex: 4,
        background: T.bgAlt,
        border: `1px dashed ${T.border}`,
        borderRadius: 4,
        padding: collapsed ? '8px 16px' : 16,
        marginBottom: 4,
        boxShadow: '0 4px 12px rgba(27, 24, 21, 0.08)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: collapsed ? 0 : 12,
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-expanded={!collapsed}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            fontFamily: fonts.body,
            fontSize: rem(13),
            fontWeight: 600,
            color: T.ink,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              width: 0,
              height: 0,
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: `5px solid ${T.inkMuted}`,
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)',
              transition: 'transform 0.15s',
            }}
          />
          Synthetic scenario config
          {collapsed && (
            <span
              style={{
                fontWeight: 400,
                color: T.inkMuted,
                fontSize: rem(11),
                marginLeft: 6,
              }}
            >
              · {config.programs.length} program{config.programs.length === 1 ? '' : 's'} · slope{' '}
              {config.slope.toFixed(2)}
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            type="button"
            onClick={reset}
            style={{
              border: 'none',
              background: 'transparent',
              color: T.inkMuted,
              fontSize: rem(11),
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Reset to defaults
          </button>
        )}
      </div>
      {!collapsed && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(120px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr) auto',
              gap: 8,
              alignItems: 'center',
              fontSize: rem(11),
              marginBottom: 6,
              color: T.inkMuted,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <span>Label</span>
            <span>Cliff at ($)</span>
            <span>Drop ($)</span>
            <span>Color</span>
            <span />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {config.programs.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'minmax(120px, 2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(120px, 1fr) auto',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                <input
                  type="text"
                  value={p.label}
                  onChange={(e) => updateProgram(p.id, { label: e.target.value })}
                  style={inputStyle}
                />
                <input
                  type="number"
                  step={500}
                  value={p.gross}
                  onChange={(e) => updateProgram(p.id, { gross: Number(e.target.value) || 0 })}
                  style={{ ...inputStyle, fontFamily: fonts.mono }}
                />
                <input
                  type="number"
                  step={500}
                  value={p.drop}
                  onChange={(e) => updateProgram(p.id, { drop: Number(e.target.value) || 0 })}
                  style={{ ...inputStyle, fontFamily: fonts.mono }}
                />
                <select
                  value={p.color}
                  onChange={(e) => updateProgram(p.id, { color: e.target.value })}
                  style={{ ...inputStyle, paddingRight: 4 }}
                >
                  {COMPOUND_COLOR_CHOICES.map((c) => (
                    <option key={c.id} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeProgram(p.id)}
                  aria-label={`Remove ${p.label}`}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: T.inkMuted,
                    cursor: 'pointer',
                    fontSize: rem(14),
                    padding: '0 6px',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10 }}>
            <button
              type="button"
              onClick={addProgram}
              style={{
                border: `1px solid ${T.border}`,
                background: T.bg,
                color: T.inkSoft,
                fontFamily: fonts.body,
                fontSize: rem(12),
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              + Add program
            </button>
          </div>
          <div
            style={{
              display: 'flex',
              gap: 24,
              alignItems: 'center',
              marginTop: 14,
              paddingTop: 12,
              borderTop: `1px solid ${T.border}`,
            }}
          >
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: rem(11) }}>
              <span
                style={{ color: T.inkMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Recovery slope ({config.slope.toFixed(2)} disc per $1 gross)
              </span>
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={config.slope}
                onChange={(e) => setConfig((c) => ({ ...c, slope: Number(e.target.value) }))}
                style={{ width: 220 }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: rem(11) }}>
              <span
                style={{ color: T.inkMuted, letterSpacing: '0.06em', textTransform: 'uppercase' }}
              >
                Max gross ({fmtK(config.maxGross)})
              </span>
              <input
                type="range"
                min={20_000}
                max={200_000}
                step={5_000}
                value={config.maxGross}
                onChange={(e) => setConfig((c) => ({ ...c, maxGross: Number(e.target.value) }))}
                style={{ width: 220 }}
              />
            </label>
          </div>
        </>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: fonts.body,
  fontSize: rem(12),
  padding: '4px 6px',
  border: `1px solid ${T.border}`,
  background: T.bg,
  color: T.ink,
};

/** Each cliff's individual pit zone — runs from that cliff's gross to the
 *  income at which the curve recovers to THAT cliff's pre-cliff value.
 *  Used by V4 for layered overlapping zones. */
function computePerCliffZones(
  points: readonly CliffPoint[],
  cliffs: readonly CliffMark[],
): PitZone[] {
  const zones: PitZone[] = [];
  for (const c of cliffs) {
    // Find the last point STRICTLY before the cliff. The synthesized curve
    // applies the drop at gross === cliff.gross, so the at-cliff point is
    // already post-drop and would yield a trivially-met recovery. Use the
    // pre-drop peak instead.
    let beforeIdx = -1;
    for (let i = 0; i < points.length; i++) {
      if (points[i].gross < c.gross) beforeIdx = i;
      else break;
    }
    if (beforeIdx < 0) continue;
    const beforeValue = points[beforeIdx].discretionary;
    let recoveryGross: number | null = null;
    for (let i = beforeIdx + 1; i < points.length; i++) {
      if (points[i].gross > c.gross && points[i].discretionary >= beforeValue) {
        recoveryGross = points[i].gross;
        break;
      }
    }
    if (recoveryGross !== null && recoveryGross > c.gross) {
      zones.push({ x1: c.gross, x2: recoveryGross, color: c.color, cliffId: c.id });
    }
  }
  return zones;
}

function CompoundChartSingleColor({ config }: { config: CompoundConfig }) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCompoundDemoData(config);
  return (
    <CompoundFrame>
      <CompoundChartBase
        points={points}
        cliffs={cliffs}
        zones={pitZones}
        maxGross={maxGross}
        currentGross={currentGross}
      />
    </CompoundFrame>
  );
}

function CompoundChartUniformColor({ config }: { config: CompoundConfig }) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCompoundDemoData(config);
  // Strip per-program color attribution — every zone painted with the
  // same warning hue. CompoundChartBase falls back to T.warning when a
  // zone's color is undefined.
  const uniformZones: PitZone[] = pitZones.map((z) => ({ ...z, color: undefined }));
  return (
    <CompoundFrame>
      <CompoundChartBase
        points={points}
        cliffs={cliffs}
        zones={uniformZones}
        maxGross={maxGross}
        currentGross={currentGross}
      />
    </CompoundFrame>
  );
}

function CompoundChartSplitStriping({ config }: { config: CompoundConfig }) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCompoundDemoData(config);
  const splitZones: PitZone[] = pitZones.flatMap((z) => {
    const interior = cliffs
      .filter((c) => c.gross > z.x1 && c.gross < z.x2)
      .sort((a, b) => a.gross - b.gross);
    if (interior.length === 0) return [z];
    const breakpoints = [z.x1, ...interior.map((c) => c.gross), z.x2];
    const subs: PitZone[] = [];
    for (let i = 0; i < breakpoints.length - 1; i++) {
      const subStart = breakpoints[i];
      const subEnd = breakpoints[i + 1];
      const owner = [...cliffs]
        .filter((c) => c.gross <= subStart)
        .sort((a, b) => b.gross - a.gross)[0];
      subs.push({
        x1: subStart,
        x2: subEnd,
        color: owner?.color ?? z.color,
        cliffId: owner?.id ?? z.cliffId,
      });
    }
    return subs;
  });
  return (
    <CompoundFrame>
      <CompoundChartBase
        points={points}
        cliffs={cliffs}
        zones={splitZones}
        maxGross={maxGross}
        currentGross={currentGross}
        zoneOpacity={0.18}
      />
    </CompoundFrame>
  );
}

function CompoundChartGhost({ config }: { config: CompoundConfig }) {
  const { points, cliffs, maxGross, currentGross } = useCompoundDemoData(config);
  const ghostPoints = points.reduce<{ gross: number; ghost: number; actual: number }[]>(
    (acc, p) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].ghost : -Infinity;
      const ghost = Math.max(prev, p.discretionary);
      acc.push({ gross: p.gross, ghost, actual: p.discretionary });
      return acc;
    },
    [],
  );
  return (
    <CompoundFrame>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={ghostPoints} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {cliffs.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          ))}
          <Line
            type="stepAfter"
            dataKey="ghost"
            stroke={T.warning}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={ghostPoints.find((p) => p.gross >= currentGross)?.actual ?? ghostPoints[0].actual}
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </CompoundFrame>
  );
}

function CompoundChartGhostShaded({ config }: { config: CompoundConfig }) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCompoundDemoData(config);
  const ghostPoints = points.reduce<{ gross: number; ghost: number; actual: number }[]>(
    (acc, p) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].ghost : -Infinity;
      const ghost = Math.max(prev, p.discretionary);
      acc.push({ gross: p.gross, ghost, actual: p.discretionary });
      return acc;
    },
    [],
  );
  return (
    <CompoundFrame>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={ghostPoints} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
          {pitZones.map((z, i) => (
            <ReferenceArea
              key={i}
              x1={z.x1}
              x2={z.x2}
              fill={T.warning}
              fillOpacity={0.1}
              stroke="none"
            />
          ))}
          <XAxis
            dataKey="gross"
            type="number"
            domain={[0, maxGross]}
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
          />
          <YAxis
            tickFormatter={fmtK}
            stroke={T.inkMuted}
            tick={{ fontSize: 10, fill: T.inkSoft }}
            width={48}
          />
          <ReferenceLine y={0} stroke={T.inkMuted} />
          {cliffs.map((c) => (
            <ReferenceLine
              key={c.id}
              x={c.gross}
              stroke={c.color}
              strokeDasharray="3 3"
              strokeOpacity={0.6}
            />
          ))}
          <Line
            type="stepAfter"
            dataKey="ghost"
            stroke={T.warning}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke={T.ink}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
          <ReferenceDot
            x={currentGross}
            y={ghostPoints.find((p) => p.gross >= currentGross)?.actual ?? ghostPoints[0].actual}
            r={4}
            fill={T.positive}
            stroke={T.bg}
            strokeWidth={2}
            ifOverflow="visible"
          />
        </LineChart>
      </ResponsiveContainer>
    </CompoundFrame>
  );
}

function CompoundChartLayered({ config }: { config: CompoundConfig }) {
  const { points, cliffs, maxGross, currentGross } = useCompoundDemoData(config);
  const layeredZones = computePerCliffZones(points, cliffs);
  return (
    <CompoundFrame>
      {/* Chart stays clean — no in-chart fills. Cliffs as faint reference
          lines only. The pit attribution lives in the timeline below. */}
      <CompoundChartBase
        points={points}
        cliffs={cliffs}
        zones={[]}
        maxGross={maxGross}
        currentGross={currentGross}
      />
      <PitTimeline cliffs={cliffs} zones={layeredZones} maxGross={maxGross} />
    </CompoundFrame>
  );
}

function CompoundChartImpactBar({ config }: { config: CompoundConfig }) {
  const { points, cliffs, pitZones, maxGross, currentGross } = useCompoundDemoData(config);
  // Per-program "impact zone" computed independently: each program's bar
  // spans from its cliff to the income at which the curve would recover
  // IF ONLY THIS PROGRAM HAD FIRED. Equals cliff.gross + drop/slope. Using
  // computePerCliffZones (which uses the actual compound curve) instead
  // would make every program's zone span almost the entire merged pit,
  // since the curve doesn't reach a single program's pre-cliff peak until
  // the other programs have also recovered.
  const impactZones: PitZone[] = config.programs.map((p) => ({
    cliffId: p.id,
    color: p.color,
    x1: p.gross,
    x2: Math.min(maxGross, p.gross + p.drop / Math.max(0.01, config.slope)),
  }));
  return (
    <CompoundFrame>
      <CompoundChartBase
        points={points}
        cliffs={cliffs}
        zones={pitZones}
        maxGross={maxGross}
        currentGross={currentGross}
      />
      <ImpactBar cliffs={cliffs} zones={impactZones} maxGross={maxGross} />
    </CompoundFrame>
  );
}

/** Single thin "impact bar" pinned below the chart. Walks every program's
 *  impact zone (cliff → recovery), finds breakpoints where the active set
 *  of programs changes, and renders one segment per breakpoint window. A
 *  segment with one active program shows that program's color; with two
 *  or more, a diagonal crosshatch alternates the colors so overlap is
 *  visually unambiguous. */
function ImpactBar({
  cliffs,
  zones,
  maxGross,
}: {
  cliffs: CliffMark[];
  zones: PitZone[];
  maxGross: number;
}) {
  // Build a sorted list of unique breakpoints (zone starts and ends).
  const breakpoints = Array.from(new Set(zones.flatMap((z) => [z.x1, z.x2]))).sort((a, b) => a - b);

  // For each [bp[i], bp[i+1]] window, the active set is every zone
  // that contains the window (zone.x1 < bpEnd AND zone.x2 > bpStart).
  const segments = breakpoints.slice(0, -1).map((start, i) => {
    const end = breakpoints[i + 1];
    const active = zones.filter((z) => z.x1 < end && z.x2 > start);
    return { start, end, active };
  });

  // Match the chart's plot-area inset so the bar lines up with chart X.
  const leftPad = 48 + 4;
  const rightPad = 16 + 4;

  const cliffById = new Map(cliffs.map((c) => [c.id, c]));

  return (
    <div style={{ marginTop: 8, paddingLeft: leftPad, paddingRight: rightPad }}>
      <div
        style={{
          fontSize: rem(10),
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: T.inkMuted,
          marginBottom: 4,
        }}
      >
        Programs in pit
      </div>
      <div
        style={{
          position: 'relative',
          height: 12,
          background: T.bgAlt,
          border: `1px solid ${T.border}`,
        }}
      >
        {segments.map((seg, i) => {
          if (seg.active.length === 0) return null;
          const colors = seg.active
            .map((z) => (z.cliffId ? cliffById.get(z.cliffId)?.color : null))
            .filter((c): c is string => Boolean(c));
          const left = `${(seg.start / maxGross) * 100}%`;
          const width = `${((seg.end - seg.start) / maxGross) * 100}%`;
          const labels = seg.active
            .map((z) => (z.cliffId ? cliffById.get(z.cliffId)?.label : null))
            .filter(Boolean)
            .join(' + ');
          return (
            <div
              key={i}
              title={`${labels} · ${fmtK(seg.start)}–${fmtK(seg.end)}`}
              style={{
                position: 'absolute',
                left,
                width,
                top: 0,
                bottom: 0,
                background: hatchedFill(colors),
                opacity: 0.75,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Build a CSS background that diagonally crosshatches the given colors.
 *  Single color → solid fill. Two or more → repeating-linear-gradient
 *  with each color taking an even slice. */
function hatchedFill(colors: string[]): string {
  if (colors.length === 0) return 'transparent';
  if (colors.length === 1) return colors[0];
  const stripeWidth = 6; // px per stripe
  const total = stripeWidth * colors.length;
  const stops = colors
    .map((c, i) => {
      const start = i * stripeWidth;
      const end = (i + 1) * stripeWidth;
      return `${c} ${start}px, ${c} ${end}px`;
    })
    .join(', ');
  return `repeating-linear-gradient(45deg, ${stops}, ${colors[0]} ${total}px)`;
}

/** Per-program pit timeline. One labeled lane per cliff, with a colored
 *  bar marking the income range over which that program contributes to
 *  the household being worse off than at some lower income. Reads as a
 *  Gantt-style timeline aligned to the chart's X axis above. */
function PitTimeline({
  cliffs,
  zones,
  maxGross,
}: {
  cliffs: CliffMark[];
  zones: PitZone[];
  maxGross: number;
}) {
  // Match the chart's plot-area inset so lane bars line up with chart X.
  // CompoundChartBase uses YAxis width=48 plus left margin 0 and right
  // margin 16 plus chart-internal padding ~4px each side.
  const leftPad = 48 + 4;
  const rightPad = 16 + 4;
  return (
    <div style={{ marginTop: 8, paddingLeft: leftPad, paddingRight: rightPad }}>
      <div
        style={{
          fontSize: rem(10),
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: T.inkMuted,
          marginBottom: 4,
        }}
      >
        In-pit timeline
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {cliffs.map((c) => {
          const zone = zones.find((z) => z.cliffId === c.id);
          return (
            <div
              key={c.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                alignItems: 'center',
                gap: 8,
                fontSize: rem(11),
              }}
            >
              <span style={{ color: T.inkSoft, textAlign: 'right' }}>{c.label}</span>
              <div
                style={{
                  position: 'relative',
                  height: 10,
                  background: T.bgAlt,
                  border: `1px solid ${T.border}`,
                }}
              >
                {zone && (
                  <div
                    title={`${c.label} pit: ${fmtK(zone.x1)} → ${fmtK(zone.x2)}`}
                    style={{
                      position: 'absolute',
                      left: `${(zone.x1 / maxGross) * 100}%`,
                      width: `${((zone.x2 - zone.x1) / maxGross) * 100}%`,
                      top: 0,
                      bottom: 0,
                      background: c.color,
                      opacity: 0.55,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompoundFrame({ children }: { children: React.ReactNode }) {
  return (
    <ScenarioFrame label="Synthetic Columbus-style scenario · cliffs at $30K / $40K / $50K (engineered to overlap)">
      {children}
    </ScenarioFrame>
  );
}

function CompoundChartBase({
  points,
  cliffs,
  zones,
  maxGross,
  currentGross,
  zoneOpacity = 0.15,
}: {
  points: CliffPoint[];
  cliffs: CliffMark[];
  zones: PitZone[];
  maxGross: number;
  currentGross: number;
  zoneOpacity?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={points} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey="gross"
          type="number"
          domain={[0, maxGross]}
          tickFormatter={fmtK}
          stroke={T.inkMuted}
          tick={{ fontSize: 10, fill: T.inkSoft }}
        />
        <YAxis
          tickFormatter={fmtK}
          stroke={T.inkMuted}
          tick={{ fontSize: 10, fill: T.inkSoft }}
          width={48}
        />
        <ReferenceLine y={0} stroke={T.inkMuted} />
        {zones.map((z, i) => (
          <ReferenceArea
            key={i}
            x1={z.x1}
            x2={z.x2}
            fill={z.color ?? T.warning}
            fillOpacity={zoneOpacity}
            stroke={z.color ?? T.warning}
            strokeOpacity={0.3}
            strokeDasharray="2 3"
          />
        ))}
        {cliffs.map((c) => (
          <ReferenceLine
            key={c.id}
            x={c.gross}
            stroke={c.color}
            strokeDasharray="3 3"
            strokeOpacity={0.7}
          />
        ))}
        <Line
          type="monotone"
          dataKey="discretionary"
          stroke={T.ink}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <ReferenceDot
          x={currentGross}
          y={points.find((p) => p.gross >= currentGross)?.discretionary ?? points[0].discretionary}
          r={4}
          fill={T.positive}
          stroke={T.bg}
          strokeWidth={2}
          ifOverflow="visible"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Section: Status dot palette
//
// Iteration question: the /sources page now has six status kinds. The
// shipped scheme uses two color families (green = verified-flavoured,
// blue = audit-caveat-flavoured) plus warning + accent for overdue/broken,
// with hollow-vs-filled meaning two different things in different families:
//   - green pair: hollow = AI-reviewed, filled = human-reviewed (provenance)
//   - blue pair: hollow = flapping, filled = browser-verified (strength)
// That cross-talk is the open question — does the eye learn it, or does
// it confuse readers who've internalised one rule and try to apply it
// elsewhere?
//
// Live-picker pattern: shipped scheme on the left (static), live preview
// on the right reflecting the picker state below. Compare combinations
// without rebuilding the page.
// ─────────────────────────────────────────────────────────────────────────

type DotKind =
  | 'verified'
  | 'ai-verified'
  | 'bot-blocked-verified'
  | 'intermittent'
  | 'overdue'
  | 'broken';

// Theme-token tokens come from src/theme.ts; lab-only tokens (prefixed
// `lab-`) are exploration candidates that haven't been promoted to the
// theme. If one wins, copy its hex into theme.ts and rename here.
type DotColorToken =
  | 'positive'
  | 'accent'
  | 'warning'
  | 'aiAccent'
  | 'commercialAccent'
  | 'ink'
  | 'lab-brightBlue'
  | 'lab-teal'
  | 'lab-violet'
  | 'lab-magenta'
  | 'lab-rust'
  | 'lab-forestDark'
  | 'lab-mossGreen'
  | 'lab-dustyRose'
  | 'lab-neutral'
  | 'lab-charcoal';

interface DotStyle {
  color: DotColorToken;
  hollow: boolean;
}

const DOT_KINDS: ReadonlyArray<DotKind> = [
  'verified',
  'ai-verified',
  'bot-blocked-verified',
  'intermittent',
  'overdue',
  'broken',
];

const DOT_KIND_LABEL: Record<DotKind, string> = {
  verified: 'Human verified',
  'ai-verified': 'AI verified',
  'bot-blocked-verified': 'Bot-blocked',
  intermittent: 'Intermittent',
  overdue: 'Overdue',
  broken: 'Broken',
};

const DOT_KIND_BLURB: Record<DotKind, string> = {
  verified: 'Loads + reviewed by a human within window.',
  'ai-verified': 'Loads + reviewed within window, but AI-flavoured.',
  'bot-blocked-verified': "Audit can't reach it; human verified in browser within 30d.",
  intermittent: 'Broken in latest run; reachable in some of last 3 runs.',
  overdue: 'No review within tier window.',
  broken: 'Audit cannot reach the URL; no recent human verification.',
};

// Grouped so the picker can render shipped tokens first, lab candidates
// second, with a visual divider between. Order within each group runs
// roughly green → blue → warm → neutral.
interface ColorOption {
  token: DotColorToken;
  label: string;
  /** Free-form note shown in the picker tooltip — usually the editorial
   *  reason this hue is worth trying for status indicators. */
  note?: string;
}

const SHIPPED_COLOR_OPTIONS: ReadonlyArray<ColorOption> = [
  { token: 'positive', label: 'positive', note: 'green — verified family' },
  {
    token: 'aiAccent',
    label: 'aiAccent',
    note: 'slate-blue — AI provenance + audit caveat (bot-blocked, intermittent)',
  },
  { token: 'warning', label: 'warning', note: 'burnt orange — overdue family' },
  { token: 'accent', label: 'accent', note: 'editorial red — broken' },
  {
    token: 'commercialAccent',
    label: 'commercialAccent',
    note: 'deep gold — commercial tier badge',
  },
  { token: 'ink', label: 'ink', note: 'near-black' },
];

const LAB_COLOR_OPTIONS: ReadonlyArray<ColorOption> = [
  {
    token: 'lab-brightBlue',
    label: 'brightBlue',
    note: 'saturated mid-blue — brighter alternative if slate aiAccent feels muted',
  },
  {
    token: 'lab-teal',
    label: 'teal',
    note: 'green-blue hybrid — could bridge verified-and-audit families',
  },
  {
    token: 'lab-violet',
    label: 'violet',
    note: 'cool purple — distinct from every existing family, neutral connotation',
  },
  {
    token: 'lab-magenta',
    label: 'magenta',
    note: 'warm pink-purple — highly distinctive, reads as "noteworthy"',
  },
  {
    token: 'lab-mossGreen',
    label: 'mossGreen',
    note: 'desaturated green — companion to positive without the same weight',
  },
  {
    token: 'lab-forestDark',
    label: 'forestDark',
    note: 'deeper green than positive — pairs with positive for two-step verified hierarchy',
  },
  {
    token: 'lab-rust',
    label: 'rust',
    note: 'red-brown — softer than accent, harsher than warning',
  },
  {
    token: 'lab-dustyRose',
    label: 'dustyRose',
    note: 'muted rose — cautionary without alarm, distinct from accent',
  },
  {
    token: 'lab-neutral',
    label: 'neutral',
    note: 'warm grey — minimal-emphasis "informational" indicator',
  },
  {
    token: 'lab-charcoal',
    label: 'charcoal',
    note: 'soft near-black — quieter than ink, useful for "status unknown" framing',
  },
];

const COLOR_HEX: Record<DotColorToken, string> = {
  positive: T.positive,
  accent: T.accent,
  warning: T.warning,
  aiAccent: T.aiAccent,
  commercialAccent: T.commercialAccent,
  ink: T.ink,
  // Lab-only candidates. Hexes are first-pass picks intended to read on
  // the cream background and stay distinguishable from each other and
  // from the shipped tokens above. Treat them as starting points — tweak
  // freely if a candidate looks promising but the exact shade is wrong.
  'lab-brightBlue': '#1F7DBF',
  'lab-teal': '#15706B',
  'lab-violet': '#6B3F9C',
  'lab-magenta': '#9C2E6B',
  'lab-mossGreen': '#5C6E3A',
  'lab-forestDark': '#1F3D0F',
  'lab-rust': '#9C4A1F',
  'lab-dustyRose': '#B0656B',
  'lab-neutral': '#6B6157',
  'lab-charcoal': '#3A3530',
};

// Frozen record of what's currently in production. Every change to
// status.ts / StatusDot.tsx should bump these so the "shipped" card stays
// truthful. The live picker initialises from this so "Reset to shipped"
// is meaningful.
const SHIPPED_DOT_STYLES: Readonly<Record<DotKind, DotStyle>> = {
  verified: { color: 'positive', hollow: false },
  'ai-verified': { color: 'positive', hollow: true },
  'bot-blocked-verified': { color: 'aiAccent', hollow: false },
  intermittent: { color: 'aiAccent', hollow: true },
  overdue: { color: 'warning', hollow: false },
  broken: { color: 'accent', hollow: false },
};

// Swatch-only — text labels would push every kind row to 3 lines once we
// have ~17 options. Hover surfaces the token name + editorial note via
// the title attribute. Active state is a thicker dark ring, shipped
// state is a small ✓ overlay.
function ColorChip({
  option,
  isActive,
  isShipped,
  onPick,
}: {
  option: ColorOption;
  isActive: boolean;
  isShipped: boolean;
  onPick: () => void;
}) {
  const size = 20;
  const swatch = COLOR_HEX[option.token];
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={isActive}
      aria-label={option.label}
      title={`${option.label}${option.note ? ` — ${option.note}` : ''}${isShipped ? ' (shipped)' : ''}`}
      style={{
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        // Padding reserves space for the active ring + ✓ badge so an
        // active state doesn't visually grow the swatch and nudge its
        // neighbours.
        padding: 5,
        borderRadius: '50%',
        position: 'relative',
        lineHeight: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: size,
          height: size,
          borderRadius: '50%',
          background: swatch,
          boxShadow: isActive ? `0 0 0 2px ${T.ink}` : `0 0 0 1px ${T.border}`,
        }}
      />
      {isShipped && (
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: T.bg,
            color: T.ink,
            fontSize: 8,
            lineHeight: '10px',
            textAlign: 'center',
            fontWeight: 700,
            border: `1px solid ${T.border}`,
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}

// Compact two-state filled/hollow toggle — just two mini-dots side by
// side with the active one ringed. Tooltip carries "filled"/"hollow".
function FillToggle({
  hollow,
  color,
  onChange,
  shippedHollow,
}: {
  hollow: boolean;
  color: string;
  onChange: (next: boolean) => void;
  shippedHollow: boolean;
}) {
  return (
    <span style={{ display: 'inline-flex', gap: 4 }}>
      {[false, true].map((value) => {
        const isActive = hollow === value;
        const isShipped = shippedHollow === value;
        return (
          <button
            key={String(value)}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            aria-label={value ? 'hollow' : 'filled'}
            title={`${value ? 'hollow' : 'filled'}${isShipped ? ' (shipped)' : ''}`}
            style={{
              cursor: 'pointer',
              background: 'transparent',
              border: 'none',
              padding: 5,
              borderRadius: '50%',
              lineHeight: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                borderRadius: '50%',
                boxShadow: isActive ? `0 0 0 2px ${T.ink}` : 'none',
                lineHeight: 0,
              }}
            >
              <LabDot color={color} hollow={value} size={14} />
            </span>
          </button>
        );
      })}
    </span>
  );
}

function LabDot({ color, hollow, size = 12 }: { color: string; hollow: boolean; size?: number }) {
  const ringWidth = Math.max(2, Math.round(size / 5));
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: hollow ? 'transparent' : color,
        boxShadow: hollow ? `inset 0 0 0 ${ringWidth}px ${color}` : 'none',
        flexShrink: 0,
      }}
    />
  );
}

function DotLegendCard({ styles }: { styles: Record<DotKind, DotStyle> }) {
  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 12,
        rowGap: 10,
        alignItems: 'baseline',
        color: T.inkSoft,
        fontSize: rem(12),
        lineHeight: 1.5,
      }}
    >
      {DOT_KINDS.map((kind) => {
        const s = styles[kind];
        return (
          <li key={kind} style={{ display: 'contents' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                paddingTop: 4,
              }}
            >
              <LabDot color={COLOR_HEX[s.color]} hollow={s.hollow} />
            </span>
            <span>
              <strong style={{ color: COLOR_HEX[s.color] }}>{DOT_KIND_LABEL[kind]}</strong>{' '}
              <span style={{ color: T.inkMuted }}>— {DOT_KIND_BLURB[kind]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function dotStylesEqual(a: Record<DotKind, DotStyle>, b: Record<DotKind, DotStyle>): boolean {
  return DOT_KINDS.every((k) => a[k].color === b[k].color && a[k].hollow === b[k].hollow);
}

function SectionStatusDotPalette() {
  const [styles, setStyles] = useState<Record<DotKind, DotStyle>>(() => ({
    ...SHIPPED_DOT_STYLES,
  }));
  const matchesShipped = dotStylesEqual(styles, SHIPPED_DOT_STYLES);

  const update = (kind: DotKind, patch: Partial<DotStyle>) => {
    setStyles((prev) => ({ ...prev, [kind]: { ...prev[kind], ...patch } }));
  };

  return (
    <Section
      heading="Status dot palette"
      subhead="Six dot kinds on /sources. Shipped on the left, live preview on the right. Decided: green family is reserved for 'data verified against the model' (filled = human, hollow = AI). Slate-blue family is reserved for 'machine-flavoured signal' (filled = bot-blocked-verified, hollow = intermittent). Hollow/filled means evidence strength within the family. Kept around as a record + sandbox for future tweaks."
    >
      <Variation
        title="Shipped — what production renders today"
        description="Frozen scheme. Updates here when the production palette ships."
        decided
      >
        <DotLegendCard styles={SHIPPED_DOT_STYLES} />
      </Variation>
      <Variation title="Live preview" description="Reflects every change in the picker below.">
        <DotLegendCard styles={styles} />
      </Variation>
      <div
        style={{
          gridColumn: '1 / -1',
          border: `1px solid ${T.border}`,
          background: T.surface,
          borderRadius: 4,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              fontSize: rem(11),
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: T.inkMuted,
              fontWeight: 600,
            }}
          >
            Picker — drives the live preview
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 12 }}>
            {matchesShipped && (
              <span
                style={{
                  fontSize: rem(10),
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                  color: 'rgb(45, 80, 22)',
                }}
              >
                ✓ Matches shipped
              </span>
            )}
            <button
              type="button"
              onClick={() => setStyles({ ...SHIPPED_DOT_STYLES })}
              disabled={matchesShipped}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: matchesShipped ? 'default' : 'pointer',
                fontFamily: fonts.body,
                fontSize: rem(11),
                color: matchesShipped ? T.inkMuted : T.inkSoft,
                textDecoration: matchesShipped ? 'none' : 'underline',
                textDecorationStyle: 'dotted',
                textUnderlineOffset: 3,
                letterSpacing: '0.02em',
              }}
            >
              Reset to shipped
            </button>
          </div>
        </div>
        {/*
         * Single grid spanning header + every kind row. Sharing the grid
         * (rather than each row owning its own) is what keeps the header
         * labels aligned with their swatch banks below — when each row
         * had its own grid, columns sized independently per row and the
         * header drifted as soon as a row's content was wider than the
         * label text.
         *
         * `display: contents` on each row wrapper lets the swatch banks
         * group semantically (one ColorChip-flex per shipped/lab section)
         * while still participating in the outer grid as individual cells.
         */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(140px, max-content) max-content max-content max-content max-content max-content max-content',
            alignItems: 'center',
            columnGap: 12,
            rowGap: 4,
          }}
        >
          {/* Header row */}
          <span />
          <span
            style={{
              textAlign: 'center',
              color: T.inkMuted,
              fontSize: rem(10),
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              paddingBottom: 4,
              borderBottom: `1px dashed ${T.border}`,
              alignSelf: 'end',
            }}
          >
            Preview
          </span>
          <span
            style={{
              color: T.inkMuted,
              fontSize: rem(10),
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 600,
              paddingBottom: 4,
              borderBottom: `1px dashed ${T.border}`,
              alignSelf: 'end',
              textAlign: 'center',
            }}
          >
            Shipped tokens
          </span>
          <span
            style={{
              borderBottom: `1px dashed ${T.border}`,
              alignSelf: 'stretch',
            }}
          />
          <span
            style={{
              color: T.inkMuted,
              fontSize: rem(10),
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 600,
              paddingBottom: 4,
              borderBottom: `1px dashed ${T.border}`,
              alignSelf: 'end',
              textAlign: 'center',
            }}
          >
            Lab candidates
          </span>
          <span
            style={{
              borderBottom: `1px dashed ${T.border}`,
              alignSelf: 'stretch',
            }}
          />
          <span
            style={{
              textAlign: 'center',
              color: T.inkMuted,
              fontSize: rem(10),
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontWeight: 600,
              paddingBottom: 4,
              borderBottom: `1px dashed ${T.border}`,
              alignSelf: 'end',
            }}
          >
            Fill
          </span>
          {/* Data rows */}
          {DOT_KINDS.map((kind) => {
            const s = styles[kind];
            const swatchColor = COLOR_HEX[s.color];
            return (
              <div key={kind} style={{ display: 'contents' }}>
                <span style={{ fontSize: rem(12), fontWeight: 600, color: T.inkSoft }}>
                  {DOT_KIND_LABEL[kind]}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 22,
                  }}
                >
                  <LabDot color={swatchColor} hollow={s.hollow} size={14} />
                </span>
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  {SHIPPED_COLOR_OPTIONS.map((opt) => (
                    <ColorChip
                      key={opt.token}
                      option={opt}
                      isActive={s.color === opt.token}
                      isShipped={SHIPPED_DOT_STYLES[kind].color === opt.token}
                      onPick={() => update(kind, { color: opt.token })}
                    />
                  ))}
                </span>
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 1,
                    height: 22,
                    background: T.border,
                    margin: '0 4px',
                    justifySelf: 'center',
                  }}
                />
                <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                  {LAB_COLOR_OPTIONS.map((opt) => (
                    <ColorChip
                      key={opt.token}
                      option={opt}
                      isActive={s.color === opt.token}
                      isShipped={false}
                      onPick={() => update(kind, { color: opt.token })}
                    />
                  ))}
                </span>
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 1,
                    height: 22,
                    background: T.border,
                    margin: '0 4px',
                    justifySelf: 'center',
                  }}
                />
                <FillToggle
                  hollow={s.hollow}
                  color={swatchColor}
                  shippedHollow={SHIPPED_DOT_STYLES[kind].hollow}
                  onChange={(hollow) => update(kind, { hollow })}
                />
              </div>
            );
          })}
        </div>
        <div
          style={{
            fontSize: rem(11),
            color: T.inkMuted,
            lineHeight: 1.5,
            paddingTop: 6,
            borderTop: `1px dashed ${T.border}`,
          }}
        >
          Combinations worth trying: <strong>(a)</strong> bot-blocked / intermittent on{' '}
          <code>lab-brightBlue</code> if slate aiAccent feels too muted; <strong>(b)</strong>{' '}
          ai-verified → aiAccent / filled to give green-family back to &ldquo;data verified against
          the model&rdquo; only; <strong>(c)</strong> overdue → warning / hollow to reuse the
          strength mechanic on the warning family.
        </div>
      </div>
    </Section>
  );
}
