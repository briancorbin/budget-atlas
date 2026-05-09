import { useState } from 'react';
import { theme, fonts, rem } from '../theme';
import type { Post, PolishLevel } from '../types';
import { PolishSlider } from '../components/PolishSlider';
import { Prose } from '../components/Prose';
import { Link } from '../components/Link';
import { TimeLogStrip } from '../components/TimeLogStrip';

// Default landing position. Medium gives readers a friendly read while
// signaling that other levels exist on either side.
const DEFAULT_LEVEL: PolishLevel = 'medium';

export function PostPage({ post }: { post: Post }) {
  const [level, setLevel] = useState<PolishLevel>(DEFAULT_LEVEL);
  const Body = post.levels[level];

  return (
    <article style={{ padding: '32px 24px 60px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <Link
          to="/"
          style={{
            fontFamily: fonts.mono,
            fontSize: rem(11),
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: theme.inkMuted,
            textDecoration: 'none',
          }}
        >
          ← All posts
        </Link>
        <header style={{ marginTop: 14, marginBottom: 24 }}>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: rem(11),
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: theme.inkMuted,
              display: 'flex',
              gap: 14,
            }}
          >
            <span>{post.number}</span>
            <span>{post.date}</span>
          </div>
          <h1
            style={{
              fontFamily: fonts.display,
              fontWeight: 500,
              fontSize: 'clamp(34px, 6vw, 48px)',
              lineHeight: 1.1,
              margin: '8px 0 12px',
              fontVariationSettings: '"opsz" 144, "SOFT" 100',
            }}
          >
            {post.title}
          </h1>
          <p
            style={{
              fontSize: rem(18),
              color: theme.inkSoft,
              margin: 0,
              fontStyle: 'italic',
            }}
          >
            {post.dek}
          </p>
        </header>

        <div
          style={{
            marginBottom: 28,
            paddingTop: 12,
            paddingBottom: 16,
            borderTop: `1px solid ${theme.border}`,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <PolishSlider value={level} onChange={setLevel} />
        </div>

        <Prose>
          <Body />
        </Prose>

        {post.coversFrom && (
          <TimeLogStrip
            range={{
              from: post.coversFrom,
              to: post.coversTo ?? post.date,
              label: `This post · ${post.coversFrom} → ${post.coversTo ?? post.date}`,
            }}
          />
        )}
      </div>
    </article>
  );
}
