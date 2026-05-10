import type { ReactNode } from 'react';

/**
 * The 5 polish levels. The slider snaps to these positions.
 * Definitions are spec'd in marginalia/POLISH_GUIDE.md.
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
 * One unit of Editorial content at a given polish level. Sections are
 * the atomic unit of the compare view: hovering one highlights its
 * counterpart on the other pane.
 *
 *  - id        Stable semantic identifier (e.g. 'why-now', 'the-moment').
 *              Raw sections own the canonical IDs. Higher polish levels
 *              reference Raw IDs via mapsFrom.
 *  - mapsFrom  IDs from the Raw level whose substance this section
 *              transformed. Empty/absent at Raw itself. May contain
 *              multiple IDs when a higher-polish paragraph collapses
 *              several Raw chunks into one.
 *  - aiAdded   true when the paragraph has no Raw source at all (purely
 *              structural / editorial connective tissue Claude added,
 *              like "That's the why. The rest of Marginalia is the what.").
 *              Visually flagged in the compare view so readers can see
 *              what's invented vs. transformed.
 *  - content   The rendered paragraph(s).
 */
export type Section = {
  id: string;
  mapsFrom?: string[];
  aiAdded?: boolean;
  content: ReactNode;
};

/**
 * One polish level's content for a single post. Editorial is sectioned
 * for the compare view; Field Notes stays as a single render for v0
 * (Editorial-only compare; Field Notes can be backfilled later).
 */
export type Level = {
  editorial: Section[];
  fieldNotes?: () => ReactNode;
};

/**
 * One Marginalia post. Each polish level is a Level (sectioned
 * Editorial + optional Field Notes). The slider swaps the active
 * level; the compare view renders Raw alongside any non-Raw level.
 * See marginalia/POLISH_GUIDE.md for the level spec.
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
  /** Five level renderings. Editorial sectioned; Field Notes optional. */
  levels: Record<PolishLevel, Level>;
};
