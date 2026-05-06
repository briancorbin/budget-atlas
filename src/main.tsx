import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Self-hosted fonts via @fontsource — no Google Fonts CDN.
//
// Matching the original Google Fonts request exactly:
//   Fraunces:opsz,wght,SOFT@9..144,300..700,30..100  — upright only, NOT italic
//   IBM Plex Sans wght 300/400/500/600                — upright only, NOT italic
//   IBM Plex Mono wght 300/400/500                    — upright only
//
// The site has shipped without true italic faces since day one — the
// masthead's italic h1 (`font-style: italic`) is rendered as faux italic
// by the browser, slanting the upright Fraunces. Loading the real
// `full-italic.css` here would substitute a completely different
// calligraphic italic design (Fraunces' true italic has dramatic WONK
// alternates and flowing strokes), which doesn't match the look users
// are familiar with. Same applies to IBM Plex Sans italic.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

import './index.css';
import { prefetchStatus } from '@/lib/sourceStatus';

// Kick off the one-time fetch of /api/audit/latest in parallel with the
// initial render. Status dots populate as soon as the response lands;
// nothing renders gated on it.
prefetchStatus();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
