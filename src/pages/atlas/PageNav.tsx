import { useEffect, useState } from 'react';
import { theme as T, fonts, rem } from '@/theme';

export interface PageNavSection {
  id: string;
  label: string;
}

/**
 * Fixed-position section navigator. Sits on the right edge of the viewport
 * and offers click-to-scroll for each section on the page. Highlights the
 * section currently in view via IntersectionObserver. Hidden on narrow
 * viewports (where the page is already a vertical stack and a side rail
 * would steal horizontal room from the data-dense charts).
 *
 * Sections need matching `id` attributes on the `<section>` (or any) element
 * in the page itself; this component does no DOM mutation, just smooth-
 * scrolls to the anchor on click.
 */
export function PageNav({ sections }: { sections: readonly PageNavSection[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '');

  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Pick the section whose top is closest to the viewport's "reading line"
    // (~25% down from the top). Plain "topmost intersecting" picks the wrong
    // section when two are partially visible at once.
    const observer = new IntersectionObserver(
      (entries) => {
        // Track every observed section's current top relative to the
        // viewport, then choose the one closest to 0 from above.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-25% 0px -55% 0px', threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const onClick = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // Update history so the back button returns to the previous section.
    if (typeof window !== 'undefined') {
      const hashlessUrl = window.location.pathname + window.location.search;
      window.history.replaceState(null, '', `${hashlessUrl}${window.location.hash}`);
    }
  };

  return (
    <nav
      aria-label="Page sections"
      style={{
        position: 'fixed',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        zIndex: 5,
        // Hidden by default; the media query below shows it on wide viewports
        // where there's room for a side rail without crowding the main column.
        display: 'none',
      }}
      className="page-nav"
    >
      {/* Inline style tag is the lightest way to add a media query without
          pulling in CSS-in-JS infra; the rest of the app uses inline styles. */}
      <style>{`
        @media (min-width: 1400px) {
          .page-nav { display: block !important; }
        }
      `}</style>
      <ul
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          fontFamily: fonts.body,
          fontSize: rem(11),
        }}
      >
        {sections.map((s) => {
          const isActive = activeId === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => onClick(e, s.id)}
                aria-current={isActive ? 'true' : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 0 6px 12px',
                  borderLeft: `2px solid ${isActive ? T.accent : 'transparent'}`,
                  color: isActive ? T.ink : T.inkMuted,
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
              >
                <span
                  aria-hidden
                  style={{
                    display: 'inline-block',
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    background: isActive ? T.accent : T.border,
                  }}
                />
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
