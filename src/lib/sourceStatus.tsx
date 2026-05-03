/**
 * Shared source-status logic + components.
 *
 * Extracted from `components/Sources.tsx` so both the /sources page and the
 * inline citation popover (`CiteGroup` in `components/ui.tsx`) classify and
 * render status the same way. One source of truth for:
 *
 *   - BROKEN_STATUS_CODES — what counts as broken from curl results.
 *   - STATUS_BY_URL — latest curl status per URL (built from latest.tsv).
 *   - REVIEWS — review history per source id (built from reviewed.tsv).
 *   - isOverdue / getStatusKind — tier-aware staleness check.
 *   - StatusDot — the green/yellow/red indicator.
 *   - ReportFlag — quick link to file an audit:report issue.
 *
 * Reviews are keyed by stable source id (slug); audit results stay
 * URL-keyed since curl checks URLs. See audit/links/README.md.
 */

import { useState } from 'react';
import { theme as T, fonts, rem } from '@/theme';
import type { Source } from '@/types';
// Vite inlines these at build time. Same files the audit pipeline writes.
import reviewedTsv from '../../audit/links/reviewed.tsv?raw';
import latestResultsTsv from '../../audit/links/results/latest.tsv?raw';

const REPO = 'https://github.com/TheBudgetAtlas/thebudgetatlas';

export interface Review {
  date: string;
  reviewer: string;
  notes: string;
}

/** Status codes that classify a citation as broken in the UI + audit issue. */
export const BROKEN_STATUS_CODES = new Set(['404', '000', '000ERR', 'ERR', '999']);

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
  original: 90,
  reference: 180,
  estimate: 365,
};
export const STALENESS_DEFAULT_DAYS = 180;

/** URL → most recent curl status code, parsed once at module load. */
export const STATUS_BY_URL = (() => {
  const map = new Map<string, string>();
  for (const line of latestResultsTsv.split('\n').slice(1)) {
    if (!line) continue;
    const [status, url] = line.split('\t');
    if (url) map.set(url, status);
  }
  return map;
})();

/**
 * Parse `audit/links/reviewed.tsv` into a Map keyed by source id (newest
 * review first within each list). Reviews follow source identity (slug),
 * not URL — so URL changes don't orphan history.
 */
export const REVIEWS = (() => {
  const map = new Map<string, Review[]>();
  for (const line of reviewedTsv.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('id\t')) continue;
    const [id, date, reviewer, notes] = line.split('\t');
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push({ date, reviewer, notes: notes ?? '' });
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

export type StatusKind = 'broken' | 'overdue' | 'verified';

/** Combined status classifier — broken takes precedence, then overdue, then verified. */
export function getStatusKind(source: Source): StatusKind {
  if (isBrokenStatus(STATUS_BY_URL.get(source.url))) return 'broken';
  if (isOverdue(source)) return 'overdue';
  return 'verified';
}

const STATUS_PALETTE: Record<
  StatusKind,
  { color: string; short: string; long: string }
> = {
  broken: {
    color: T.accent,
    short: 'Broken',
    long: 'URL is currently unreachable (404 / error). Needs a fix in sources.ts paired with a row in reviewed.tsv.',
  },
  overdue: {
    color: T.warning,
    short: 'Overdue',
    long: 'No human review within the tier-specific window. Pick this up during a periodic sweep.',
  },
  verified: {
    color: T.positive,
    short: 'Verified',
    long: 'Loads correctly and has been reviewed by a human within its window.',
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
          background: palette.color,
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
  const params = new URLSearchParams({
    template: 'source-report.yml',
    title: `Report: ${source.label}`,
    'source-url': source.url,
  });
  const href = `${REPO}/issues/new?${params.toString()}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title="Report a problem with this citation"
      aria-label={`Report a problem with ${source.label}`}
      onMouseDown={(e) => e.stopPropagation()}
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
  );
}
