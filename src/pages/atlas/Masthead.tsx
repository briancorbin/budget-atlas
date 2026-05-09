import { theme as T, fonts, rem } from '@/theme';
import { navigate } from '@/lib/nav';

export function Masthead() {
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
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
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
            The Budget Atlas · Vol. 2026
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
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 18,
            fontSize: rem(11),
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: T.inkMuted,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              navigate('/about');
            }}
            style={{
              color: T.accent,
              textDecoration: 'none',
              fontWeight: 600,
              borderBottom: `1px solid ${T.border}`,
              paddingBottom: 1,
            }}
          >
            About →
          </a>
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
              paddingBottom: 1,
            }}
          >
            Sources →
          </a>
          <a
            href="/roadmap"
            onClick={(e) => {
              e.preventDefault();
              navigate('/roadmap');
            }}
            style={{
              color: T.accent,
              textDecoration: 'none',
              fontWeight: 600,
              borderBottom: `1px solid ${T.border}`,
              paddingBottom: 1,
            }}
          >
            Roadmap →
          </a>
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
            Privacy →
          </a>
          {/* Marginalia is a sister publication at a different subdomain
              (not an Atlas route). The ↗ glyph signals "leaves this site"
              vs. → for in-app routes; same red styling because it's the
              same publication brand. */}
          <a
            href="https://marginalia.thebudgetatlas.com"
            style={{
              color: T.accent,
              textDecoration: 'none',
              fontWeight: 600,
              borderBottom: `1px solid ${T.border}`,
              paddingBottom: 1,
            }}
          >
            Marginalia ↗
          </a>
        </nav>
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
