import { useEffect, useRef, useState } from 'react';
import { theme as T, fonts } from '@/theme';
import { ROADMAP, SHIPPED, type RoadmapItem, type RoadmapStatus } from '@/data/roadmap';
import { SectionTitle } from './ui';

export function Roadmap({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.ink,
        fontFamily: fonts.body,
        padding: '40px 24px 80px',
        backgroundImage: `radial-gradient(circle at 20% 0%, rgba(166, 38, 28, 0.04), transparent 50%),
         radial-gradient(circle at 80% 100%, rgba(45, 80, 22, 0.03), transparent 50%)`,
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Header onBack={onBack} />
        <Intro />
        <PlannedList />
        <ShippedList />
        <Footer onBack={onBack} />
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderTop: `2px solid ${T.ink}`,
        paddingTop: 16,
        marginBottom: 32,
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 600,
        }}
      >
        The Budget Atlas · Vol. 2026 · Roadmap
      </div>
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.inkSoft,
          textDecoration: 'none',
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: 2,
        }}
      >
        ← Back to the atlas
      </a>
    </div>
  );
}

function Intro() {
  return (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 'clamp(28px, 7vw, 44px)',
          fontWeight: 500,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          marginBottom: 16,
        }}
      >
        What's coming
      </div>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.55,
          color: T.inkSoft,
          maxWidth: 640,
          margin: 0,
        }}
      >
        The model is a snapshot of how Americans live on what they earn — but it has gaps. These are
        the next things on the build list, in no particular order. Some are accuracy improvements
        (modeling 401(k) contributions, per-child childcare costs, Married Filing Separately). Some
        are new modeling territory (time as a household resource, untaxed cash income, a
        job-by-metro wage comparison). Some are plumbing (open-ended location selection, shareable
        scenario links).
      </p>
    </div>
  );
}

function PlannedList() {
  // Items with status='shipped' relocate to the horizontal-scroll strip
  // below; only planned/in-progress items render in the main vertical list.
  // In-progress items float to the top so the active work is what you see first.
  const items = ROADMAP.filter((i) => i.status !== 'shipped')
    .slice()
    .sort((a, b) => {
      if (a.status === b.status) return 0;
      return a.status === 'in-progress' ? -1 : 1;
    });
  const inProgress = ROADMAP.filter((i) => i.status === 'in-progress').length;
  const planned = ROADMAP.filter((i) => i.status === 'planned').length;
  const shippedFromRoadmap = ROADMAP.filter((i) => i.status === 'shipped').length;
  const parts: string[] = [];
  if (inProgress > 0) parts.push(`${inProgress} in progress`);
  parts.push(`${planned} planned`);
  if (shippedFromRoadmap > 0) parts.push(`${shippedFromRoadmap} shipped (below)`);
  const kicker = parts.join(' · ');

  return (
    <div style={{ marginBottom: 56 }}>
      <SectionTitle kicker={kicker}>On the build list</SectionTitle>
      <div style={{ display: 'grid', gap: 16 }}>
        {items.map((item) => (
          <PlannedCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function PlannedCard({ item }: { item: RoadmapItem }) {
  return (
    <div
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        padding: '20px 24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 16,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontFamily: fonts.display,
            fontSize: 22,
            fontWeight: 500,
            color: T.ink,
            letterSpacing: '-0.005em',
          }}
        >
          {item.title}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <CategoryTag category={item.category} />
          <StatusBadge status={item.status} />
        </div>
      </div>
      <p
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: T.inkSoft,
          margin: 0,
        }}
      >
        {item.summary}
      </p>
      {item.status === 'in-progress' && <ProgressStrip item={item} />}
    </div>
  );
}

function ProgressStrip({ item }: { item: RoadmapItem }) {
  // Only renders for in-progress items. Shows a thin filled bar plus a
  // mono caption with the started-at date and rough % complete. Both fields
  // are optional; we render whatever's provided.
  const pct = typeof item.progress === 'number' ? Math.max(0, Math.min(100, item.progress)) : null;
  const captionParts: string[] = [];
  if (item.startedAt) captionParts.push(`Started ${item.startedAt}`);
  if (pct !== null) captionParts.push(`${pct}% complete`);
  if (captionParts.length === 0 && pct === null) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {pct !== null && (
        <div
          style={{
            height: 3,
            width: '100%',
            background: T.border,
            marginBottom: 6,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: `${pct}%`,
              background: T.warning,
              transition: 'width 0.3s',
            }}
          />
        </div>
      )}
      {captionParts.length > 0 && (
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: T.inkMuted,
            letterSpacing: '0.04em',
          }}
        >
          {captionParts.join(' · ')}
        </div>
      )}
    </div>
  );
}

function CategoryTag({ category }: { category: string }) {
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: T.inkMuted,
        fontFamily: fonts.body,
        fontWeight: 600,
        padding: '3px 8px',
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        whiteSpace: 'nowrap',
      }}
    >
      {category}
    </span>
  );
}

function StatusBadge({ status }: { status: RoadmapStatus }) {
  const styles: Record<RoadmapStatus, { color: string; bg: string; label: string }> = {
    planned: { color: T.inkMuted, bg: T.bg, label: 'Planned' },
    'in-progress': { color: T.warning, bg: T.bg, label: 'In progress' },
    shipped: { color: T.bg, bg: T.positive, label: '✓ Shipped' },
  };
  const s = styles[status];
  return (
    <span
      style={{
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: s.color,
        background: s.bg,
        fontFamily: fonts.body,
        fontWeight: 700,
        padding: '3px 8px',
        borderRadius: 2,
        border: `1px solid ${status === 'shipped' ? T.positive : T.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  );
}

function ShippedList() {
  // Merge roadmap items that have shipped (from ROADMAP) with the historical
  // pre-roadmap milestones (from SHIPPED). Both render the same way.
  // Newest first so the most recent ship is visible without scrolling.
  const shippedRoadmap = ROADMAP.filter((i) => i.status === 'shipped').map((i) => ({
    title: i.title,
    summary: i.summary,
    shippedAt: i.shippedAt ?? '',
  }));
  const all = [...shippedRoadmap, ...SHIPPED].sort((a, b) =>
    (b.shippedAt ?? '').localeCompare(a.shippedAt ?? ''),
  );

  const stripRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: true });

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const update = () => {
      const left = el.scrollLeft > 1;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
      setEdges({ left, right });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  // Build a mask that only fades the side(s) the user can still scroll toward.
  // No fade at all when the strip fits / hasn't been scrolled.
  const stops: string[] = [];
  if (edges.left) stops.push('transparent 0%', 'black 8%');
  else stops.push('black 0%');
  if (edges.right) stops.push('black 92%', 'transparent 100%');
  else stops.push('black 100%');
  const mask = `linear-gradient(to right, ${stops.join(', ')})`;

  const kickerSuffix = edges.right || edges.left ? ' · scroll →' : '';

  return (
    <div style={{ marginBottom: 48 }}>
      <SectionTitle kicker={`Shipped · ${all.length} milestones${kickerSuffix}`}>
        Already in the model
      </SectionTitle>
      <div
        ref={stripRef}
        style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 12,
          scrollSnapType: 'x mandatory',
          maskImage: mask,
          WebkitMaskImage: mask,
          transition: 'mask-image 0.2s, -webkit-mask-image 0.2s',
        }}
      >
        {all.map((item, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0,
              width: 300,
              scrollSnapAlign: 'start',
              background: T.surface,
              border: `1px solid ${T.border}`,
              padding: '16px 20px',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: 16,
                fontWeight: 500,
                marginBottom: 8,
                paddingRight: 70,
                lineHeight: 1.25,
              }}
            >
              {item.title}
            </div>
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: T.bg,
                  background: T.positive,
                  fontFamily: fonts.body,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 2,
                }}
              >
                ✓ Shipped
              </span>
              {item.shippedAt && (
                <span
                  style={{
                    fontSize: 10,
                    color: T.inkMuted,
                    fontFamily: fonts.mono,
                    letterSpacing: '0.04em',
                  }}
                >
                  {item.shippedAt}
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 12.5,
                lineHeight: 1.55,
                color: T.inkSoft,
                margin: 0,
              }}
            >
              {item.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Footer({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        borderTop: `2px solid ${T.ink}`,
        paddingTop: 24,
        marginTop: 48,
        textAlign: 'center',
      }}
    >
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          padding: '10px 18px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          color: T.ink,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        ← Back to the atlas
      </a>
      <div
        style={{
          marginTop: 24,
          fontSize: 11,
          color: T.inkMuted,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontFamily: fonts.body,
        }}
      >
        Have an idea worth adding? Open an issue on{' '}
        <a
          href="https://github.com/TheBudgetAtlas/thebudgetatlas/issues"
          target="_blank"
          rel="noreferrer"
          style={{
            color: T.accent,
            textDecoration: 'none',
            fontWeight: 600,
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 1,
          }}
        >
          the repo
        </a>
        .
      </div>
    </div>
  );
}
