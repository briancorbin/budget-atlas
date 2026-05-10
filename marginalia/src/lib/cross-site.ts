// Environment-aware URL for the Atlas. Mirrors src/lib/cross-site.ts in
// the Atlas project. On develop.marginalia.thebudgetatlas.com, links go
// to develop.thebudgetatlas.com. On prod, to thebudgetatlas.com.
export function atlasUrl(): string {
  const isDevelop =
    typeof window !== 'undefined' && window.location.hostname.startsWith('develop.');
  return isDevelop
    ? 'https://develop.thebudgetatlas.com'
    : 'https://thebudgetatlas.com';
}
