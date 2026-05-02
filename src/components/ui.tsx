import type { ReactNode } from 'react';
import type { TooltipProps } from 'recharts';
import type { Source } from '@/types';
import { theme as T, fonts } from '@/theme';
import { fmt } from '@/lib/format';

/**
 * Editorial citation pill. Renders a small uppercase "SRC" badge in the
 * accent color that opens the source URL in a new tab; the source label
 * appears in the native browser tooltip on hover. Visible enough to read
 * as a clickable affordance, restrained enough not to dominate text.
 *
 * Pass an array to attach multiple sources to a single value; each gets its
 * own pill.
 */
export function Cite({ source }: { source: Source | readonly Source[] }) {
  const sources = Array.isArray(source) ? source : [source as Source];
  return (
    <>
      {sources.map((s, i) => (
        <a
          key={i}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          title={s.date ? `${s.label} (${s.date})` : s.label}
          aria-label={`Source: ${s.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.62em',
            fontFamily: fonts.body,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: T.accent,
            padding: '3px 6px 2px',
            margin: '0 4px',
            border: `1px solid ${T.accent}`,
            borderRadius: 2,
            textDecoration: 'none',
            verticalAlign: 'middle',
            lineHeight: 1,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            position: 'relative',
            top: '-0.1em',
          }}
        >src ↗</a>
      ))}
    </>
  );
}

export function Stat({ label, value, sub, accent }: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div style={{ padding: '14px 16px', background: T.surface, border: `1px solid ${T.border}` }}>
      <div style={{
        fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: T.inkMuted, fontFamily: fonts.body, marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontFamily: fonts.mono, fontSize: 22, fontWeight: 500,
        color: accent || T.ink, lineHeight: 1,
      }}>{value}</div>
      {sub && (
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 6, fontFamily: fonts.body }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function SectionTitle({ children, kicker }: { children: ReactNode; kicker?: ReactNode }) {
  return (
    <div style={{ marginBottom: 16, marginTop: 8 }}>
      {kicker && (
        <div style={{
          fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
          color: T.accent, fontFamily: fonts.body, fontWeight: 600, marginBottom: 6,
        }}>{kicker}</div>
      )}
      <div style={{
        fontFamily: fonts.display, fontSize: 26, fontWeight: 500,
        color: T.ink, letterSpacing: '-0.01em',
      }}>{children}</div>
    </div>
  );
}

export function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || !payload.length) return null;
  // BarChart provides `label` (the X-axis value); PieChart doesn't, so fall
  // back to the payload entry's own name (the slice's category).
  const heading = label ?? payload[0]?.name;
  return (
    <div style={{
      background: T.surface, border: `1px solid ${T.border}`, padding: '8px 12px',
      fontFamily: fonts.body, fontSize: 13,
    }}>
      <div style={{ color: T.inkMuted, marginBottom: 2 }}>{heading}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontFamily: fonts.mono }}>
          {fmt(p.value as number)}/mo
        </div>
      ))}
    </div>
  );
}
