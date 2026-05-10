import { theme as T, fonts, rem } from '@/theme';
import { navigate } from '@/lib/nav';
import { marginaliaUrl } from '@/lib/cross-site';

const navLinkStyle = {
  color: T.accent,
  textDecoration: 'none',
  fontWeight: 600,
  borderBottom: `1px solid ${T.border}`,
  paddingBottom: 1,
} as const;

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

/**
 * Page footer — masthead-style sign-off with full nav. Repeats the
 * primary nav from the top of the page so a reader who scrolled all
 * the way down has a way to navigate without scrolling back up. On
 * mobile the inline top-of-page nav is replaced with a menu trigger,
 * and the footer carries the always-visible link list as the
 * "everything-at-a-glance" surface.
 */
export function Footer() {
  return (
    <footer
      style={{
        marginTop: 80,
        paddingTop: 28,
        paddingBottom: 8,
        borderTop: `2px solid ${T.ink}`,
        fontFamily: fonts.body,
      }}
    >
      <div
        style={{
          fontSize: rem(11),
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 600,
          marginBottom: 14,
        }}
      >
        The Budget Atlas <span style={{ whiteSpace: 'nowrap' }}>· Vol.&nbsp;2026</span>
      </div>
      <nav
        aria-label="Primary"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 18,
          fontSize: rem(11),
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 18,
        }}
      >
        {/* "← The Atlas" appears only on secondary pages — on the atlas
            itself (path "/") it'd be self-referential. Top of the list
            because it's the most likely "back to start" affordance. */}
        {typeof window !== 'undefined' && window.location.pathname !== '/' && (
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            style={navLinkStyle}
          >
            ← The Atlas
          </a>
        )}
        {(
          [
            ['/about', 'About'],
            ['/sources', 'Sources'],
            ['/roadmap', 'Roadmap'],
            ['/privacy', 'Privacy'],
            ['/terms', 'Terms'],
          ] as const
        ).map(([href, label]) => (
          <a
            key={href}
            href={href}
            onClick={(e) => {
              e.preventDefault();
              navigate(href);
            }}
            style={navLinkStyle}
          >
            {label}
          </a>
        ))}
        <a href={marginaliaUrl()} style={navLinkStyle}>
          Marginalia <ExternalArrow />
        </a>
      </nav>
      <div
        style={{
          fontSize: rem(11),
          color: T.inkMuted,
          letterSpacing: '0.05em',
          lineHeight: 1.6,
        }}
      >
        Static site · No accounts · No personal data · Cookieless aggregate analytics.
      </div>
    </footer>
  );
}
