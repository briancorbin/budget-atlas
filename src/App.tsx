import { useEffect, useState } from 'react';
import { BudgetExplorer } from '@/components/BudgetExplorer';
import { Roadmap } from '@/components/Roadmap';
import { About } from '@/components/About';
import { Sources } from '@/components/Sources';
import { NAV_EVENT, navigate } from '@/lib/nav';

type Route = 'atlas' | 'roadmap' | 'about' | 'sources';

function routeFromPath(pathname: string): Route {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  if (trimmed === 'roadmap') return 'roadmap';
  if (trimmed === 'about') return 'about';
  if (trimmed === 'sources') return 'sources';
  return 'atlas';
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
  if (route === 'sources') {
    return <Sources onBack={() => navigate('/')} />;
  }
  return <BudgetExplorer />;
}
