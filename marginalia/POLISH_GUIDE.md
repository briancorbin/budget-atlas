# Polish guide

Marginalia's polish slider has 5 snap points. Each level is a distinct
artifact. This document is the spec — anything ambiguous about how to
author a level lives here, gets debated here, and gets resolved here
rather than re-litigated in PR review.

This is a living document. When authoring surfaces an edge case the
guide doesn't cover, append to the **Iteration log** at the bottom
with date + the resolution. Don't silently re-interpret rules.

---

## Governing rules (apply at every level)

1. **Substance is always Brian's.** No level invents observations,
   claims, or framings he didn't make. Polish operates on existing
   substance, never adds it.
2. **Each level must read perceptibly different from its neighbors.**
   If a reader can't tell Light from Medium without a side-by-side
   diff, the spec failed.
3. **The slider is a transformation, not just a polish dial.** Content
   shape changes (prompts collapse into prose, journal entries get
   themed), not just smoothness.
4. **Raw is immutable after publish.** Light through Full can be
   revised.
5. **At Raw, `[Claude prompted: ...]` blocks are NEVER stripped.**

### Special-case: the Claude prompts

The `[Claude prompted: ...]` blocks fall **outside** the
human-substance-only rule because they're Claude's words, not Brian's.
They can be synthesized, tightened, or removed at higher polish
levels without violating the substance rule. But the synthesis itself
has guardrails (see Light below).

---

## The 5 levels

### Raw

**Editorial:**
- Brian's typed responses verbatim. No edits of any kind — preserve
  typos, lowercase sentence starts, run-ons, ellipses, all-caps
  emphasis, "uh", "lol", trailing thoughts.
- `[Claude prompted: ...]` blocks preserved in `<blockquote>` exactly
  as the prompts were given.
- Each prompt-then-answer is its own visual unit. Unprompted
  additions appear without a preceding blockquote.

**Field Notes:**
- AI_LEARNINGS journal entries verbatim, in chronological order.
- Each entry: bold date + title, optional `[tag]`s, body paragraph.
- No grouping, no headers beyond entry titles, no synthesis paragraphs.

**Aesthetic:** None added. Should look like a transcript.

**Acceptance:** Could a reader screenshot Raw and identify it as "raw
notes" without prior context?

---

### Light

**Editorial:**
- **Allowed:** typo fixes, capitalization (sentence starts, proper
  nouns: Claude, GitHub, Cloudflare, VS Code), hyphenation of compound
  words ("day to day" → "day-to-day"), straight quotes →
  typographic quotes for consistency.
- **Forbidden:** rephrasing of Brian's words, paragraph reordering,
  em-dashes for emphasis, italicized beats, bolded claims.
- **`[Claude prompted: ...]` blocks SYNTHESIZED but kept.** Distill
  each prompt to its operative question, drop the meta-framing
  ("Pick from a few options", "Posts live or die on this kind of
  detail", chatty asides). Same `[Claude prompted: ...]` formatting;
  shorter content. The reader sliding to Raw should recognize each
  Light prompt as a faithful tightening of the corresponding Raw
  prompt — same question, fewer words. **No clever rephrasing, no
  merging across prompts, no making the interviewer look sharper than
  they were.**
- Filler conversational openers ("So,", "Oh man", "Right so,")
  preserved. They're his voice.
- Paragraph breaks preserved as he wrote them; do not merge or split.

**Field Notes:**
- Same 18 entries (or whatever count the week produced), chronological
  order, with date headers (`### 2026-05-07`, `### 2026-05-08`).
- Entry format: bold lead phrase + body. Tags optional — keep if
  useful, drop if cluttered.
- No synthesis paragraphs.

**Aesthetic:** None added beyond date headers in Field Notes.

**Acceptance:** Could you produce this with copy-edit pencil marks on
Brian's printed-out raw text? If a change needs more than a pencil
mark, it doesn't belong here.

---

### Medium

**Editorial:**
- Light + paragraph assembly. Combine adjacent paragraphs that share
  a thought; keep his sentence-level wording.
- **Allowed:** light em-dash use to replace parenthetical commas,
  drop labels he typed for our context ("Why Now:", "Where that
  collided with this project."), light contractions ("I am" → "I'm"
  if surrounding sentences use contractions).
- **Forbidden:** restructuring across major sections, italicized
  one-liners, bolded claims, parallel-structure closers, "Not X — Y"
  rewrites.
- **`[Claude prompted: ...]` blocks REMOVED.** Brian's answers become
  continuous prose paragraphs. The transparency device persists at
  Light only.
- Filler openers: drop the most explicitly conversational ("Oh man",
  "oooooh good point") but keep his actual cadence ("Honestly,",
  "But the moment was when").

**Field Notes:**
- Same entries grouped by **primary tag** (one section per tag).
- Section headers are tag names only ("Trust", "Process", "Tooling",
  "Meta & memory", "Skill").
- No synthesis paragraphs. Entries within each section: bold lead +
  body.

**Aesthetic:** Em-dashes acceptable (1-2 per paragraph max). No
italics for emphasis. No bold for emphasis.

**Acceptance:** A reader who prefers prose to transcript should find
this readable end-to-end. A reader who came for editorial polish
should find it underbaked.

---

### Heavy

**Editorial:**
- Real essay structure. Reorder paragraphs for narrative flow (e.g.,
  bring the hook forward, push context to where it does work).
- **Allowed:** smoother transitions, light rephrasing for clarity,
  deletion of redundant phrases, consolidation of repeated points.
- **Forbidden:** italicized one-liners, bolded claims for emphasis,
  parallel-structure closers ("That's the X. Y is the Z."),
  standalone-italic beats.
- Em-dash density: moderate. Use them for clauses, not every
  parenthetical.

**Field Notes:**
- Same entries grouped by **theme** (not tag): "Trust & calibration",
  "Scope & process", "Tooling", "Meta & memory".
- Each section opens with **one italicized one-line throughline**
  ("AI's competence outpaces its judgment — calibrated trust
  contingent on context.") — no further synthesis.
- Entries within each section: bold lead + body.
- No opening framing paragraph. No "What I'm watching for" closer.

**Aesthetic:** Em-dashes for cadence (judiciously), italicized
throughlines in Field Notes only, no bold for emphasis.

**Acceptance:** A reader who wants "real essay" gets it; a reader
looking for editorial flourish (italicized beats, bolded pillars)
does not.

---

### Full

**Editorial:**
- Heavy + every editorial flourish.
- **Allowed and encouraged:** italicized one-liners as standalone
  paragraph beats (`<em>Meh, why not give it a shot.</em>`), bolded
  claims as load-bearing pillars (`<strong>Claude can be my intern.</strong>`),
  parallel-structure closers, "Not X — Y" negations, em-dashes for
  both clauses and emphasis, the full New Yorker editorial vocabulary.
- High-density polish. The reader should feel the editorial hand on
  every page.

**Field Notes:**
- Themed groups (same as Heavy).
- Opening framing paragraph above all sections.
- Per-section synthesis paragraph(s) before the entries — full
  editorial, not just a one-liner.
- "What I'm watching for" closing section with open questions.
- Entries themselves with bold leads.

**Aesthetic:** All of them. This is the "what an editor at The
Atlantic would publish" version.

**Acceptance:** Could a reader plausibly think this was edited by a
human professional editor?

---

## When in doubt

If a level transformation feels ambiguous, **err toward less** at the
lower levels and **less restrained** at Full. The slider should feel
like a real range, not five close-together polish settings.

---

## Iteration log

When authoring surfaces an edge case the guide doesn't cover, append
here with date + the resolution.

- **2026-05-09** — Initial guide drafted after Week 1 friend-feedback
  surfaced "AI slop" pattern recognition. Five levels, governing rules,
  per-level rules. Post 0 + Week 1 authored against the guide.
