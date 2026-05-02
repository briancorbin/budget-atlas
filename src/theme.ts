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
  surface: '#FBF8EF',
} as const;

export const fonts = {
  display: 'Fraunces, ui-serif, Georgia, serif',
  body: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace',
} as const;

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
