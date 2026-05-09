/**
 * Editorial palette — copied verbatim from the Atlas's `src/theme.ts` so
 * marginalia.thebudgetatlas.com feels like the same publication. Any change
 * here should be mirrored to the Atlas (and vice-versa) until we extract
 * a shared package.
 */
export const theme = {
  bg: '#F4EFE3',
  bgAlt: '#EBE3D0',
  ink: '#1B1815',
  inkSoft: '#5A4F42',
  inkMuted: '#85786A',
  border: '#D6CBB1',
  accent: '#A6261C',
  positive: '#2D5016',
  warning: '#B8742B',
  aiAccent: '#3E5A7A',
  surface: '#FBF8EF',
} as const;

export const fonts = {
  display: '"Fraunces Variable", Fraunces, ui-serif, Georgia, serif',
  body: '"IBM Plex Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SFMono-Regular", monospace',
} as const;

export const rem = (px: number): string => `${px / 16}rem`;
