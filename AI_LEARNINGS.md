# AI Learnings

A running journal of what working with AI on this project has actually been like — patterns that worked, traps to avoid, instincts that have shifted. Sister file to `AI_TIME_LOG.md`: that one is quantitative (hours per PR), this one is qualitative (what the hours felt like, and what I'd do differently).

The point is calibration over time. After 50+ entries the patterns become visible.

## Conventions

- **Append, don't curate.** Date each entry; let contradictions stand. Reading "I thought X in May, then I thought ¬X in July" is the actual learning.
- **One observation per entry.** Short is fine. A sentence is fine.
- **Be honest about misses too.** Times AI made things worse, times I should have just done it solo, times I over-trusted output.
- **Tag categories** in `[brackets]` when useful: `[trust]`, `[scope]`, `[tooling]`, `[process]`, `[skill]`, `[memory]`, etc. Free-form, no fixed taxonomy.

## Log

<!-- Newest entries at the top. -->

### 2026-05-07 — Some tasks are small enough to not use AI `[scope] [process]`

For small changes I could do in a few seconds of manual editing, I sometimes spent more time writing the prompt + waiting 2 minutes for processing than the change itself would have taken. The output was the exact single-line edit I'd already mentally drafted. AI has a fixed overhead per round-trip (prompt drafting + model latency + reading the response); below some change-size threshold, that overhead exceeds the change. Heuristic: if I can already see the diff in my head and it's <5 lines, just type it.

### 2026-05-07 — The multiplier may be skewed low because solo would also produce worse output `[trust]`

Asked whether the calibrated ~4× multiplier matched my gut. Answer: lower than expected, but maybe not — solo would have meant a lot of research and learning-while-doing, which is a huge time sink _and_ produces a less cohesive product (because the half-learning gets baked into the codebase as inconsistencies). The time log captures hours saved but can't capture the quality dimension: AI's leverage isn't just "Brian goes faster," it's "Brian doesn't have to half-learn five things at once and ship the half-learning as architecture."

### 2026-05-07 — Spot-correct beats fill-in-blank for backfill `[process]`

For the 22-PR time log backfill, Claude proposed estimates with confidence flags rather than asking 22 questions. Useful, "especially as memory fades." Convention going forward: when the user has to recall something fuzzy, lead with proposed numbers + uncertainty markers, not blank prompts. Recognition beats recall.

### 2026-05-07 — Letting AI prune branches felt good and scary `[trust] [scope]`

Deleted ~25 stale local + remote branches in one session, including 20 force-pushed `--delete`s. "Felt so nice but kinda scary. Did it haphazardly with this project because I knew most of my stuff was safe and linear." Caveat for future: in larger projects, with collaborators, or when juggling multiple in-flight things, the same blast-radius action would warrant a more curated pass — verify each branch's status, ask before bulk deletes. Project context determines whether "drop the bomb" is OK or a mistake.

### 2026-05-07 — Worktrees: great until they're not `[tooling]`

"One second I'm working in one directory, the next I'm making changes to the wrong version of the repo and wondering why nothing is changing for me on the app." The cwd-vs-main split is too easy to lose track of mid-task. Saved as a memory already (don't use worktrees unless asked). Open question for later: is there a project shape where worktrees actually pay rent here, or is single-checkout the permanent right answer?

### 2026-05-07 — Memory toggle was off and I didn't know `[memory] [meta]`

Realized late in the day: the in-product Claude Code memory feature wasn't toggled on. Unclear what that's affected. The file-based memory system Claude has been writing to (`~/.claude/projects/.../memory/`) is separate and gets loaded into context as system reminders at session start, so today's saves should be effective on next restart — but worth verifying explicitly on session resume rather than assuming. The "I'll save this to memory" moments don't always map to a single mechanism.

### 2026-05-07 — Compaction is a real throughput lever `[meta]`

End-of-session observation: "compact, compact, compact, or don't and hit your limit with 3 hours to sit around and do nothing." The auto-compact rhythm is the difference between continuing to work and burning quota waiting. No clean answer, just naming it — when sessions go long, compaction strategy starts mattering more than tool choice or model choice.

### 2026-05-07 — Worktree cleanup as a forcing function `[process]`

Accidentally deleted my Claude worktree and panicked about losing memory. Memory turned out to be in `~/.claude/` (separate from the worktree), so nothing was lost — but the panic itself surfaced that I'd been operating without a clear mental model of what's where. Worth knowing: memory is durable, worktrees are disposable, branches are recoverable via reflog. Don't overload one mechanism with assumptions about another.

### 2026-05-07 — Force-pushing my own feature branch is still a mistake `[process]`

Asked Claude to "get my branch up to date with main." It rebased and force-pushed (with-lease). My instinct: that's not how I want to work — squash-merge at PR close means the feature-branch history doesn't matter, so a merge commit is fine and a rewrite-and-force-push is friction with no upside. Saved as a memory; default going forward is `git merge main`.

### 2026-05-07 — Setting up the AI time log is itself the highest-leverage entry `[meta]`

Spent ~6 minutes scaffolding `AI_TIME_LOG.md`; would have spent ~45 minutes solo (designing the table, arguing with myself about columns, second-guessing the multiplier framing). The act of tracking AI savings is itself an AI-saved task. Recursion is healthy.

<!-- Add new entries above this line. -->

## Recurring patterns (rolling synthesis)

A periodically-rewritten distillation of the entries above. Not authoritative — entries are. This section is the cliff-notes a future-me can scan in 30 seconds.

- _9 entries — synthesis pending until ~15. Threads forming: trust calibration when AI takes destructive actions; the gap between "hours saved" and "quality of output"; memory/tooling-mechanism transparency; project-context-dependent risk tolerance._
