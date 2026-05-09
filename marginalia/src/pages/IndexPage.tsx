import { theme, fonts, rem } from '../theme';
import { posts } from '../posts';
import { Link } from '../components/Link';
import { TimeLogStrip } from '../components/TimeLogStrip';

export function IndexPage() {
  return (
    <>
      <section
        style={{
          padding: '32px 24px 8px',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <p
            style={{
              fontSize: rem(18),
              lineHeight: 1.55,
              color: theme.inkSoft,
              margin: 0,
              maxWidth: 640,
            }}
          >
            <em>Marginalia</em> is a weekly journal about working with AI on
            a real, ambitious solo project — what worked, where I faltered,
            the good, the bad, the weird, the ugly. Every post has a{' '}
            <strong>Raw</strong> / <strong>Edited</strong> toggle at the top.
            The Edited version is what I'd hand to a friend. The Raw version
            is what I'd hand to a tape recorder. Both are mine. The middle
            is where AI lives.
          </p>
          <TimeLogStrip />
        </div>
      </section>
      <section
        style={{
          padding: '24px 24px 60px',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              borderTop: `1px solid ${theme.border}`,
            }}
          >
            {posts.map((p) => (
              <li
                key={p.slug}
                style={{
                  borderBottom: `1px solid ${theme.border}`,
                  padding: '20px 0',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: rem(11),
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: theme.inkMuted,
                      minWidth: 70,
                    }}
                  >
                    {p.number}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.mono,
                      fontSize: rem(11),
                      color: theme.inkMuted,
                    }}
                  >
                    {p.date}
                  </span>
                </div>
                <Link
                  to={`/posts/${p.slug}`}
                  style={{
                    color: theme.ink,
                    textDecoration: 'none',
                  }}
                >
                  <h2
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 500,
                      fontSize: rem(30),
                      margin: '6px 0 8px',
                      lineHeight: 1.15,
                    }}
                  >
                    {p.title}
                  </h2>
                </Link>
                <p
                  style={{
                    fontSize: rem(16),
                    color: theme.inkSoft,
                    margin: 0,
                    lineHeight: 1.55,
                  }}
                >
                  {p.dek}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
