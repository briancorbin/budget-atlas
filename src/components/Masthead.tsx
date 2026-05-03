import { theme as T, fonts } from '@/theme';
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
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: T.accent,
            fontWeight: 600,
          }}
        >
          The Budget Atlas · Vol. 2026
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 18,
            fontSize: 11,
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: T.inkMuted,
          }}
        >
          <span>An interactive examination</span>
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
        </div>
      </div>
      <h1
        style={{
          fontFamily: fonts.display,
          fontSize: 'clamp(40px, 5vw, 64px)',
          fontWeight: 400,
          letterSpacing: '-0.025em',
          lineHeight: 1.05,
          margin: '14px 0 14px',
          fontStyle: 'italic',
        }}
      >
        How Americans actually <br />
        live on what they earn.
      </h1>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 18,
          color: T.inkSoft,
          maxWidth: 720,
          lineHeight: 1.5,
        }}
      >
        Plug in an income, a place, a family. See where the money goes — what's left for the future,
        the trip, the splurge — and the help a household at that income may already qualify for.
        Built on 2026 IRS brackets, state tax data, BLS price indices, and real rents.
      </div>
    </div>
  );
}
