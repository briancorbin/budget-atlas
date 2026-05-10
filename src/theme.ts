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
  // Slate-blue carries two related "machine-flavoured signal" meanings:
  //   - AI provenance: ai-verified review pills, AI-tier badges
  //   - Audit caveat: bot-blocked-verified (filled) and intermittent (hollow)
  // Both are "the audit can't fully vouch for this; here's a softer signal
  // instead," and sharing the colour avoids the two-blues collision an
  // earlier auditAccent token created. Hollow/filled within this family is
  // uniformly "weaker / stronger evidence within the family."
  aiAccent: '#3E5A7A',
  commercialAccent: '#7A6628', // deep gold, used for the commercial source tier
  surface: '#FBF8EF',

  /**
   * Box-shadow scale — four variants:
   *   sm   — subtle lift (sticky bars, low-elevation chrome)
   *   md   — cards, hover popovers, the default
   *   lg   — heavier popovers (audit reports, source detail)
   *   card — ink-tinted card elevation. Slightly warmer cast than the
   *          neutral-black sm/md/lg, picks up the editorial-cream surface
   *          beneath. Used by larger panel surfaces where a black drop
   *          shadow would feel too "screen-y."
   * Reach for one of these before inventing a new shadow.
   */
  shadows: {
    sm: '0 2px 8px rgba(0,0,0,0.06)',
    md: '0 4px 14px rgba(0,0,0,0.08)',
    lg: '0 4px 16px rgba(0,0,0,0.15)',
    card: '0 4px 12px rgba(27, 24, 21, 0.12)',
  },

  /**
   * Two-stop radial gradient layered behind every top-level page (atlas,
   * about, privacy, roadmap, sources). A faint editorial-red glow at the
   * top-left and a fainter forest-green glow at the bottom-right. The
   * literal colors are T.accent at 0.04 alpha and T.positive at 0.03.
   */
  pageGradient: `radial-gradient(circle at 20% 0%, rgba(166, 38, 28, 0.04), transparent 50%),
         radial-gradient(circle at 80% 100%, rgba(45, 80, 22, 0.03), transparent 50%)`,

  /** Tinted backgrounds for the sustainable / unsustainable status banner. */
  bannerBg: {
    success: '#E8EBDF',
    danger: '#F1DBD8',
  },

  /**
   * Source-tier colors used by the expense breakdown's source badges.
   * Each value is a muted tint of one of the editorial accents, chosen so
   * the five tiers read as a small palette rather than a noisy rainbow.
   */
  tierColors: {
    primary: '#5B7C3F', // muted green — primary BLS / agency
    reference: '#A88A40', // muted gold — single-source reference (KFF, EPI, etc.)
    mixed: '#6E7AA8', // muted blue — multi-source combinations
    commercial: '#7A6B5A', // muted brown — commercial / proprietary
    none: '#B85C5C', // muted red — audit gap, no formal source
  },
} as const;

export const fonts = {
  // "Fraunces Variable" is the family name shipped by @fontsource-variable/fraunces
  // (full.css axes: opsz + wght + SOFT, matching the original Google Fonts request).
  // "Fraunces" kept as fallback in case a user already has the static face installed.
  display: '"Fraunces Variable", Fraunces, ui-serif, Georgia, serif',
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
