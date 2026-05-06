/**
 * Shared source-status logic + components.
 *
 * Extracted from `components/Sources.tsx` so both the /sources page and the
 * inline citation popover (`CiteGroup` in `components/ui.tsx`) classify and
 * render status the same way. One source of truth for:
 *
 *   - BROKEN_STATUS_CODES — what counts as broken from curl results.
 *   - useStatusByUrl — React hook returning the latest curl status per URL.
 *   - REVIEWS — review history per source id (built from reviewed.tsv).
 *   - isOverdue / getStatusKind — tier-aware staleness check.
 *   - StatusDot — the green/yellow/red indicator.
 *   - ReportFlag — quick link to file an audit:report issue.
 *
 * Reviews are keyed by stable source id (slug); audit results stay
 * URL-keyed since curl checks URLs. See audit/links/README.md.
 */

import { useState, useSyncExternalStore } from 'react';
import { theme as T, fonts, rem } from '@/theme';
import type { Source } from '@/types';
// reviewed.tsv is authored content (git history is meaningful) and stays
// bundled. Audit results moved to a D1-backed API in PR A; the site now
// fetches them at runtime from /api/audit/latest. See audit/links/README.md.
import reviewedTsv from '../../audit/links/reviewed.tsv?raw';

const REPO = 'https://github.com/TheBudgetAtlas/thebudgetatlas';

/**
 * Review provenance — collapsed to a binary after the three-state experiment.
 *
 *   - `human` — eyes-on-source, no AI involvement.
 *   - `ai`    — AI helped propose or extract; whatever human review happened
 *               (a glance, a careful read, none) is self-reported and
 *               unverifiable, so we don't pretend to subdivide.
 *
 * The earlier `ai-assisted` / `ai-proposed` split tried to grade AI work by
 * how much human review followed. In practice the line was too fuzzy to
 * carry weight (one person's "I read it" is another's "I clicked merge"),
 * and the UI naturally collapsed both into "AI reviewed." Two states is
 * sharper, less self-deceptive, and lower friction when adding rows.
 */
export type ReviewKind = 'human' | 'ai';

export interface Review {
  date: string;
  reviewer: string;
  /**
   * What kind of verification this row records. Legacy rows (4-column
   * format, pre-kind-column) default to `human` since that's what they
   * were before the schema change. New rows declare it explicitly. See
   * audit/links/reviewed.tsv header for the full definitions.
   *
   * Forwards-compat: rows written under the old three-state vocabulary
   * (`ai-assisted`, `ai-proposed`) are normalised to `ai` at parse time so
   * the schema migration doesn't require touching every old row.
   */
  kind: ReviewKind;
  notes: string;
}

/**
 * Recognised values in the kind column. Includes the legacy three-state
 * spellings so old rows still parse; the parser folds them into `ai`.
 *
 * `verified-bot-blocked` is recognised by the validator (so a row with
 * that kind doesn't get rejected as malformed) but is NOT loaded into
 * REVIEWS — those rows only affect the broken-link audit's suppression,
 * not the user-facing review history shown on /sources or the staleness
 * clock. See audit/links/seed-issues.mjs for how they're consumed.
 */
const REVIEW_KIND_VALUES: ReadonlySet<string> = new Set([
  'human',
  'ai',
  'ai-assisted',
  'ai-proposed',
  'verified-bot-blocked',
]);

const REVIEW_KIND_HIDDEN: ReadonlySet<string> = new Set(['verified-bot-blocked']);

function normaliseKind(raw: string): ReviewKind {
  if (raw === 'human') return 'human';
  return 'ai';
}

/** Status codes that classify a citation as broken in the UI + audit issue. */
// 999 is excluded — it's an anti-bot signal (LinkedIn, several state .gov
// sites use it to refuse automated traffic). The page is usually fine in a
// real browser, so categorising it as "broken" produces false positives in
// the count. It belongs alongside 403 in the bot-blocked bucket. Matches
// the status-code interpretation table in audit/links/README.md.
export const BROKEN_STATUS_CODES = new Set(['404', '000', '000ERR', 'ERR']);

export function isBrokenStatus(status: string | undefined): boolean {
  if (!status) return false;
  return BROKEN_STATUS_CODES.has(status);
}

/**
 * Tier review thresholds in days — must stay in sync with
 * `audit/staleness/seed-issue.mjs`. The Node script writes the issue;
 * this module drives the UI.
 */
export const STALENESS_THRESHOLDS_DAYS: Record<string, number> = {
  // Direct from the publisher; high-stakes if drifted.
  primary: 90,
  // Peer-respected third-party interpretation; medium drift risk.
  reference: 180,
  // Commercial / crowd-sourced data products are MORE volatile than primary
  // (Zillow's index updates monthly, RentCafe shifts constantly), so the
  // window matches primary's 90-day cadence rather than getting a longer
  // leash. Earlier draft used 365d; that was the relic of `estimate`'s
  // "approximation, hardly changes" rationale, which doesn't apply here.
  commercial: 90,
};
export const STALENESS_DEFAULT_DAYS = 180;

/**
 * Status store — URL → most recent curl status code, fetched at runtime
 * from the D1-backed audit API.
 *
 * Tiny external store: a module-level `Map` that components subscribe to
 * via `useStatusByUrl()` (built on `useSyncExternalStore`). The map is
 * empty on initial render — sources show with no broken-state until the
 * fetch resolves, then re-render. We deliberately don't gate the whole
 * tree on the fetch: status is decoration over the citation registry,
 * not the registry itself, and a brief "no audit data" state is
 * preferable to blocking first paint on a network round-trip.
 *
 * Failure mode: a 4xx/5xx or network error keeps the map empty and logs
 * a warning. Status dots fall through to "no broken signal" + the normal
 * overdue/review classification, which is the same behaviour you'd get
 * if the audit hadn't run yet for a never-checked source.
 */
let statusByUrlSnapshot: ReadonlyMap<string, string> = new Map();
const statusListeners = new Set<() => void>();
let statusFetchStarted = false;

interface AuditLatestResponse {
  run_date?: string;
  results?: Array<{ url?: string; status?: string }>;
}

function notifyStatusListeners() {
  for (const cb of statusListeners) cb();
}

/**
 * Kick off the one-time fetch of /api/audit/latest. Idempotent — safe to
 * call from multiple boot paths; only the first call hits the network.
 * Resolves silently on failure so callers don't need to handle errors.
 */
export async function prefetchStatus(): Promise<void> {
  if (statusFetchStarted) return;
  statusFetchStarted = true;
  try {
    const res = await fetch('/api/audit/latest');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as AuditLatestResponse;
    const map = new Map<string, string>();
    for (const r of json.results ?? []) {
      if (typeof r.url === 'string' && typeof r.status === 'string') map.set(r.url, r.status);
    }
    statusByUrlSnapshot = map;
    notifyStatusListeners();
  } catch (err) {
    console.warn('[audit] failed to load /api/audit/latest:', err);
  }
}

/**
 * React hook returning the URL → status map. Re-renders on first load.
 * The returned map is read-only — pass it down or treat snapshots as
 * stable references between renders.
 */
export function useStatusByUrl(): ReadonlyMap<string, string> {
  return useSyncExternalStore(
    (cb) => {
      statusListeners.add(cb);
      return () => statusListeners.delete(cb);
    },
    () => statusByUrlSnapshot,
  );
}

/**
 * Non-reactive accessor for code paths that aren't hooks (e.g. event
 * handlers reading the latest status without subscribing). Hook-using
 * components should prefer `useStatusByUrl()`.
 */
export function getStatusByUrlSnapshot(): ReadonlyMap<string, string> {
  return statusByUrlSnapshot;
}

/**
 * Parse `audit/links/reviewed.tsv` into a Map keyed by source id (newest
 * review first within each list). Reviews follow source identity (slug),
 * not URL — so URL changes don't orphan history.
 */
export const REVIEWS = (() => {
  const map = new Map<string, Review[]>();
  for (const line of reviewedTsv.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('id\t')) continue;
    const parts = line.split('\t');
    const [id, date, reviewer] = parts;
    if (!id) continue;
    // 4-col legacy: id, date, reviewer, notes — kind defaults to 'human'.
    // 5-col current: id, date, reviewer, kind, notes.
    //
    // Disambiguation rule: a 5+ column row is "5-column" iff column 4 is a
    // recognised kind. If column 4 is NOT a recognised kind, we treat the
    // row as malformed rather than falling back to legacy parsing — a typo
    // like `humn` or `ai-asistted` would otherwise silently promote a row
    // to kind='human' with the column shifted into notes. Loud failure
    // beats silent misclassification when the whole point of the kind
    // column is honest provenance.
    let kind: ReviewKind;
    let notes: string;
    if (parts.length >= 5) {
      if (!REVIEW_KIND_VALUES.has(parts[3])) {
        console.warn(
          `[reviewed.tsv] Unrecognised kind "${parts[3]}" on row for "${id}". ` +
            `Expected one of: ${Array.from(REVIEW_KIND_VALUES).join(', ')}. ` +
            `Skipping row to avoid silent misclassification.`,
        );
        continue;
      }
      // verified-bot-blocked rows are valid but intentionally excluded
      // from REVIEWS — they don't represent the kind of full-citation
      // verification the /sources page surfaces, and shouldn't reset
      // the staleness clock via isOverdue() either.
      if (REVIEW_KIND_HIDDEN.has(parts[3])) continue;
      kind = normaliseKind(parts[3]);
      notes = parts[4] ?? '';
    } else {
      kind = 'human';
      notes = parts[3] ?? '';
    }
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push({ date, reviewer, kind, notes });
  }
  for (const list of map.values()) {
    list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }
  return map;
})();

/** Tier-aware overdue check. Never-reviewed sources are overdue from day one. */
export function isOverdue(source: Source): boolean {
  const tier = source.tier ?? 'reference';
  const thresholdDays = STALENESS_THRESHOLDS_DAYS[tier] ?? STALENESS_DEFAULT_DAYS;
  const latest = REVIEWS.get(source.id)?.[0];
  if (!latest) return true;
  const reviewDate = new Date(latest.date + 'T00:00:00Z');
  if (Number.isNaN(reviewDate.valueOf())) return false;
  const dueDate = new Date(reviewDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + thresholdDays);
  return new Date() > dueDate;
}

export type StatusKind = 'broken' | 'overdue' | 'verified' | 'ai-verified';

/**
 * Combined status classifier — broken takes precedence, then overdue, then
 * verified vs ai-verified based on the latest review's kind.
 *
 * `ai-verified` means: URL loads, latest review is within the tier window,
 * but that review was AI-assisted or AI-proposed rather than eyes-on-source
 * by a human. We render it as a hollow green ring (same color family as
 * verified, different shape) to signal "same kind of state, just provisional."
 */
export function getStatusKind(
  source: Source,
  statusByUrl: ReadonlyMap<string, string>,
): StatusKind {
  if (isBrokenStatus(statusByUrl.get(source.url))) return 'broken';
  if (isOverdue(source)) return 'overdue';
  const latest = REVIEWS.get(source.id)?.[0];
  if (latest && latest.kind === 'ai') return 'ai-verified';
  return 'verified';
}

const STATUS_PALETTE: Record<
  StatusKind,
  { color: string; short: string; long: string; hollow?: boolean }
> = {
  broken: {
    color: T.accent,
    short: 'Broken',
    long: 'URL is currently unreachable (404 / error). Needs a fix in src/data/sources.ts paired with a row in reviewed.tsv.',
  },
  overdue: {
    color: T.warning,
    short: 'Overdue',
    long: 'No review within the tier-specific window. Pick this up during a periodic sweep.',
  },
  verified: {
    color: T.positive,
    short: 'Verified',
    long: 'Loads correctly and has been reviewed by a human within its window.',
  },
  'ai-verified': {
    color: T.positive,
    short: 'AI-reviewed',
    long: 'Loads correctly and has been reviewed with AI assistance, but a human has not yet given it a pass.',
    hollow: true,
  },
};

/**
 * Compact green/yellow/red dot indicating a source's current state.
 * Hover reveals an editorial tooltip; aria-label exposes the same to ATs.
 *
 * `size` defaults to 10px (matching the /sources row); pass a smaller
 * value for inline-popover use where row density is tighter. `showTooltip`
 * can be turned off if the dot lives somewhere a hovering tooltip would
 * overflow or duplicate context already on screen.
 */
export function StatusDot({
  kind,
  size = 10,
  showTooltip = true,
}: {
  kind: StatusKind;
  size?: number;
  showTooltip?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const palette = STATUS_PALETTE[kind];
  const hollow = palette.hollow === true;
  const ringWidth = Math.max(2, Math.round(size / 5));
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        flexShrink: 0,
        alignSelf: 'center',
      }}
      onMouseEnter={() => showTooltip && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => showTooltip && setHover(true)}
      onBlur={() => setHover(false)}
      tabIndex={showTooltip ? 0 : -1}
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
      {hover && showTooltip && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 8px)',
            // Anchor to the dot's left edge rather than centering on it.
            // Centered tooltips clip on mobile when the dot lives at the
            // far left of a row.
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

/**
 * Quick "report a problem" affordance for a citation. Renders a small
 * flag icon that opens the source-report issue template in a new tab,
 * pre-filling the source URL field. Title gets a placeholder pulled
 * from the source label so triagers know which citation it concerns.
 *
 * Intentionally subtle — the goal is to make reporting frictionless for
 * a reader who notices something off, without turning every citation
 * into a "give us feedback" call to action.
 */
export function ReportFlag({ source }: { source: Source }) {
  const [hover, setHover] = useState(false);
  // Pre-fill the form's required fields so the reporter lands one step
  // closer to "submit." `report-date` defaults to today (UTC); the form
  // copy asks for the day they actually saw the problem, which is
  // overwhelmingly today — they can edit if it was earlier.
  const today = new Date().toISOString().slice(0, 10);
  const params = new URLSearchParams({
    template: 'source-report.yml',
    title: `Report: ${source.label}`,
    'source-url': source.url,
    'report-date': today,
  });
  const href = `${REPO}/issues/new?${params.toString()}`;
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        aria-label={`Report a problem with ${source.label}`}
        onMouseDown={(e) => e.stopPropagation()}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22,
          borderRadius: 2,
          color: T.accent,
          textDecoration: 'none',
          flexShrink: 0,
          fontSize: rem(13),
          lineHeight: 1,
        }}
      >
        ⚑
      </a>
      {hover && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            // Anchor to the flag's right edge so the tooltip grows leftward —
            // the flag sits at the right side of the popover row, so a
            // left-anchored tooltip would clip on narrow viewports.
            right: 0,
            padding: '6px 10px',
            background: T.ink,
            color: T.bg,
            fontSize: rem(11),
            fontFamily: fonts.body,
            lineHeight: 1.3,
            fontWeight: 500,
            textTransform: 'none',
            letterSpacing: '0.01em',
            borderRadius: 3,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          Report a problem
        </span>
      )}
    </span>
  );
}
