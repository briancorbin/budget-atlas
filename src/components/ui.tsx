import { useEffect, useRef, useState, type ReactNode } from 'react';
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
/**
 * Single-pill consolidated citation. Renders "SRC ↗ (N)" — click to open a
 * floating list of the underlying sources. Compact inline; same visual
 * weight as a single Cite pill regardless of source count.
 */
export function CiteGroup({ sources }: { sources: readonly Source[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (sources.length === 0) return null;
  if (sources.length === 1) return <Cite source={sources[0]} />;

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle' }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        aria-expanded={open}
        aria-label={`${sources.length} sources`}
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
          background: open ? T.bgAlt : 'transparent',
          textDecoration: 'none',
          verticalAlign: 'middle',
          lineHeight: 1,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          position: 'relative',
          top: '-0.1em',
        }}
      >sources · {sources.length} ↗</button>
      {open && (
        <div
          role="dialog"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0,
            background: T.surface,
            border: `1px solid ${T.border}`,
            padding: '8px 0',
            minWidth: 260,
            maxWidth: 360,
            zIndex: 50,
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
            fontFamily: fonts.body,
            fontSize: 12,
            color: T.ink,
            textTransform: 'none',
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          {sources.map((s, i) => (
            <a
              key={i}
              href={s.url} target="_blank" rel="noreferrer"
              style={{
                display: 'block',
                padding: '6px 14px',
                color: T.ink,
                textDecoration: 'none',
                lineHeight: 1.4,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span>{s.label}</span>{' '}
              <span style={{ color: T.accent, fontWeight: 600 }}>↗</span>
              {s.date && (
                <div style={{ fontSize: 11, color: T.inkMuted, marginTop: 1 }}>{s.date}</div>
              )}
            </a>
          ))}
        </div>
      )}
    </span>
  );
}

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
        >source ↗</a>
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
