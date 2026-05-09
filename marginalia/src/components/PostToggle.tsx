import { theme, fonts, rem } from '../theme';

export type PostView = 'edited' | 'raw';

/**
 * The Raw / Edited toggle — Marginalia's load-bearing transparency device.
 * Appears at the top of every post. The Edited view is what Brian would
 * hand a friend; the Raw view is what he'd hand a tape recorder, including
 * verbatim Claude prompts that preceded any answer.
 *
 * Raw is immutable after publish — that immutability is what makes the
 * "the substance is mine, the shape is collaborative" claim verifiable
 * rather than a disclaimer.
 */
export function PostToggle({
  view,
  onChange,
}: {
  view: PostView;
  onChange: (next: PostView) => void;
}) {
  // Segmented control semantics rather than the WAI-ARIA tablist pattern:
  // tablist requires roving tabindex + arrow-key navigation + aria-controls
  // wiring to be conformant. For a two-state visibility toggle, plain
  // <button aria-pressed> gives screen readers and keyboard users
  // consistent behavior with much less surface area.
  return (
    <div
      role="group"
      aria-label="Post view"
      style={{
        display: 'inline-flex',
        border: `1px solid ${theme.border}`,
        borderRadius: 999,
        overflow: 'hidden',
        background: theme.surface,
        fontFamily: fonts.mono,
        fontSize: rem(12),
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}
    >
      <Tab active={view === 'edited'} onClick={() => onChange('edited')}>
        Edited
      </Tab>
      <Tab active={view === 'raw'} onClick={() => onChange('raw')}>
        Raw
      </Tab>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={{
        appearance: 'none',
        border: 0,
        padding: '8px 18px',
        cursor: 'pointer',
        background: active ? theme.ink : 'transparent',
        color: active ? theme.bg : theme.inkSoft,
        font: 'inherit',
        letterSpacing: 'inherit',
        textTransform: 'inherit',
      }}
    >
      {children}
    </button>
  );
}
