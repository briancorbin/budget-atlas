import type { ReactNode } from 'react';
import { navigate } from '../lib/router';

/** Internal SPA link. Falls back to a real anchor for cmd-click / new-tab. */
export function Link({
  to,
  children,
  style,
}: {
  to: string;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <a
      href={to}
      style={style}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
