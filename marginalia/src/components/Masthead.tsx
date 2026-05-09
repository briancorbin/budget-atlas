import { theme, fonts, rem } from '../theme';
import { Link } from './Link';

/**
 * Marginalia's editorial header. Mirrors the Atlas's masthead voice
 * (ALL-CAPS subtitle, serif title, deep red accent rule) but with its
 * own identity — the Atlas's masthead is dated by tax-year volume; this
 * one is dated by week.
 */
export function Masthead() {
  return (
    <header
      style={{
        borderBottom: `1px solid ${theme.border}`,
        background: theme.bg,
        padding: '28px 24px 20px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: rem(11),
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: theme.inkMuted,
            marginBottom: 8,
          }}
        >
          Notes from the margins of an AI-built project
        </div>
        <Link
          to="/"
          style={{
            color: theme.ink,
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 500,
              fontSize: 'clamp(36px, 8vw, 64px)',
              lineHeight: 1.0,
              margin: 0,
              fontVariationSettings: '"opsz" 144, "SOFT" 100',
            }}
          >
            Marginalia
          </h1>
        </Link>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginTop: 14,
            paddingTop: 10,
            borderTop: `2px solid ${theme.accent}`,
            fontFamily: fonts.mono,
            fontSize: rem(11),
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: theme.inkSoft,
          }}
        >
          <span>By Brian Corbin</span>
          <a
            href="https://thebudgetatlas.com"
            style={{ color: theme.inkSoft }}
          >
            thebudgetatlas.com →
          </a>
        </div>
      </div>
    </header>
  );
}
