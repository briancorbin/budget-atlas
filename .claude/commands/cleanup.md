---
description: Post-merge cleanup — confirm merge, sync develop, remove worktree/branch, capture memory + AI learnings
---

The user just merged a PR and is asking for cleanup. Run this end-to-end, but confirm before any destructive step.

## 1. Confirm the merge

- Identify the PR for the current branch: `gh pr list --head $(git branch --show-current) --state merged --json number,mergeCommit,mergedAt --jq '.[]'`
- If no merged PR is found, stop and tell the user — they may have meant something else by "cleanup."
- Check the remote branch — it's usually auto-deleted on merge: `git ls-remote --heads origin <branch>` (empty output = already deleted)

## 2. Sync the main checkout

- This session may be running inside a worktree under `.claude/worktrees/`. Worktrees can't be removed from inside themselves.
- The main checkout is at the repo root (e.g. `/Users/briancorbin/Documents/Programming/budget-atlas`). The user runs `git pull` there separately.
- Tell the user the exact commands they should run from the main checkout — don't try to run them yourself unless explicitly asked. Example:
  ```
  cd /Users/briancorbin/Documents/Programming/budget-atlas
  git checkout develop && git pull
  git worktree remove .claude/worktrees/<this-worktree-name>
  git branch -d <branch-name>
  ```
- Confirm with the user before suggesting `git branch -D` (force delete) — that's a destructive escape hatch only for unmerged work.

## 3. Capture AI learnings (per `feedback_offer_ai_learnings_capture.md`)

Ask an **open** question — never leading. Examples that work:

- "Anything from this session worth jotting down?"
- "What surprised you about how this went — good or bad?"

Things that don't work and shouldn't be asked:

- "Did the X moment frustrate you?" (suggests substance)
- "Was the Y refactor a good call?" (asks for ratification, not observation)
- Bulleted lists of guesses about what the user might say.

If the user offers substance, light copy-edit is fine. If they say "nothing," that's a complete answer — don't fish.

The user-substance, when captured, can land in two places:

- **Memory** (private; for shaping future Claude behavior on this project) — see step 4.
- **Marginalia field notes** (public; weekly editorial synthesis at marginalia.thebudgetatlas.com) — only if the user routes it there. Never propose substance for Marginalia; the "human substance only" rule is strict.

## 4. Memory update pass

This is the new addition — make it part of cleanup, not a separate ritual.

Scan the session for things that belong in the project's auto-memory directory (the path is in the auto-memory system instructions; don't hardcode it here — it's per-user). Offer concrete, specific suggestions — don't list memory categories abstractly, name the candidate entries.

Categories to scan, with examples of what would qualify:

- **`feedback`** — Did the user correct an approach? Affirm a non-obvious choice? ("Don't add a roadmap row per PR" was this kind of thing — captured as `feedback_roadmap_not_per_pr.md`.) Watch especially for _quiet affirmations_ — easy to miss vs. corrections.
- **`project`** — Did anything change about who's doing what / why / by when? PR statuses, ongoing initiatives, deadlines, decisions. Convert relative dates ("today") to absolute dates (YYYY-MM-DD) before saving.
- **`reference`** — Did a new external surface come up? Linear projects, Slack channels, Grafana boards, file paths in shared systems.
- **`user`** — Did you learn something new about the user's role, expertise, or working preferences? (Less common in established sessions.)

What NOT to save (per the auto-memory rules):

- Code patterns, conventions, or architecture derivable from reading the project state.
- Git history / who-changed-what (use `git log`/`git blame`).
- Debugging recipes (the fix is in the code; the commit message has the why).
- Anything already documented in CLAUDE.md.
- Ephemeral session state.

Update `session_recap.md` if relevant — that file's job is "in-motion items only" (recent PRs, in-flight work, deferred items). After a merge, the merged PR moves from in-flight to recent; bump it.

If MEMORY.md already has a stale entry that this session updates, edit in place rather than creating a new entry.

## 5. Wrap

State explicitly what was done and what the user still needs to do (the worktree commands they run from main checkout). Keep it under ~5 lines.
