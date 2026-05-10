import { theme, fonts, rem } from '../theme';
import { atlasUrl } from '../lib/cross-site';

export function Footer() {
  return (
    <footer
      style={{
        borderTop: `1px solid ${theme.border}`,
        background: theme.bgAlt,
        padding: '28px 24px',
        marginTop: 80,
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          fontFamily: fonts.mono,
          fontSize: rem(11),
          letterSpacing: '0.06em',
          color: theme.inkMuted,
          display: 'flex',
          gap: 18,
          flexWrap: 'wrap',
          justifyContent: 'space-between',
        }}
      >
        <span>
          Marginalia is a companion publication to{' '}
          <a href={atlasUrl()}>The Budget Atlas</a>.
        </span>
        <span style={{ display: 'flex', gap: 18 }}>
          <a href="/rss.xml">RSS</a>
          <a href="https://github.com/TheBudgetAtlas/thebudgetatlas">Source</a>
        </span>
      </div>
    </footer>
  );
}
