import { useRef, useState, useEffect, useMemo, type MutableRefObject } from 'react';
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

type Side = 'left' | 'right';
type HoverState = { side: Side; id: string };

// Highlight-tint helpers — derived from theme tokens so a token change
// propagates here automatically (vs. hard-coded RGBA literals).
const ACCENT_TINT = `${theme.accent}14`; // ~8% alpha (0x14 / 0xff ≈ 0.078)
const AI_ACCENT_TINT = `${theme.aiAccent}1f`; // ~12% alpha

export function CompareView({
  rawLevel,
  rightLevel,
  rightLabel,
}: {
  rawLevel: Level;
  rightLevel: Level;
  rightLabel: PolishLevel;
}) {
  // Track hover SOURCE explicitly. Section IDs can be stable across panes
  // (Post 0's 'bio' exists on both Raw and Full) — without the source
  // marker, hovering the right pane would be misclassified as "this is on
  // the left" and scroll-into-view would target the wrong pane.
  const [hovered, setHovered] = useState<HoverState | null>(null);
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

  // Set of Raw section IDs to highlight given the current hover source+id.
  const highlightedRawIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    if (hovered.side === 'left') return new Set([hovered.id]);
    // hovered on the right — highlight the right section's mapsFrom on the left
    const right = rightLevel.editorial.find((s) => s.id === hovered.id);
    return new Set(right?.mapsFrom ?? []);
  }, [hovered, rightLevel]);

  // Set of right-pane section IDs to highlight.
  const highlightedRightIds = useMemo(() => {
    if (!hovered) return new Set<string>();
    if (hovered.side === 'right') return new Set([hovered.id]);
    // hovered on the left — light up every right section that maps from it
    return new Set(rawIdToRightIds.get(hovered.id) ?? []);
  }, [hovered, rawIdToRightIds]);

  // Scroll-into-view sync: when hover changes, bring the corresponding
  // section on the OTHER pane into view. Smooth scroll within each
  // pane's scroll container.
  useEffect(() => {
    if (!hovered) return;
    const targetIds = hovered.side === 'left' ? highlightedRightIds : highlightedRawIds;
    const targetRefs = hovered.side === 'left' ? rightRefs : leftRefs;
    for (const id of targetIds) {
      const el = targetRefs.current.get(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        break;
      }
    }
  }, [hovered, highlightedRawIds, highlightedRightIds]);

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
        side="left"
        sections={rawLevel.editorial}
        highlighted={highlightedRawIds}
        refs={leftRefs}
        onHover={setHovered}
      />
      <Pane
        label={POLISH_LEVEL_LABELS[rightLabel]}
        side="right"
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
  side,
  sections,
  highlighted,
  refs,
  onHover,
}: {
  label: string;
  side: Side;
  sections: Section[];
  highlighted: Set<string>;
  refs: MutableRefObject<Map<string, HTMLDivElement | null>>;
  onHover: (s: HoverState | null) => void;
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
          side={side}
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
  side,
  highlighted,
  registerRef,
  onHover,
}: {
  section: Section;
  side: Side;
  highlighted: boolean;
  registerRef: (el: HTMLDivElement | null) => void;
  onHover: (s: HoverState | null) => void;
}) {
  const isAi = section.aiAdded === true;
  return (
    <div
      ref={registerRef}
      onMouseEnter={() => onHover({ side, id: section.id })}
      onMouseLeave={() => onHover(null)}
      style={{
        padding: '8px 12px',
        margin: '4px -12px',
        borderRadius: 3,
        borderLeft: isAi ? `3px solid ${theme.aiAccent}` : '3px solid transparent',
        background: highlighted
          ? isAi
            ? AI_ACCENT_TINT
            : ACCENT_TINT
          : 'transparent',
        transition: 'background 120ms ease',
        cursor: 'default',
      }}
    >
      {section.content}
    </div>
  );
}
