import { Fragment, useEffect, useState } from 'react';
import { theme, fonts, rem } from '../theme';
import type { Post, PolishLevel } from '../types';
import { PolishSlider } from '../components/PolishSlider';
import { CompareView } from '../components/CompareView';
import { Prose } from '../components/Prose';
import { Link } from '../components/Link';
import { TimeLogStrip } from '../components/TimeLogStrip';

// Default landing position. Medium gives readers a friendly read while
// signaling that other levels exist on either side.
const DEFAULT_LEVEL: PolishLevel = 'medium';

// Compare view is desktop-only for v0 — side-by-side panes don't fit on
// phones. Threshold matches a comfortable two-column layout.
const COMPARE_MIN_WIDTH = 900;

function useIsWide() {
  const [wide, setWide] = useState(
    typeof window === 'undefined' ? true : window.innerWidth >= COMPARE_MIN_WIDTH,
  );
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= COMPARE_MIN_WIDTH);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return wide;
}

export function PostPage({ post }: { post: Post }) {
  const [level, setLevel] = useState<PolishLevel>(DEFAULT_LEVEL);
  const [compareOn, setCompareOn] = useState(false);
  const isWide = useIsWide();

  const currentLevel = post.levels[level];
  // Compare is only meaningful when there's a non-Raw level on the right.
  const compareDisabled = level === 'raw';
  // Hide the compare toggle entirely on narrow viewports.
  const showCompareToggle = isWide;
  const inCompare = compareOn && !compareDisabled && isWide;

  return (
    <article style={{ padding: '32px 24px 60px' }}>
      <div
        style={{
          // Compare view needs more horizontal room than the single-pane
          // reading column. Bump the max width when active.
          maxWidth: inCompare ? 1200 : 720,
          margin: '0 auto',
          transition: 'max-width 200ms ease',
        }}
      >
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
            display: 'flex',
            gap: 16,
            alignItems: 'stretch',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 280 }}>
            <PolishSlider value={level} onChange={setLevel} />
          </div>
          {showCompareToggle && (
            <CompareToggle
              on={compareOn}
              disabled={compareDisabled}
              onChange={setCompareOn}
            />
          )}
        </div>

        {inCompare ? (
          <Prose>
            <CompareView
              rawLevel={post.levels.raw}
              rightLevel={currentLevel}
              rightLabel={level}
            />
          </Prose>
        ) : (
          <Prose>
            {currentLevel.editorial.map((s) => (
              <Fragment key={s.id}>{s.content}</Fragment>
            ))}
            {currentLevel.fieldNotes && (
              <>
                <hr />
                <h2 style={{ marginTop: 0 }}>
                  {level === 'raw' ? 'From the journal' : 'Field Notes'}
                </h2>
                {currentLevel.fieldNotes()}
              </>
            )}
          </Prose>
        )}

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

function CompareToggle({
  on,
  disabled,
  onChange,
}: {
  on: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}) {
  const title = disabled
    ? 'Compare with Raw is disabled — slider is already at Raw.'
    : on
      ? 'Hide side-by-side compare with Raw.'
      : 'Show side-by-side compare with Raw.';
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-disabled={disabled}
      title={title}
      onClick={() => !disabled && onChange(!on)}
      style={{
        appearance: 'none',
        border: `1px solid ${theme.border}`,
        borderRadius: 4,
        padding: '0 16px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        background: on && !disabled ? theme.ink : theme.surface,
        color: disabled ? theme.inkMuted : on ? theme.bg : theme.inkSoft,
        fontFamily: fonts.mono,
        fontSize: rem(11),
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        opacity: disabled ? 0.55 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      Compare with Raw
    </button>
  );
}
