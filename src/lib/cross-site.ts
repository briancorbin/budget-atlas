// Environment-aware URL for the Marginalia companion site.
//
// On the develop instance (develop.thebudgetatlas.com), cross-site links go
// to develop.marginalia.thebudgetatlas.com. On prod, they go to
// marginalia.thebudgetatlas.com. Anywhere else (localhost, preview URLs),
// fall through to prod — develop iteration on the Atlas doesn't usually
// need a develop Marginalia.
//
// Detected from window.location.hostname at evaluation time. SSR-safe: if
// `window` is undefined, returns the prod URL.
export function marginaliaUrl(): string {
  const isDevelop =
    typeof window !== 'undefined' && window.location.hostname.startsWith('develop.');
  return isDevelop
    ? 'https://develop.marginalia.thebudgetatlas.com'
    : 'https://marginalia.thebudgetatlas.com';
}
