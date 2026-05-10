import { useEffect, useRef, useState } from 'react';
import { theme as T, fonts, rem } from '@/theme';
import { navigate } from '@/lib/nav';

const navLinkStyle = {
  color: T.accent,
  textDecoration: 'none',
  fontWeight: 600,
  borderBottom: `1px solid ${T.border}`,
  paddingBottom: 1,
} as const;

const NAV_ITEMS = [
  ['/about', 'About', false],
  ['/sources', 'Sources', false],
  ['/roadmap', 'Roadmap', false],
  ['/privacy', 'Privacy', false],
  ['/terms', 'Terms', false],
  ['https://marginalia.thebudgetatlas.com', 'Marginalia', true],
] as const;

// Unicode ↗ (U+2197) renders as a color emoji on iOS Safari, which clashes
// with the editorial typography. Inline SVG forces a glyph-style arrow that
// inherits currentColor.
function ExternalArrow() {
  return (
    <svg
      aria-hidden
      width="0.7em"
      height="0.7em"
      viewBox="0 0 10 10"
      style={{ verticalAlign: 'baseline', marginLeft: 1 }}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
    >
      <path d="M2.5 7.5 L7.5 2.5" />
      <path d="M3.5 2.5 L7.5 2.5 L7.5 6.5" />
    </svg>
  );
}

export function Masthead() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Lock body scroll while the menu sheet is open so the page underneath
  // doesn't scroll under the overlay. Restore on close.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);
  return (
    <div
      style={{
        borderTop: `2px solid ${T.ink}`,
        borderBottom: `1px solid ${T.border}`,
        paddingTop: 18,
        paddingBottom: 24,
        marginBottom: 32,
      }}
    >
      {/* Title-and-nav header row. Desktop shows the full inline nav to
          the right of the title block; mobile hides that nav and shows a
          MENU trigger that opens a full-screen overlay sheet — the full
          nav doesn't fit cleanly on a phone width without wrapping
          unpredictably. */}
      <style>{`
        .masthead-header { display: flex; justify-content: space-between;
          align-items: baseline; gap: 12px; }
        .masthead-nav-inline { display: flex; align-items: baseline; gap: 18px;
          flex-wrap: wrap; justify-content: flex-end; }
        .masthead-menu-trigger { display: none; }
        @media (max-width: 720px) {
          .masthead-nav-inline { display: none; }
          .masthead-menu-trigger { display: inline-flex; }
        }
      `}</style>
      <div className="masthead-header">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              fontSize: rem(11),
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: T.accent,
              fontWeight: 600,
            }}
          >
            The Budget Atlas <span style={{ whiteSpace: 'nowrap' }}>· Vol.&nbsp;2026</span>
          </div>
          <span
            style={{
              fontSize: rem(11),
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: T.inkMuted,
              fontWeight: 500,
            }}
          >
            An interactive examination
          </span>
        </div>
        <nav
          aria-label="Primary"
          className="masthead-nav-inline"
          style={{
            fontSize: rem(11),
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: T.inkMuted,
          }}
        >
          {NAV_ITEMS.map(([href, label, external]) =>
            external ? (
              <a key={href} href={href} style={navLinkStyle}>
                {label} <ExternalArrow />
              </a>
            ) : (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(href);
                }}
                style={navLinkStyle}
              >
                {label} →
              </a>
            ),
          )}
        </nav>
        <button
          type="button"
          className="masthead-menu-trigger"
          aria-label="Open navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            color: T.accent,
            padding: '8px 12px',
            fontFamily: fonts.body,
            fontSize: rem(11),
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight: 600,
            cursor: 'pointer',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Menu
          <span aria-hidden style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ width: 14, height: 1.5, background: T.accent, display: 'block' }} />
            <span style={{ width: 14, height: 1.5, background: T.accent, display: 'block' }} />
            <span style={{ width: 14, height: 1.5, background: T.accent, display: 'block' }} />
          </span>
        </button>
        {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} />}
      </div>
      <h1
        style={{
          fontFamily: fonts.display,
          // Floor low enough to read on iPhone widths (~32px on a 390px viewport
          // via 8vw); ceiling preserved at 64px for desktop drama.
          fontSize: `clamp(${rem(32)}, 8vw, ${rem(64)})`,
          fontWeight: 400,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          margin: '14px 0 14px',
          fontStyle: 'italic',
          // ch unit scales with the current font size, so the title wraps to
          // ~2-3 lines at any viewport rather than running off the right at
          // desktop sizes (where 64px italic on one line is ~1300px wide).
          maxWidth: '20ch',
        }}
      >
        How Americans actually live on what they earn.
      </h1>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: rem(18),
          color: T.inkSoft,
          maxWidth: 720,
          lineHeight: 1.5,
        }}
      >
        Plug in an income, a place, a family. See where the money goes — what's left for the future,
        the trip, the splurge — and the help a household at that income may already qualify for.
        Built on 2026 IRS brackets, state tax data, BLS price indices, and real rents.
      </div>
      <div
        style={{
          marginTop: 16,
          fontSize: rem(11),
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: T.inkMuted,
          fontWeight: 500,
        }}
      >
        Static site · No accounts · No personal data · Cookieless aggregate analytics ·{' '}
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            navigate('/privacy');
          }}
          style={{
            color: T.accent,
            textDecoration: 'none',
            fontWeight: 600,
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 1,
          }}
        >
          Details
        </a>
      </div>
    </div>
  );
}

/**
 * Full-screen mobile nav sheet. Triggered by the masthead's MENU button.
 * Editorial-styled (not app-shell): cream background, large display
 * Fraunces items, top-right close affordance. Keyboard-dismissible via
 * Escape (handled by the parent), backdrop tap also closes.
 */
function MenuSheet({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  // Focus management for the modal: capture the previously-focused element
  // when the sheet opens so we can restore focus on close, move initial
  // focus to the close button, and trap Tab inside the dialog so keyboard
  // users can't drift back to the page underneath while it's open.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    const onTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => {
      document.removeEventListener('keydown', onTab);
      previouslyFocused?.focus?.();
    };
  }, []);
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: T.bg,
        // Editorial framing: a thin top rule mirrors the masthead. The
        // backdrop is the page background color, not a translucent dim,
        // because the sheet covers the whole viewport — there's no
        // page underneath to imply.
        borderTop: `2px solid ${T.ink}`,
        padding: '20px 24px 32px',
        display: 'flex',
        flexDirection: 'column',
        animation: 'menu-sheet-in 180ms ease-out',
      }}
    >
      <style>{`
        @keyframes menu-sheet-in {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <span
          style={{
            fontSize: rem(11),
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: T.accent,
            fontWeight: 600,
          }}
        >
          The Budget Atlas
        </span>
        <button
          ref={closeBtnRef}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close menu"
          style={{
            background: 'transparent',
            border: 'none',
            color: T.ink,
            fontSize: rem(24),
            cursor: 'pointer',
            padding: '4px 8px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
      <nav
        aria-label="Primary"
        // Stop click propagation on the link list so taps on the items
        // commit navigation rather than bubbling to the dialog backdrop
        // and triggering its onClose first.
        onClick={(e) => e.stopPropagation()}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {NAV_ITEMS.map(([href, label, external]) =>
          external ? (
            <a
              key={href}
              href={href}
              style={{
                fontFamily: fonts.display,
                fontSize: rem(28),
                color: T.accent,
                textDecoration: 'none',
                fontStyle: 'italic',
                padding: '10px 0',
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              {label} <ExternalArrow />
            </a>
          ) : (
            <a
              key={href}
              href={href}
              onClick={(e) => {
                e.preventDefault();
                onClose();
                navigate(href);
              }}
              style={{
                fontFamily: fonts.display,
                fontSize: rem(28),
                color: T.accent,
                textDecoration: 'none',
                fontStyle: 'italic',
                padding: '10px 0',
              }}
            >
              {label}
            </a>
          ),
        )}
      </nav>
    </div>
  );
}
