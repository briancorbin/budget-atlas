import { useEffect, useState } from 'react';

/**
 * Tiny path-based router. Vite serves a real SPA; Cloudflare Pages routes
 * unknown paths back to /index.html via `_redirects`. Keeps URLs clean
 * (`/posts/post-0` rather than `#/posts/post-0`) so RSS readers and
 * incoming inbound links resolve to a real path.
 */
export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const handler = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);
  return path;
}

export function navigate(to: string): void {
  if (to === window.location.pathname) return;
  window.history.pushState(null, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  // 'auto' (the default) is the well-supported equivalent to 'instant';
  // explicit so the intent is documented at the call site.
  window.scrollTo({ top: 0, behavior: 'auto' });
}
