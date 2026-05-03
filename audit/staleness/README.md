# Staleness audit

Weekly check that flags citations whose human review has aged past a tier-specific threshold.

## Why staleness, separately from the link audit

The two audits catch different drift modes:

- **Link audit** (`audit/links/`) — does the URL still load? Catches URL-level rot (404s, DNS failures, anti-bot blocks). Runs nightly via curl.
- **Staleness audit** (this directory) — has anyone _verified_ the citation lately? Catches content-level drift, where a page loads fine but the document was revised, the rule was superseded, or the regulator's interpretation changed. The only thing that catches that is human eyes, periodically.

A 200 OK from curl is necessary but not sufficient. Staleness is the rule that keeps "necessary" from becoming a comfortable lie.

## Tier thresholds

Each `Source` in `src/data/sources.ts` carries a `tier` field that determines how often it should be re-verified:

| Tier        | Threshold | Rationale                                                                                                  |
| ----------- | --------: | ---------------------------------------------------------------------------------------------------------- |
| `primary`   |   90 days | Direct from agency / data publisher (IRS, BLS, eCFR). High-stakes if drifted; quick re-verification.       |
| `secondary` |  180 days | Operational handbooks, agency landing pages, industry surveys, think-tank methodology. Drifts more slowly. |
| `editorial` |  365 days | Approximations flagged honestly. Drift tolerance is part of the design — these aren't precise.             |

Sources missing a tier fall back to the secondary threshold.

## Never-reviewed = overdue from day one

The audit's job is to honestly represent how much human verification has happened. Counting `addedAt` as a free pass — "this was added recently, give it some grace" — would launder "we wrote it down" into "a human verified it," which it isn't. So sources without any review row are overdue immediately, full stop.

This pairs with a deliberate convention: **any change to a source in `sources.ts` requires appending a row to `reviewed.tsv` in the same PR** — adding a source, updating a URL, updating data, removing, or just affirmatively reviewing. The registry never changes silently. The row is the proof that a human verified the new state. A source whose latest state-change isn't paired with a row gets flagged immediately, by design — it's the audit catching either:

- AI-proposed citations that were merged without manual verification, or
- URL updates made without re-reading the destination, or
- Any human edit where the verification step got skipped.

In practice the initial queue was large: when the registry first populated, every source got an `addedAt` of `2026-05-02` and zero reviews (because most were proposed by AI without enough manual checking), so the first staleness run flags ~210 items as "never reviewed." That's not a bug — it's the actual state of the audit. The maintainer chips away during periodic sweeps; the count drops as real `reviewed.tsv` rows land. The big-number-on-day-one is honest signal, not noise.

The issue body groups the queue by tier and within each tier separates "never reviewed" from "stale review" so triage can prioritize naturally.

## How it works

1. Reads `src/data/sources.ts` for the registry (URL → tier, `addedAt`).
2. Reads `audit/links/reviewed.tsv` for the latest review date per URL.
3. For each source:
   - If never reviewed → overdue. `daysSinceAdded` reports how long it's gone unverified (for triage signal).
   - If reviewed but the most recent review is older than the tier threshold → overdue by the difference.
4. Sorts by tier (primary first), then never-reviewed before stale-reviewed, then by days overdue.
5. Manages a single rolling GitHub issue with the `audit:staleness` label:
   - 0 overdue + open issue → close with a "queue clear" comment
   - > 0 overdue + no issue → create
   - > 0 overdue + open issue → edit title + body in place

The single-rolling-issue pattern keeps notifications, assignments, and discussion attached across weeks of operation rather than spawning fresh issues.

## Running it

```bash
yarn audit:staleness          # update the rolling issue
yarn audit:staleness -- --dry-run  # print what would happen
```

Manual runs go to the same rolling issue as the weekly cron. Re-running multiple times in a day is harmless.

## What's not in this audit (yet)

- **Escalation when 2× past threshold.** The data is there; not implemented. Would surface as a separate label or a body-level "🚨 critical" section.
- **Round-robin reviewer assignment.** Skipped while the project has effectively one reviewer. The CODEOWNERS-style dispatcher is straightforward to add when there are multiple maintainers.
- **HTTP liveness in the staleness signal.** Deliberately separate — the link audit handles "does it load," the staleness audit handles "did anyone verify it." Mixing would let an automated link check launder as a human review.
- **Per-cell source attribution in data files.** Today the audit tracks which Source objects in `sources.ts` have been verified. It doesn't know which specific data values (e.g. `nyc.rent1 = 4200`) trace back to which Source. Adding a `_sources` map per data row (or a `cite(value, sourceId)` helper) would let the staleness audit go further: when a Source is overdue, automatically flag every cell that cites it for re-verification. Most valuable for aggregate / methodology-driven values (city COL, state min wages, childcare); less valuable for exact-source values (federal tax brackets ← single IRS PDF). Defer until we've worked through 25-50 staleness items and have a feel for which sources are messy / multi-attributed enough to justify the per-cell investment. See conversation in commit history for full design tradeoffs.

## Resolution path

For each overdue item:

1. Open the URL yourself. Read the destination. (No AI.)
2. If it still backs the claim → append a row to `audit/links/reviewed.tsv` with today's date and notes.
3. If it doesn't → file an [`audit:report`](https://github.com/TheBudgetAtlas/thebudgetatlas/issues/new?template=source-report.yml) instead. The fix lands as the unified `reviewed.tsv` row in the resolving PR.

The staleness issue's body regenerates each weekly run; resolved items disappear automatically as their `reviewed.tsv` rows land. Checking a box on the issue claims that item as in-progress — claim state persists across weekly regenerates (so checks survive Monday's run if you started reviewing on Friday). When the resolution lands, the item disappears entirely.
