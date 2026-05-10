/**
 * Compact green/yellow/red dot indicating a source's current state.
 *
 * Pure-presentation component: the parent classifies the source via
 * `getStatusKind` (in `lib/audit/status.ts`) and passes the result in.
 * Hover reveals an editorial tooltip; aria-label exposes the same to ATs.
 */

import { useState } from 'react';
import { theme as T, fonts, rem } from '@/theme';
import type { StatusKind } from '@/lib/audit/status';

const STATUS_PALETTE: Record<
  StatusKind,
  { color: string; short: string; long: string; hollow?: boolean }
> = {
  broken: {
    color: T.accent,
    short: 'Broken',
    long: 'URL is currently unreachable (404 / error). Needs a fix in src/data/sources.ts paired with a row in reviewed.tsv.',
  },
  intermittent: {
    color: T.aiAccent,
    short: 'Intermittent',
    long: 'Latest audit run could not reach this URL, but at least one of the last few runs did. Held back from escalation while the flap clears — the next consistent failure flips it to Broken.',
    hollow: true,
  },
  'bot-blocked-verified': {
    color: T.aiAccent,
    short: 'Bot-blocked',
    long: 'The audit cannot reach this URL from CI (a state agency that refuses non-browser user agents), but a human verified it loads in a real browser within the last 30 days.',
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
            boxShadow: T.shadows.lg,
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
