import { useRef, useState, useEffect, useMemo } from 'react';
import { theme, fonts, rem } from '../theme';
import {
  POLISH_LEVEL_LABELS,
  type Level,
  type PolishLevel,
  type Section,
} from '../types';

/**
 * Side-by-side comparison view: Raw on the left, the slider's selected
 * polish level on the right. Hovering a section on either pane
 * highlights its counterpart on the other pane (via Section.mapsFrom)
 * and scrolls that counterpart into view. Sections with no Raw source
 * (Section.aiAdded === true) get a slate-blue accent so readers can
 * see what's invented vs. transformed.
 *
 * Mobile: this component is hidden by the parent (PostPage) on narrow
 * viewports. No stacked fallback for v0 — desktop-only.
 */
export function CompareView({
  rawLevel,
  rightLevel,
  rightLabel,
}: {
  rawLevel: Level;
  rightLevel: Level;
  rightLabel: PolishLevel;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const leftRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const rightRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  // For each Raw section ID, which right-pane section IDs map back to it?
  // (Right-pane sections declare mapsFrom: [rawId, ...]; invert that here.)
  const rawIdToRightIds = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const s of rightLevel.editorial) {
      for (const r of s.mapsFrom ?? []) {
        const cur = m.get(r) ?? [];
        cur.push(s.id);
        m.set(r, cur);
      }
    }
    return m;
  }, [rightLevel]);

  // Set of Raw section IDs that the currently-hovered section corresponds to.
  // - If hovering a Raw section, it's just that ID.
  // - If hovering a right-pane section, it's that section's mapsFrom.
  const highlightedRawIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    const isRaw = rawLevel.editorial.some((s) => s.id === hovered);
    if (isRaw) return new Set([hovered]);
    const right = rightLevel.editorial.find((s) => s.id === hovered);
    return new Set(right?.mapsFrom ?? []);
  }, [hovered, rawLevel, rightLevel]);

  // Set of right-pane section IDs that should highlight.
  const highlightedRightIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    const isRight = rightLevel.editorial.some((s) => s.id === hovered);
    if (isRight) return new Set([hovered]);
    // hovering a Raw section: light up every right section that maps from it
    return new Set(rawIdToRightIds.get(hovered) ?? []);
  }, [hovered, rawIdToRightIds, rightLevel]);

  // Scroll-into-view sync: when hover changes, bring the corresponding
  // section on the OTHER pane into view. Smooth scroll within each
  // pane's scroll container.
  useEffect(() => {
    if (!hovered) return;
    const isRaw = rawLevel.editorial.some((s) => s.id === hovered);
    const targets: HTMLDivElement[] = [];
    if (isRaw) {
      for (const id of highlightedRightIds) {
        const el = rightRefs.current.get(id);
        if (el) targets.push(el);
      }
    } else {
      for (const id of highlightedRawIds) {
        const el = leftRefs.current.get(id);
        if (el) targets.push(el);
      }
    }
    if (targets[0]) {
      targets[0].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [hovered, highlightedRawIds, highlightedRightIds, rawLevel]);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginTop: 8,
      }}
    >
      <Pane
        label={POLISH_LEVEL_LABELS.raw}
        sections={rawLevel.editorial}
        highlighted={highlightedRawIds}
        refs={leftRefs}
        onHover={setHovered}
      />
      <Pane
        label={POLISH_LEVEL_LABELS[rightLabel]}
        sections={rightLevel.editorial}
        highlighted={highlightedRightIds}
        refs={rightRefs}
        onHover={setHovered}
      />
    </div>
  );
}

function Pane({
  label,
  sections,
  highlighted,
  refs,
  onHover,
}: {
  label: string;
  sections: Section[];
  highlighted: Set<string>;
  refs: React.MutableRefObject<Map<string, HTMLDivElement | null>>;
  onHover: (id: string | null) => void;
}) {
  return (
    <div
      style={{
        maxHeight: '70vh',
        overflowY: 'auto',
        paddingRight: 8,
      }}
    >
      <div
        style={{
          fontFamily: fonts.mono,
          fontSize: rem(10),
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: theme.inkMuted,
          marginBottom: 12,
          position: 'sticky',
          top: 0,
          background: theme.bg,
          paddingTop: 4,
          paddingBottom: 6,
          zIndex: 1,
        }}
      >
        {label}
      </div>
      {sections.map((s) => (
        <SectionBlock
          key={s.id}
          section={s}
          highlighted={highlighted.has(s.id)}
          registerRef={(el) => refs.current.set(s.id, el)}
          onHover={onHover}
        />
      ))}
    </div>
  );
}

function SectionBlock({
  section,
  highlighted,
  registerRef,
  onHover,
}: {
  section: Section;
  highlighted: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onHover: (id: string | null) => void;
}) {
  const isAi = section.aiAdded === true;
  return (
    <div
      ref={registerRef}
      onMouseEnter={() => onHover(section.id)}
      onMouseLeave={() => onHover(null)}
      style={{
        padding: '8px 12px',
        margin: '4px -12px',
        borderRadius: 3,
        borderLeft: isAi ? `3px solid ${theme.aiAccent}` : '3px solid transparent',
        background: highlighted
          ? isAi
            ? 'rgba(62, 90, 122, 0.12)'
            : 'rgba(166, 38, 28, 0.08)'
          : 'transparent',
        transition: 'background 120ms ease',
        cursor: 'default',
      }}
    >
      {section.content}
    </div>
  );
}
