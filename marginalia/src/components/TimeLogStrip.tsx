import { theme, fonts, rem } from '../theme';
import {
  timeLogStats,
  type TimeLogRow,
  type TimeLogWindow,
} from '../data/timeLogStats';

/**
 * Editorial stat strip — surfaces aggregate AI-time-log numbers on the
 * Marginalia front page and on every post. Source data is the Atlas's
 * `AI_TIME_LOG.md`, parsed at build time by `scripts/build-stats.mjs`.
 *
 * Two modes:
 *   - default (no `range` prop): "Last 7 days" + "All time". Used on
 *     the index — running publication-level rhythm + cumulative ledger.
 *     The 7-day window is anchored on the most recent dated row in the
 *     log, not the build clock — stable across rebuilds of the same
 *     commit.
 *   - ranged (`range` prop): a single window for the supplied date
 *     range. Used on post pages so each post's strip is just the time
 *     tracked during the period it covers. All-time is intentionally
 *     omitted on posts — it lives on the index where the cumulative
 *     framing belongs.
 */
export function TimeLogStrip({
  range,
}: {
  range?: { from: string; to: string; label?: string };
}) {
  const primary: { window: TimeLogWindow; label: string } = range
    ? {
        window: windowRows(timeLogStats.rows, range.from, range.to),
        label: range.label ?? `${range.from} → ${range.to}`,
      }
    : {
        window: timeLogStats.week,
        label: `Last 7 days (${timeLogStats.weekStart} → ${timeLogStats.windowAnchor})`,
      };

  return (
    <section
      aria-label="AI time-log stats"
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.surface,
        padding: '18px 22px',
        marginTop: 28,
        marginBottom: 28,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: rem(10),
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: theme.inkMuted,
          marginBottom: 14,
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span>Tracked AI time</span>
        <span>
          From the Atlas's{' '}
          <a
            href="https://github.com/TheBudgetAtlas/thebudgetatlas/blob/main/AI_TIME_LOG.md"
            style={{ color: theme.inkMuted, textDecoration: 'underline' }}
          >
            time log
          </a>
        </span>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: range ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 18,
        }}
      >
        <Window label={primary.label} window={primary.window} />
        {!range && <Window label="All time" window={timeLogStats.allTime} />}
      </div>
    </section>
  );
}

function windowRows(rows: TimeLogRow[], from: string, to: string): TimeLogWindow {
  const filtered = rows.filter((r) => r.date >= from && r.date <= to);
  return filtered.reduce<TimeLogWindow>(
    (acc, r) => ({
      solo: round(acc.solo + r.solo),
      ai: round(acc.ai + r.ai),
      saved: round(acc.saved + r.saved),
      rowCount: acc.rowCount + 1,
    }),
    { solo: 0, ai: 0, saved: 0, rowCount: 0 },
  );
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}

function Window({ label, window }: { label: string; window: TimeLogWindow }) {
  const multiplier = window.ai > 0 ? window.solo / window.ai : 0;
  return (
    <div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: rem(10),
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: theme.inkSoft,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: rem(28),
          fontWeight: 500,
          lineHeight: 1.1,
          color: theme.ink,
          fontVariationSettings: '"opsz" 144, "SOFT" 100',
        }}
      >
        {fmtH(window.saved)} saved
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: rem(12),
          color: theme.inkSoft,
          marginTop: 4,
          lineHeight: 1.5,
        }}
      >
        {fmtH(window.solo)} solo est. · {fmtH(window.ai)} with AI ·{' '}
        {multiplier > 0 ? `${multiplier.toFixed(1)}× multiplier` : '—'}
      </div>
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: rem(10),
          color: theme.inkMuted,
          marginTop: 4,
        }}
      >
        {window.rowCount} {window.rowCount === 1 ? 'row' : 'rows'}
      </div>
    </div>
  );
}

function fmtH(h: number): string {
  if (h >= 100) return `${Math.round(h)}h`;
  if (h >= 10) return `${h.toFixed(1).replace(/\.0$/, '')}h`;
  return `${h.toFixed(1)}h`;
}
