import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import type { TooltipContentProps } from 'recharts';
import type { Source } from '@/types';
import { theme as T, fonts, rem } from '@/theme';
import { fmt } from '@/lib/format';
import { navigate } from '@/lib/nav';
import { ALL_SOURCES } from '@/data/sources';
import { getStatusKind, REVIEWS, type StatusKind } from '@/lib/audit/status';
import { useStatusByUrl } from '@/lib/audit/store';
import { StatusDot } from './audit/StatusDot';
import { ReportFlag } from './audit/ReportFlag';

/**
 * Roll a list of source statuses up to a single "worst" one. Severity
 * order (worst → best):
 *
 *   broken > intermittent > bot-blocked-verified > overdue > ai-verified > verified
 *
 * The goal is honest signal (one un-human-vetted apple in the bundle
 * should flag the bundle), not optimism. The two softer audit states sit
 * between overdue and broken: intermittent is closer to broken (we just
 * couldn't reach it), bot-blocked-verified is closer to overdue (we have
 * recent human eyes-on-page, just not eyes-on-citation).
 */
const SEVERITY: Record<StatusKind, number> = {
  verified: 0,
  'ai-verified': 1,
  overdue: 2,
  'bot-blocked-verified': 3,
  intermittent: 4,
  broken: 5,
};

function worstStatusOf(
  sources: readonly Source[],
  statusByUrl: ReadonlyMap<string, string>,
): StatusKind {
  let worst: StatusKind = 'verified';
  for (const s of sources) {
    const k = getStatusKind(s, statusByUrl);
    if (SEVERITY[k] > SEVERITY[worst]) worst = k;
    if (worst === 'broken') return worst;
  }
  return worst;
}

const STATUS_COLOR: Record<StatusKind, string> = {
  broken: T.accent,
  intermittent: T.aiAccent,
  'bot-blocked-verified': T.aiAccent,
  overdue: T.warning,
  verified: T.positive,
  'ai-verified': T.positive,
};

/**
 * Editorial citation pill. Renders a small uppercase "SRC" badge in the
 * accent color that opens the source URL in a new tab; the source label
 * appears in the native browser tooltip on hover. Visible enough to read
 * as a clickable affordance, restrained enough not to dominate text.
 *
 * Pass an array to attach multiple sources to a single value; each gets its
 * own pill.
 */
/**
 * Single-pill consolidated citation. Renders "SRC ↗ (N)" — click to open a
 * floating list of the underlying sources. Compact inline; same visual
 * weight as a single Cite pill regardless of source count.
 */
export function CiteGroup({ sources }: { sources: readonly Source[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const statusByUrl = useStatusByUrl();
  if (sources.length === 0) return null;
  const worstStatus = worstStatusOf(sources, statusByUrl);

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        aria-expanded={open}
        aria-label={`${sources.length} sources, worst status: ${worstStatus}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          fontSize: '0.62em',
          fontFamily: fonts.body,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: T.accent,
          padding: '3px 6px 2px',
          margin: '0 4px',
          border: `1px solid ${T.accent}`,
          borderRadius: 2,
          background: open ? T.bgAlt : 'transparent',
          textDecoration: 'none',
          verticalAlign: 'middle',
          lineHeight: 1,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          position: 'relative',
          top: '-0.1em',
        }}
      >
        {/* Group-status dot mirrors the worst per-row status — broken if any
            source is unreachable, else overdue if any is stale, else
            ai-verified if any is awaiting a human pass, else verified.
            Hollow ring for ai-verified mirrors the per-row treatment so the
            rollup speaks the same visual vocabulary as the rows it summarises. */}
        <span
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: worstStatus === 'ai-verified' ? 'transparent' : STATUS_COLOR[worstStatus],
            boxShadow:
              worstStatus === 'ai-verified'
                ? `inset 0 0 0 2px ${STATUS_COLOR[worstStatus]}`
                : 'none',
            flexShrink: 0,
          }}
        />
        {sources.length === 1 ? 'source · 1 ↗' : `sources · ${sources.length} ↗`}
      </button>
      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            background: T.surface,
            border: `1px solid ${T.border}`,
            padding: '8px 0',
            minWidth: 260,
            maxWidth: 360,
            zIndex: 50,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            fontFamily: fonts.body,
            fontSize: rem(12),
            color: T.ink,
            textTransform: 'none',
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          {sources.map((s, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '6px 10px 6px 14px',
                lineHeight: 1.4,
              }}
            >
              <span style={{ paddingTop: 4 }}>
                <StatusDot kind={getStatusKind(s, statusByUrl)} size={8} />
              </span>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                onMouseDown={(e) => e.stopPropagation()}
                style={{
                  flex: 1,
                  minWidth: 0,
                  color: T.ink,
                  textDecoration: 'none',
                }}
              >
                <span>{s.label}</span> <span style={{ color: T.accent, fontWeight: 600 }}>↗</span>
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
                  {s.tier && <TierPill tier={s.tier} />}
                  {(() => {
                    // V3-style kind code prefix on the metadata line: a
                    // tiny `H` (human-reviewed) or `AI` (AI-reviewed) in
                    // editorial green, paired with the hollow-vs-filled
                    // status dot above to reinforce provenance without
                    // adding visual weight. Skip when there's no review
                    // yet — the dot's overdue color says it.
                    const latestKind = REVIEWS.get(s.id)?.[0]?.kind;
                    if (!latestKind) return null;
                    const code = latestKind === 'human' ? 'H' : 'AI';
                    return (
                      <span
                        style={{
                          fontFamily: fonts.mono,
                          fontSize: rem(10),
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          color: T.positive,
                        }}
                      >
                        {code}
                      </span>
                    );
                  })()}
                  {s.date && <span>{s.date}</span>}
                </div>
              </a>
              <ReportFlag source={s} />
            </div>
          ))}
          <a
            href="/sources"
            onClick={(e) => {
              e.preventDefault();
              navigate('/sources');
              setOpen(false);
            }}
            style={{
              display: 'block',
              padding: '8px 14px 6px',
              borderTop: `1px solid ${T.border}`,
              marginTop: 4,
              fontSize: rem(11),
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: T.inkMuted,
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            What do these tiers mean? →
          </a>
        </div>
      )}
    </span>
  );
}

/**
 * Compact pill rendering a source's tier — primary / reference / commercial.
 * Matches the styling used on /sources for visual continuity. Inline in
 * citation popovers so readers see the trust tier of every source
 * (publisher-direct vs. peer-respected interpretation vs. commercial /
 * crowd-sourced product) without leaving the page.
 */
function TierPill({ tier }: { tier: string }) {
  // Tier colours: green for primary, slate-blue for reference (one step
  // removed but still authoritative), gold for commercial (proprietary
  // methodology, treat with appropriate skepticism). Mirrors the production
  // TierPill in Sources.tsx — kept inline here to avoid a circular import.
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
 * Inline single- or multi-source citation. Thin alias around CiteGroup so
 * every citation on the site gets the same rich popover (tier pill + date +
 * "what do these tiers mean?" link). Kept as a separate export because most
 * call sites pass a single `source` prop and reading `<Cite source={X} />`
 * is more natural at the call site than `<CiteGroup sources={[X]} />`.
 */
export function Cite({ source }: { source: Source | readonly Source[] }) {
  const sources = Array.isArray(source) ? source : [source as Source];
  return <CiteGroup sources={sources} />;
}

/**
 * Inline hover-gloss for terms that need a quick definition without
 * cluttering the body text. Dotted underline + cursor:help signals
 * hoverability; a small popover appears on mouse-enter / focus and
 * disappears on leave / blur / Escape. Native `title=` was tried
 * first but is too slow and browser-flaky for a visible-feedback
 * UI affordance.
 *
 * Use sparingly — every glossed term costs reading flow. Reserve
 * for genuinely-confusing distinctions (e.g. "household" actually
 * meaning "BLS consumer unit"), not for every piece of jargon.
 */
export function HoverGloss({ children, gloss }: { children: ReactNode; gloss: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <span
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      tabIndex={0}
      style={{
        position: 'relative',
        borderBottom: `1px dotted ${T.inkSoft}`,
        cursor: 'help',
        outline: 'none',
      }}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            zIndex: 10,
            width: 320,
            maxWidth: '90vw',
            padding: '10px 12px',
            background: T.surface,
            border: `1px solid ${T.border}`,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            fontFamily: fonts.body,
            fontSize: rem(12),
            lineHeight: 1.5,
            color: T.ink,
            fontStyle: 'normal',
            whiteSpace: 'normal',
          }}
        >
          {gloss}
        </span>
      )}
    </span>
  );
}

/**
 * Type-to-filter combobox. Renders an input that opens a popover list of
 * options, filtered by case-insensitive substring match on the option's
 * label. Keyboard support: ↑↓ to move, Enter to select, Esc to close.
 *
 * Stays consistent with the project's no-framework, inline-styles approach.
 * Generic `T` is the option's value (typically a string slug). The component
 * only mutates via `onChange`; selection state lives in the parent.
 */
export interface SearchableOption<T extends string> {
  value: T;
  label: string;
  /** Optional secondary text (e.g. "— Moderate"); rendered dim, also searched. */
  hint?: string;
}

export function SearchableSelect<T extends string>({
  value,
  options,
  onChange,
  placeholder,
  ariaLabel,
  minWidth,
}: {
  value: T;
  options: readonly SearchableOption<T>[];
  onChange: (v: T) => void;
  placeholder?: string;
  ariaLabel?: string;
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  // When closed, the input shows the selected label. When open, the user's
  // active query is what's visible — so they can filter without losing the
  // baseline by accident.
  const displayValue = open ? query : (selected?.label ?? '');

  const q = query.trim().toLowerCase();
  const filtered =
    !open || q === ''
      ? options
      : options.filter(
          (o) => o.label.toLowerCase().includes(q) || (o.hint?.toLowerCase().includes(q) ?? false),
        );

  // Reset highlight to the top when the filter query changes or the popover
  // opens/closes. Done with the "adjust state during render" pattern instead
  // of a useEffect that calls setState — the latter causes a cascading
  // render. React optimizes this path: it discards the first render and
  // re-runs with the corrected state.
  // See https://react.dev/learn/you-might-not-need-an-effect
  const [prevQ, setPrevQ] = useState(q);
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevQ !== q || prevOpen !== open) {
    setPrevQ(q);
    setPrevOpen(open);
    setActiveIdx(0);
  }

  // Click-outside / Escape: same pattern as CiteGroup.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Keep the active row scrolled into view while arrow-keying.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const commit = (v: T) => {
    onChange(v);
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
  };

  const onKey = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = filtered[activeIdx];
      if (pick) commit(pick.value);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth }}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-label={ariaLabel}
        autoComplete="off"
        spellCheck={false}
        value={displayValue}
        placeholder={placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKey}
        style={{
          width: '100%',
          padding: '10px 32px 10px 12px',
          fontFamily: fonts.body,
          fontSize: rem(14),
          background: T.bg,
          border: `1px solid ${T.border}`,
          color: T.ink,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
      <span
        style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: T.inkMuted,
          fontSize: rem(11),
          pointerEvents: 'none',
        }}
      >
        {open ? '▴' : '▾'}
      </span>
      {open && (
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            background: T.bg,
            border: `1px solid ${T.border}`,
            maxHeight: 280,
            overflowY: 'auto',
            zIndex: 60,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          }}
        >
          {filtered.length === 0 && (
            <div
              style={{
                padding: '10px 12px',
                fontSize: rem(13),
                color: T.inkMuted,
                fontFamily: fonts.body,
              }}
            >
              No matches
            </div>
          )}
          {filtered.map((o, i) => {
            const active = i === activeIdx;
            const isSelected = o.value === value;
            return (
              <div
                key={o.value}
                data-idx={i}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActiveIdx(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(o.value);
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  fontFamily: fonts.body,
                  fontSize: rem(14),
                  background: active ? T.bgAlt : 'transparent',
                  color: T.ink,
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  borderLeft: isSelected ? `2px solid ${T.accent}` : '2px solid transparent',
                }}
              >
                <span>{o.label}</span>
                {o.hint && <span style={{ color: T.inkMuted, fontSize: rem(12) }}>{o.hint}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ padding: '14px 16px', background: T.surface, border: `1px solid ${T.border}` }}>
      <div
        style={{
          fontSize: rem(11),
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: T.inkMuted,
          fontFamily: fonts.body,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: rem(22),
          fontWeight: 500,
          color: accent || T.ink,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: rem(12), color: T.inkSoft, marginTop: 6, fontFamily: fonts.body }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ children, kicker }: { children: ReactNode; kicker?: ReactNode }) {
  return (
    <div style={{ marginBottom: 16, marginTop: 8 }}>
      {kicker && (
        <div
          style={{
            fontSize: rem(11),
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: T.accent,
            fontFamily: fonts.body,
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{
          fontFamily: fonts.display,
          // Slight clamp on the section title so long ones (e.g. "State CHIP
          // administering agencies") don't crowd the kicker on narrow widths.
          fontSize: `clamp(${rem(20)}, 4.5vw, ${rem(26)})`,
          fontWeight: 500,
          color: T.ink,
          letterSpacing: '-0.01em',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Page-footer "sources backing this view" block. Pages that display data
 * derived from cited sources should render this at the bottom — it gives
 * readers the citation slip for what they just read AND points at the full
 * bibliography on `/sources` for the broader registry.
 *
 * The discipline this enforces:
 *   - Every data-driven page lists its citations in one consistent place.
 *   - The full-bibliography link is always there, with the live count.
 *   - When a citation moves (URL update in `sources.ts`), the page footer
 *     reflects it automatically — no per-page maintenance.
 *
 * Don't render this on `/sources` itself (the whole page IS the bibliography).
 */
export function PageSources({
  sources,
  heading = 'Sources cited on this page',
}: {
  sources: readonly Source[];
  heading?: string;
}) {
  if (sources.length === 0) return null;
  return (
    <div
      style={{
        marginTop: 40,
        paddingTop: 20,
        borderTop: `2px solid ${T.ink}`,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: rem(11),
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        {heading}
      </div>
      <div
        style={{
          fontSize: rem(11),
          color: T.inkMuted,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          lineHeight: 1.9,
        }}
      >
        {sources.map((s, i) => (
          <span key={`${s.url}-${i}`}>
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
            {i < sources.length - 1 && ' · '}
          </span>
        ))}
      </div>
      <div
        style={{
          marginTop: 18,
          fontSize: rem(11),
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}
      >
        <a
          href="/sources"
          onClick={(e) => {
            e.preventDefault();
            navigate('/sources');
          }}
          style={{
            color: T.accent,
            textDecoration: 'none',
            fontWeight: 600,
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 2,
          }}
        >
          → Full bibliography · {ALL_SOURCES.length} cited sources
        </a>
      </div>
    </div>
  );
}

export function CustomTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || !payload.length) return null;
  // BarChart provides `label` (the X-axis value); PieChart doesn't, so fall
  // back to the payload entry's own name (the slice's category).
  const heading = label ?? payload[0]?.name;
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: '8px 12px',
        fontFamily: fonts.body,
        fontSize: rem(13),
      }}
    >
      <div style={{ color: T.inkMuted, marginBottom: 2 }}>{heading}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: fonts.mono }}>
          {fmt(p.value as number)}/mo
        </div>
      ))}
    </div>
  );
}
