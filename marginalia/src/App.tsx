import { useEffect } from 'react';
import { Masthead } from './components/Masthead';
import { Footer } from './components/Footer';
import { IndexPage } from './pages/IndexPage';
import { PostPage } from './pages/PostPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { findPost } from './posts';
import { usePath } from './lib/router';

const POST_PREFIX = '/posts/';

export function App() {
  const path = usePath();

  // Per-route document.title. SEO-light; Cloudflare Pages serves the same
  // index.html for every path, so the title needs to be set at runtime.
  useEffect(() => {
    if (path === '/') {
      document.title = 'Marginalia — weekly notes from working with AI';
    } else if (path.startsWith(POST_PREFIX)) {
      const slug = path.slice(POST_PREFIX.length).replace(/\/$/, '');
      const post = findPost(slug);
      document.title = post
        ? `${post.title} — Marginalia`
        : 'Not found — Marginalia';
    } else {
      document.title = 'Not found — Marginalia';
    }
  }, [path]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Masthead />
      <main style={{ flex: 1 }}>{renderRoute(path)}</main>
      <Footer />
    </div>
  );
}

function renderRoute(path: string) {
  if (path === '/') return <IndexPage />;
  if (path.startsWith(POST_PREFIX)) {
    const slug = path.slice(POST_PREFIX.length).replace(/\/$/, '');
    const post = findPost(slug);
    if (post) return <PostPage post={post} />;
  }
  return <NotFoundPage />;
}
