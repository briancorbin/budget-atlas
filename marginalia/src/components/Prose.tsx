import type { CSSProperties, ReactNode } from 'react';
import { theme, fonts, rem } from '../theme';

/**
 * Wraps long-form post content with editorial typography. Headings, body
 * spacing, blockquote treatment for `[Claude prompted: ...]` blocks, etc.
 * Single source of truth for what a Marginalia post body looks like.
 */
export function Prose({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        fontSize: rem(18),
        lineHeight: 1.65,
        color: theme.ink,
        fontFamily: fonts.body,
        ...style,
      }}
      className="marginalia-prose"
    >
      <style>{`
        .marginalia-prose h2 {
          font-family: ${fonts.display};
          font-weight: 500;
          font-size: ${rem(28)};
          margin-top: 44px;
          margin-bottom: 14px;
          font-variation-settings: "opsz" 144, "SOFT" 100;
        }
        .marginalia-prose h3 {
          font-family: ${fonts.display};
          font-weight: 500;
          font-size: ${rem(22)};
          margin-top: 32px;
          margin-bottom: 10px;
        }
        .marginalia-prose p {
          margin: 0 0 18px 0;
        }
        .marginalia-prose strong {
          font-weight: 600;
          color: ${theme.ink};
        }
        .marginalia-prose em {
          font-style: italic;
        }
        .marginalia-prose blockquote {
          margin: 18px 0;
          padding: 12px 18px;
          border-left: 3px solid ${theme.aiAccent};
          background: ${theme.surface};
          color: ${theme.inkSoft};
          font-family: ${fonts.mono};
          font-size: ${rem(14)};
          line-height: 1.55;
        }
        .marginalia-prose blockquote p {
          margin: 0;
        }
        .marginalia-prose ul {
          padding-left: 22px;
          margin: 0 0 18px 0;
        }
        .marginalia-prose li {
          margin-bottom: 6px;
        }
        .marginalia-prose hr {
          border: 0;
          border-top: 1px solid ${theme.border};
          margin: 36px 0;
        }
        .marginalia-prose code {
          background: ${theme.bgAlt};
          padding: 1px 6px;
          border-radius: 3px;
          font-size: ${rem(15)};
        }
      `}</style>
      {children}
    </div>
  );
}
