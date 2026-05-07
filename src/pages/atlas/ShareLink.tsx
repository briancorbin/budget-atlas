import { useEffect, useRef, useState } from 'react';
import { theme as T, fonts, rem } from '@/theme';

/**
 * Share-link affordance, V5: an accent-colored, plain-underlined "Copy
 * share link" with a small "Send this to someone:" lead-in. Lives below
 * the budget output (after DiscretionaryPlan) — the moment a reader
 * thinks "I should send this to my partner" is right after they see the
 * discretionary number, not while configuring inputs.
 *
 * Styling intentionally avoids:
 *   - dotted underline → would collide with the citation popover pattern
 *   - the ↗ arrow      → reads as "opens externally" but this copies
 *   - button chrome    → competes with input controls and feels SaaS-y
 */
export function ShareLink({ shareUrl }: { shareUrl: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current != null) window.clearTimeout(timer.current);
    };
  }, []);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked (insecure context, denied permission). The URL
      // is in the address bar — user can copy it from there.
    }
  };

  return (
    <div
      style={{
        marginTop: 24,
        marginBottom: 24,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}
    >
      <span
        style={{
          fontSize: rem(12),
          color: T.inkSoft,
          letterSpacing: '0.02em',
          fontFamily: fonts.body,
        }}
      >
        Send this view to someone:
      </span>
      <button
        type="button"
        onClick={onCopy}
        aria-label="Copy a shareable link to this view"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          fontFamily: fonts.body,
          fontSize: rem(13),
          color: T.accent,
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          letterSpacing: '0.02em',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}
      >
        {copied ? 'Link copied ✓' : 'Copy share link'}
      </button>
    </div>
  );
}
