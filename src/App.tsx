import { useEffect, useState } from 'react';
import { BudgetExplorer } from '@/pages/atlas/BudgetExplorer';
import { Roadmap } from '@/pages/roadmap/Roadmap';
import { About } from '@/pages/about/About';
import { Sources } from '@/pages/sources/Sources';
import { Privacy } from '@/pages/privacy/Privacy';
import { DesignLab } from '@/pages/design-lab/DesignLab';
import { NAV_EVENT, navigate } from '@/lib/nav';

type Route = 'atlas' | 'roadmap' | 'about' | 'sources' | 'privacy' | 'design-lab';

function routeFromPath(pathname: string): Route {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (trimmed === 'roadmap') return 'roadmap';
  if (trimmed === 'about') return 'about';
  if (trimmed === 'sources') return 'sources';
  if (trimmed === 'privacy') return 'privacy';
  if (trimmed === 'design-lab') return 'design-lab';
  return 'atlas';
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => {
    // Migrate legacy hash URLs (#/roadmap, #/about) to clean paths on first
    // load so old bookmarks and shared links still work.
    //
    // Match only the old hash-route pattern (`#/something`) — modern in-page
    // anchor hashes like `#tiers` (used by /design-lab to deep-link a
    // section) must pass through untouched, otherwise they get rewritten to
    // `/` and the destination page never mounts the right section.
    if (/^#\//.test(window.location.hash)) {
      const legacy = window.location.hash.replace(/^#\//, '').toLowerCase();
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
  if (route === 'sources') {
    return <Sources onBack={() => navigate('/')} />;
  }
  if (route === 'privacy') {
    return <Privacy onBack={() => navigate('/')} />;
  }
  if (route === 'design-lab') {
    return <DesignLab onBack={() => navigate('/')} />;
  }
  return <BudgetExplorer />;
}
