/**
 * Editorial financial-publication palette.
 * Cream background, ink text, deep red accent — designed to feel like a
 * printed reference document rather than a SaaS dashboard.
 */
export const theme = {
  bg: '#F4EFE3',
  bgAlt: '#EBE3D0',
  ink: '#1B1815',
  inkSoft: '#5A4F42',
  inkMuted: '#85786A',
  border: '#D6CBB1',
  accent: '#A6261C', // editorial red
  positive: '#2D5016', // forest green
  warning: '#B8742B', // burnt orange
  aiAccent: '#3E5A7A', // muted slate-blue, used for AI-provenance signals
  surface: '#FBF8EF',
} as const;

export const fonts = {
  display: 'Fraunces, ui-serif, Georgia, serif',
  body: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace',
} as const;

/**
 * Convert a pixel value to a rem string (relative to the root font-size).
 *
 * Why we use this everywhere for `fontSize`: rem-based sizing scales with
 * the user's browser font-size preference (a real accessibility win for
 * users who've bumped their default from 16px). Pixel values ignore that
 * preference entirely. We keep designing in px (intuitive unit) and emit
 * rem for the actual style.
 *
 * Spatial properties (padding, margin, gap, border-radius, etc.) stay in
 * px — those are chrome dimensions, not text, and don't need to scale
 * with the user's reading-size preference.
 */
export const rem = (px: number): string => `${px / 16}rem`;

/** Categorical palette for expense charts. */
export const PIE_COLORS = [
  '#A6261C',
  '#2D5016',
  '#B8742B',
  '#3E5A7A',
  '#7A4E2A',
  '#5C5C2D',
  '#8A4A6E',
  '#3A6E6E',
  '#85786A',
] as const;
