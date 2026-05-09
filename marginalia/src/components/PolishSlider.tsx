import { theme, fonts, rem } from '../theme';
import {
  POLISH_LEVELS,
  POLISH_LEVEL_LABELS,
  POLISH_LEVEL_DESCRIPTIONS,
  type PolishLevel,
} from '../types';

/**
 * The Polish slider — Marginalia's load-bearing transparency device.
 * A native range input snapped to five positions, with tick labels
 * above and a one-line description of the current level below. The
 * whole post body re-renders when the slider moves — readers see how
 * the post transforms from raw substrate to published essay.
 *
 * Native <input type="range"> for keyboard / screen-reader / touch
 * support; the visible track + thumb get a custom skin via accentColor.
 */
export function PolishSlider({
  value,
  onChange,
}: {
  value: PolishLevel;
  onChange: (next: PolishLevel) => void;
}) {
  const idx = POLISH_LEVELS.indexOf(value);
  return (
    <div
      style={{
        border: `1px solid ${theme.border}`,
        background: theme.surface,
        padding: '14px 18px 16px',
        borderRadius: 4,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 4,
          fontFamily: fonts.mono,
          fontSize: rem(10),
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: theme.inkMuted,
        }}
      >
        {POLISH_LEVELS.map((lv) => (
          <span
            key={lv}
            onClick={() => onChange(lv)}
            style={{
              cursor: 'pointer',
              color: lv === value ? theme.ink : theme.inkMuted,
              fontWeight: lv === value ? 600 : 400,
              padding: '0 4px',
            }}
          >
            {POLISH_LEVEL_LABELS[lv]}
          </span>
        ))}
      </div>
      <input
        type="range"
        min={0}
        max={POLISH_LEVELS.length - 1}
        step={1}
        value={idx}
        onChange={(e) => onChange(POLISH_LEVELS[parseInt(e.target.value, 10)])}
        aria-label="Polish level"
        aria-valuetext={POLISH_LEVEL_LABELS[value]}
        style={{
          width: '100%',
          margin: 0,
          padding: 0,
          accentColor: theme.accent,
          cursor: 'pointer',
        }}
      />
      <div
        style={{
          marginTop: 6,
          fontFamily: fonts.mono,
          fontSize: rem(11),
          color: theme.inkSoft,
          minHeight: 18,
        }}
      >
        <span style={{ color: theme.accent, fontWeight: 600, marginRight: 8 }}>
          {POLISH_LEVEL_LABELS[value]}.
        </span>
        {POLISH_LEVEL_DESCRIPTIONS[value]}
      </div>
    </div>
  );
}
