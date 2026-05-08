# AI Time Log

Rough running estimate of how much time AI collaboration has saved on this project. Numbers are _estimates_ — solo-time is "what I think this would have taken me alone, evenings/weekends, including research and debugging," and AI-time is "what it actually took with Claude in the loop, including the inevitable re-prompts and back-and-forth."

The point isn't precision — it's a calibrated record over time. Backfill rows as you ship; revise estimates if a number looks wrong in retrospect.

## Conventions

- **One row per PR**, ideally. Use the PR number from `gh` so the row is easy to cross-reference. Two placeholder forms are allowed: `(TBD)` for work that hasn't been opened as a PR yet (update once it lands), and `—` for non-PR meta rows (this file itself, retros, etc.).
- **Solo est.** in hours of focused work, including the research/learning curve you'd hit cold.
- **With AI** in hours of actual elapsed time you spent driving the work (not wall-clock).
- **Saved** is the difference. Negative is OK and worth recording when AI cost more than it gave.
- **Category** picks one of: `impl` (writing code), `infra` (Cloudflare / D1 / CI / build), `design` (Figma / branding / visuals), `data` (citations / audit / source work), `docs`, `refactor`, `bugfix`, `meta` (process, this file, etc.).
- **Notes** — what did the AI do well, what did it do badly, surprises.

## Log

| Date       | PR    | Scope                                                                                                       | Category | Solo est. | With AI | Saved | Notes                                                                                                                                                                                                    |
| ---------- | ----- | ----------------------------------------------------------------------------------------------------------- | -------- | --------: | ------: | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-07 | #169  | This file — AI_TIME_LOG.md scaffolding                                                                      | meta     |     0.75h |    0.1h | 0.65h | Recursive. The act of tracking AI savings is itself an AI-saved task.                                                                                                                                    |
| 2026-05-07 | (TBD) | Swag page rebuild — sticker variants, pin polish, copy options panel, alt-copy shirts, lockups → Brand page | design   |        8h |    1.5h |  6.5h | Figma plugin scripting is the heaviest leverage in this project. The plugin API is gnarly and the iteration loop (screenshot → eval → tweak) is fast with AI. Cost: ~30 min on resize/rescale debugging. |
| 2026-05-07 | #164  | Page-based file layout refactor + soften /sources broken state                                              | refactor |        5h |   0.75h | 4.25h | Cross-file rename + import update is exactly the kind of mechanical work AI compresses to nothing.                                                                                                       |
| 2026-05-06 | #163  | Audit backend C: kill in-repo TSV churn                                                                     | infra    |        4h |    0.5h |  3.5h |                                                                                                                                                                                                          |
| 2026-05-06 | #162  | Audit backend B: site reads from /api/audit/latest                                                          | infra    |        5h |   0.75h | 4.25h |                                                                                                                                                                                                          |
| 2026-05-05 | #161  | Audit backend A: D1 stand-up + dual-write                                                                   | infra    |       12h |      2h |   10h | Wrangler / D1 / Worker config — research-heavy if cold; AI knew the patterns. Biggest single saved-hours line so far.                                                                                    |
| 2026-05-05 | #160  | Branding: 1024×1024 social profile image variant                                                            | design   |      1.5h |   0.25h | 1.25h |                                                                                                                                                                                                          |
| 2026-05-04 | #146  | Income-sweep cliff curve                                                                                    | impl     |        4h |   0.75h | 3.25h | Vis logic + data shaping.                                                                                                                                                                                |
| 2026-05-03 | #143  | Vitest + unit tests for src/lib                                                                             | infra    |        3h |    0.5h |  2.5h | Test scaffolding is template work.                                                                                                                                                                       |
| 2026-05-03 | #137  | Shareable view links + design lab status + phantom eligibility                                              | impl     |        6h |      1h |    5h |                                                                                                                                                                                                          |
| 2026-05-02 | #136  | /privacy page + site-wide transparency note                                                                 | impl     |        3h |    0.5h |  2.5h | Ran into Fraunces italic-axis self-hosting issue — added ~30 min of debugging that wasn't in the original scope.                                                                                         |

<!-- Add new rows at the top. Recompute the totals row when you add entries. -->

## Running totals (as of 2026-05-07)

|                    | Solo est. | With AI |     Saved |
| ------------------ | --------: | ------: | --------: |
| Tracked rows above |    52.25h |    8.6h |    43.65h |
| **Multiplier**     |           |         | **~6.1×** |

A 6× multiplier on the rows tracked here, but the more honest figure for _this entire project_ is much higher — there's a lot of work that wouldn't have happened at all solo (the whole audit pipeline, the Figma file, the full sources system) because the activation energy was too high. "Saved hours" undersells "made possible."

## Things AI cost time on (be honest)

- `resize()` vs `rescale()` confusion on Figma component instances — ~30 min of re-prompts and screenshot loops.
- A handful of "throw new Error to return data" attempts that rolled back the whole transaction silently.
- Occasional over-engineering — adding fallbacks or abstractions I had to ask to remove.
- Visual judgment loops (sticker spacing, pin balance) take 2-3 iterations even when the _intent_ is clear, because I have to describe what's off in words rather than just nudging it.
