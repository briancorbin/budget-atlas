import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Self-hosted fonts via @fontsource — no Google Fonts CDN.
// Fraunces (display): variable font with full opsz + wght + SOFT axes
//   (matches the original Google Fonts request); italic face included so
//   the masthead's italic h1 renders correctly.
// IBM Plex Sans (body): weights 300 / 400 / 500 / 600 + 400-italic.
// IBM Plex Mono (mono): weights 300 / 400 / 500.
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource/ibm-plex-sans/300.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-sans/400-italic.css';
import '@fontsource/ibm-plex-mono/300.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';

import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
