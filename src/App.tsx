import { useEffect, useState } from 'react';
import { BudgetExplorer } from '@/components/BudgetExplorer';
import { Roadmap } from '@/components/Roadmap';
import { About } from '@/components/About';

type Route = 'atlas' | 'roadmap' | 'about';

function routeFromPath(pathname: string): Route {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (trimmed === 'roadmap') return 'roadmap';
  if (trimmed === 'about') return 'about';
  return 'atlas';
}

const NAV_EVENT = 'app:navigate';

/**
 * Programmatic navigation — used by in-app links to change route without a
 * full page reload. Call this instead of setting `window.location`.
 */
export function navigate(path: string) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new Event(NAV_EVENT));
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => {
    // Migrate legacy hash URLs (#/roadmap, #/about) to clean paths on first
    // load so old bookmarks and shared links still work.
    if (window.location.hash) {
      const legacy = window.location.hash.replace(/^#\/?/, '').toLowerCase();
      const target = legacy === 'roadmap' ? '/roadmap' : legacy === 'about' ? '/about' : '/';
      window.history.replaceState({}, '', target);
    }
    return routeFromPath(window.location.pathname);
  });

  useEffect(() => {
    const update = () => setRoute(routeFromPath(window.location.pathname));
    window.addEventListener('popstate', update);
    window.addEventListener(NAV_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAV_EVENT, update);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);

  if (route === 'roadmap') {
    return <Roadmap onBack={() => navigate('/')} />;
  }
  if (route === 'about') {
    return <About onBack={() => navigate('/')} />;
  }
  return <BudgetExplorer />;
}
