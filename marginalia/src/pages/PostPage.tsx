import { useState } from 'react';
import { theme, fonts, rem } from '../theme';
import type { Post } from '../types';
import { PostToggle, type PostView } from '../components/PostToggle';
import { Prose } from '../components/Prose';
import { Link } from '../components/Link';
import { TimeLogStrip } from '../components/TimeLogStrip';

export function PostPage({ post }: { post: Post }) {
  const [view, setView] = useState<PostView>('edited');

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
            display: 'flex',
            justifyContent: 'flex-start',
            marginBottom: 28,
            paddingTop: 12,
            paddingBottom: 16,
            borderTop: `1px solid ${theme.border}`,
            borderBottom: `1px solid ${theme.border}`,
            gap: 14,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <PostToggle view={view} onChange={setView} />
          <span
            style={{
              fontFamily: fonts.mono,
              fontSize: rem(11),
              color: theme.inkMuted,
              maxWidth: 420,
            }}
          >
            {view === 'edited'
              ? 'Editorial draft, copy-edited collaboratively with AI.'
              : 'Immutable transcript — Brian’s words plus any Claude prompts that preceded them.'}
          </span>
        </div>

        <Prose>
          {view === 'edited' ? (
            <>
              {post.editorial()}
              {post.fieldNotes && (
                <>
                  <hr />
                  <h2 style={{ marginTop: 0 }}>Field Notes</h2>
                  {post.fieldNotes()}
                </>
              )}
            </>
          ) : (
            post.raw()
          )}
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
