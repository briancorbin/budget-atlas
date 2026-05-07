/**
 * Audit domain logic — pure functions + parsed `reviewed.tsv`.
 *
 * Knows nothing about React, fetch, or the Worker. Given a `Source` and
 * a status map (from `store.ts`'s `useStatusByUrl()`), classifies the
 * source as broken / overdue / verified / ai-verified. Also parses
 * `audit/links/reviewed.tsv` (still bundled — authored content) into a
 * `REVIEWS` map keyed by stable source id.
 *
 * Rule of thumb for what belongs here vs. store.ts: if the function's
 * output depends on the map's *contents* it lives here; if it depends
 * on *when* the map was last refreshed (fetch state, listeners) it
 * lives in store.ts.
 */

import type { Source } from '@/types';
// Authored content; git history is meaningful, so this stays bundled.
import reviewedTsv from '../../../audit/links/reviewed.tsv?raw';

/**
 * Review provenance — collapsed to a binary after the three-state experiment.
 *
 *   - `human` — eyes-on-source, no AI involvement.
 *   - `ai`    — AI helped propose or extract; whatever human review happened
 *               (a glance, a careful read, none) is self-reported and
 *               unverifiable, so we don't pretend to subdivide.
 *
 * The earlier `ai-assisted` / `ai-proposed` split tried to grade AI work by
 * how much human review followed. In practice the line was too fuzzy to
 * carry weight (one person's "I read it" is another's "I clicked merge"),
 * and the UI naturally collapsed both into "AI reviewed." Two states is
 * sharper, less self-deceptive, and lower friction when adding rows.
 */
export type ReviewKind = 'human' | 'ai';

export interface Review {
  date: string;
  reviewer: string;
  /**
   * What kind of verification this row records. Legacy rows (4-column
   * format, pre-kind-column) default to `human` since that's what they
   * were before the schema change. New rows declare it explicitly. See
   * audit/links/reviewed.tsv header for the full definitions.
   *
   * Forwards-compat: rows written under the old three-state vocabulary
   * (`ai-assisted`, `ai-proposed`) are normalised to `ai` at parse time so
   * the schema migration doesn't require touching every old row.
   */
  kind: ReviewKind;
  notes: string;
}

/**
 * Recognised values in the kind column. Includes the legacy three-state
 * spellings so old rows still parse; the parser folds them into `ai`.
 *
 * `verified-bot-blocked` is recognised by the validator (so a row with
 * that kind doesn't get rejected as malformed) but is NOT loaded into
 * REVIEWS — those rows only affect the broken-link audit's suppression,
 * not the user-facing review history shown on /sources or the staleness
 * clock. See audit/links/seed-issues.mjs for how they're consumed.
 */
const REVIEW_KIND_VALUES: ReadonlySet<string> = new Set([
  'human',
  'ai',
  'ai-assisted',
  'ai-proposed',
  'verified-bot-blocked',
]);

const REVIEW_KIND_HIDDEN: ReadonlySet<string> = new Set(['verified-bot-blocked']);

function normaliseKind(raw: string): ReviewKind {
  if (raw === 'human') return 'human';
  return 'ai';
}

/** Status codes that classify a citation as broken in the UI + audit issue. */
// 999 is excluded — it's an anti-bot signal (LinkedIn, several state .gov
// sites use it to refuse automated traffic). The page is usually fine in a
// real browser, so categorising it as "broken" produces false positives in
// the count. It belongs alongside 403 in the bot-blocked bucket. Matches
// the status-code interpretation table in audit/links/README.md.
export const BROKEN_STATUS_CODES = new Set(['404', '000', '000ERR', 'ERR']);

export function isBrokenStatus(status: string | undefined): boolean {
  if (!status) return false;
  return BROKEN_STATUS_CODES.has(status);
}

/**
 * Tier review thresholds in days — must stay in sync with
 * `audit/staleness/seed-issue.mjs`. The Node script writes the issue;
 * this module drives the UI.
 */
export const STALENESS_THRESHOLDS_DAYS: Record<string, number> = {
  // Direct from the publisher; high-stakes if drifted.
  primary: 90,
  // Peer-respected third-party interpretation; medium drift risk.
  reference: 180,
  // Commercial / crowd-sourced data products are MORE volatile than primary
  // (Zillow's index updates monthly, RentCafe shifts constantly), so the
  // window matches primary's 90-day cadence rather than getting a longer
  // leash. Earlier draft used 365d; that was the relic of `estimate`'s
  // "approximation, hardly changes" rationale, which doesn't apply here.
  commercial: 90,
};
export const STALENESS_DEFAULT_DAYS = 180;

/**
 * Parse `audit/links/reviewed.tsv` into a Map keyed by source id (newest
 * review first within each list). Reviews follow source identity (slug),
 * not URL — so URL changes don't orphan history.
 */
/**
 * `verified-bot-blocked` rows live here, separate from REVIEWS. Keyed by
 * source id, value is the most-recent BBV row (TSV may carry older ones
 * but only the latest matters for TTL). Used by `getStatusKind` to soften
 * the "broken" classification when a human has eyeballed the URL in a
 * browser within BOT_BLOCKED_TTL_DAYS.
 */
export interface BotBlockedReview {
  date: string;
  reviewer: string;
  notes: string;
}
export const BOT_BLOCKED_REVIEWS = new Map<string, BotBlockedReview>();

/**
 * How long a `verified-bot-blocked` row stays in effect on the /sources
 * page. Mirrors VERIFIED_BOT_BLOCKED_TTL_DAYS in
 * audit/links/seed-issues.mjs — both layers (the rolling issue and the
 * /sources page) suppress for the same window.
 */
export const BOT_BLOCKED_TTL_DAYS = 30;

export const REVIEWS = (() => {
  const map = new Map<string, Review[]>();
  for (const line of reviewedTsv.split('\n')) {
    if (!line || line.startsWith('#') || line.startsWith('id\t')) continue;
    const parts = line.split('\t');
    const [id, date, reviewer] = parts;
    if (!id) continue;
    // 4-col legacy: id, date, reviewer, notes — kind defaults to 'human'.
    // 5-col current: id, date, reviewer, kind, notes.
    //
    // Disambiguation rule: a 5+ column row is "5-column" iff column 4 is a
    // recognised kind. If column 4 is NOT a recognised kind, we treat the
    // row as malformed rather than falling back to legacy parsing — a typo
    // like `humn` or `ai-asistted` would otherwise silently promote a row
    // to kind='human' with the column shifted into notes. Loud failure
    // beats silent misclassification when the whole point of the kind
    // column is honest provenance.
    let kind: ReviewKind;
    let notes: string;
    if (parts.length >= 5) {
      if (!REVIEW_KIND_VALUES.has(parts[3])) {
        console.warn(
          `[reviewed.tsv] Unrecognised kind "${parts[3]}" on row for "${id}". ` +
            `Expected one of: ${Array.from(REVIEW_KIND_VALUES).join(', ')}. ` +
            `Skipping row to avoid silent misclassification.`,
        );
        continue;
      }
      // verified-bot-blocked rows go into BOT_BLOCKED_REVIEWS instead
      // of REVIEWS — they don't represent the kind of full-citation
      // verification /sources surfaces in review history, and shouldn't
      // reset the staleness clock via isOverdue(). But they DO soften the
      // broken classification (see getStatusKind), so they need to be
      // accessible — just through a separate map.
      if (REVIEW_KIND_HIDDEN.has(parts[3])) {
        const bbvNotes = parts[4] ?? '';
        const existing = BOT_BLOCKED_REVIEWS.get(id);
        if (!existing || (date ?? '') > existing.date) {
          BOT_BLOCKED_REVIEWS.set(id, { date, reviewer, notes: bbvNotes });
        }
        continue;
      }
      kind = normaliseKind(parts[3]);
      notes = parts[4] ?? '';
    } else {
      kind = 'human';
      notes = parts[3] ?? '';
    }
    if (!map.has(id)) map.set(id, []);
    map.get(id)!.push({ date, reviewer, kind, notes });
  }
  for (const list of map.values()) {
    list.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }
  return map;
})();

/**
 * True iff the source has a `verified-bot-blocked` row in reviewed.tsv
 * dated within BOT_BLOCKED_TTL_DAYS of `today`. Only meaningful as a
 * softener for an otherwise-broken status — callers should check raw
 * status first.
 */
export function isBotBlockedVerified(source: Source, today: Date = new Date()): boolean {
  const review = BOT_BLOCKED_REVIEWS.get(source.id);
  if (!review) return false;
  const reviewDate = new Date(review.date + 'T00:00:00Z');
  if (Number.isNaN(reviewDate.valueOf())) return false;
  const ageMs = today.getTime() - reviewDate.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  return ageDays <= BOT_BLOCKED_TTL_DAYS;
}

/** Tier-aware overdue check. Never-reviewed sources are overdue from day one. */
export function isOverdue(source: Source): boolean {
  const tier = source.tier ?? 'reference';
  const thresholdDays = STALENESS_THRESHOLDS_DAYS[tier] ?? STALENESS_DEFAULT_DAYS;
  const latest = REVIEWS.get(source.id)?.[0];
  if (!latest) return true;
  const reviewDate = new Date(latest.date + 'T00:00:00Z');
  if (Number.isNaN(reviewDate.valueOf())) return false;
  const dueDate = new Date(reviewDate);
  dueDate.setUTCDate(dueDate.getUTCDate() + thresholdDays);
  return new Date() > dueDate;
}

export type StatusKind =
  | 'broken'
  | 'intermittent'
  | 'bot-blocked-verified'
  | 'overdue'
  | 'verified'
  | 'ai-verified';

/**
 * Combined status classifier. Precedence when raw status is broken:
 *
 *   bot-blocked-verified > intermittent > broken
 *
 * Otherwise: overdue > ai-verified > verified.
 *
 * `bot-blocked-verified`: raw status is broken from CI, but a human
 * confirmed the URL loads in a real browser within BOT_BLOCKED_TTL_DAYS.
 * Stronger evidence than flap history, so it outranks intermittent.
 *
 * `intermittent`: raw status is broken in the latest run, but the last
 * few runs include at least one non-broken status. Could be transient.
 * The flap signal arrives via the `intermittentUrls` set (server-computed
 * in /api/audit/latest); when this hook is unavailable (server old, set
 * empty) the classifier falls through to `broken`, which is the same
 * behaviour the page had before.
 *
 * `ai-verified` means: URL loads, latest review is within the tier window,
 * but that review was AI-assisted or AI-proposed rather than eyes-on-source
 * by a human. Rendered as a hollow green ring (same color family as
 * verified, different shape) to signal "same kind of state, just provisional."
 */
export function getStatusKind(
  source: Source,
  statusByUrl: ReadonlyMap<string, string>,
  intermittentUrls: ReadonlySet<string> = new Set(),
): StatusKind {
  if (isBrokenStatus(statusByUrl.get(source.url))) {
    if (isBotBlockedVerified(source)) return 'bot-blocked-verified';
    if (intermittentUrls.has(source.url)) return 'intermittent';
    return 'broken';
  }
  if (isOverdue(source)) return 'overdue';
  const latest = REVIEWS.get(source.id)?.[0];
  if (latest && latest.kind === 'ai') return 'ai-verified';
  return 'verified';
}
