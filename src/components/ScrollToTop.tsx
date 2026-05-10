import { useEffect, useState } from 'react';
import { theme as T, fonts, rem } from '@/theme';

/**
 * Floating "back to top" button. Fades in once the user has scrolled past
 * a threshold; tapping it smooth-scrolls back to y=0. Sized as a 44px
 * tap target for thumb-reach on mobile; sits bottom-right with safe-area
 * padding so it doesn't collide with the iOS Safari bottom UI.
 */
export function ScrollToTop({ threshold = 600 }: { threshold?: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  const scrollToTop = () => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Scroll to top"
      title="Scroll to top"
      // When invisible the button is still in the tab order if we only
      // toggle opacity/pointer-events. Take it out of focus and the a11y
      // tree explicitly so keyboard / screen-reader users can't land on
      // an invisible control.
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      style={{
        position: 'fixed',
        right: 'max(16px, env(safe-area-inset-right))',
        bottom: 'max(20px, env(safe-area-inset-bottom))',
        width: 44,
        height: 44,
        borderRadius: '50%',
        background: T.surface,
        color: T.accent,
        border: `1px solid ${T.border}`,
        boxShadow: '0 4px 14px rgba(0,0,0,0.10)',
        cursor: 'pointer',
        fontFamily: fonts.body,
        fontSize: rem(18),
        fontWeight: 600,
        lineHeight: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        pointerEvents: visible ? 'auto' : 'none',
        transition: 'opacity 200ms ease-out, transform 200ms ease-out',
        zIndex: 40,
      }}
    >
      <svg
        aria-hidden
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="square"
      >
        <path d="M7 11 L7 3" />
        <path d="M3 6 L7 2 L11 6" />
      </svg>
    </button>
  );
}
