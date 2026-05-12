/**
 * Quick "report a problem" affordance for a citation.
 *
 * Renders a small flag icon that opens the source-report issue template
 * in a new tab, pre-filling the source URL field. Title gets a placeholder
 * pulled from the source label so triagers know which citation it concerns.
 *
 * Intentionally subtle — the goal is to make reporting frictionless for
 * a reader who notices something off, without turning every citation
 * into a "give us feedback" call to action.
 */

import { useState } from 'react';
import { theme as T, fonts, rem } from '@/theme';
import type { Source } from '@/types';

const REPO = 'https://github.com/TheBudgetAtlas/thebudgetatlas';

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
            boxShadow: T.shadows.lg,
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
