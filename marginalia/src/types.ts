import type { ReactNode } from 'react';

/**
 * The 5 polish levels. The slider snaps to these positions.
 * Definitions are spec'd in marginalia/POLISH_GUIDE.md — anything
 * ambiguous about how to author a level lives in the guide, not here.
 */
export const POLISH_LEVELS = ['raw', 'light', 'medium', 'heavy', 'full'] as const;
export type PolishLevel = (typeof POLISH_LEVELS)[number];

export const POLISH_LEVEL_LABELS: Record<PolishLevel, string> = {
  raw: 'Raw',
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
  full: 'Full',
};

export const POLISH_LEVEL_DESCRIPTIONS: Record<PolishLevel, string> = {
  raw: 'Verbatim — what I typed, with the prompts that elicited it.',
  light: 'Typo + capitalization fixes. Prompts synthesized to a tight Q&A.',
  medium: 'Assembled into paragraphs. Prompts removed.',
  heavy: 'Essay structure, reordering, transitions.',
  full: 'Full editorial polish — em-dashes, parallel beats, the works.',
};

/**
 * One Marginalia post. Each polish level renders the entire post body
 * (Editorial narrative + Field Notes if any). The slider swaps the
 * whole render — readers can see exactly what each level of AI editing
 * produces. See marginalia/POLISH_GUIDE.md for the level spec.
 */
export type Post = {
  slug: string;
  /** Display order — week number, "Post 0", etc. Free-form short string. */
  number: string;
  title: string;
  /** ISO date (YYYY-MM-DD) the post was published. */
  date: string;
  /** Optional ISO date the post's coverage window starts on. */
  coversFrom?: string;
  /** Optional ISO date the post's coverage window ends on. */
  coversTo?: string;
  /** One-line teaser for index list and RSS feed. */
  dek: string;
  /**
   * Five level renderings. Each one is the WHOLE post body at that
   * polish level — Editorial + (optional) Field Notes inlined.
   */
  levels: Record<PolishLevel, () => ReactNode>;
};
