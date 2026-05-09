import type { Post } from '../types';

// Polish levels per marginalia/POLISH_GUIDE.md.

// =============================================================================
// EDITORIAL — 5 polish levels
// =============================================================================

const EditorialRaw = () => (
  <>
    <blockquote>
      <p>
        [Claude prompted: What's the most "I would not have done this solo"
        moment? Pick from a few options or just the one that pulls hardest.]
      </p>
    </blockquote>
    <p>
      Oh man... the most i would not have done this solo moment.... Honestly,
      I don't think I had one? I am comfortable with all of the tools I'm
      using in this project on my own. Stronger with some (the actual
      programming side of things) and weaker in others (like figma and
      infrastructure stuff like cloudflare). But I've always been a pretty
      self driven person when it comes to aggressively learning new tools
      to achieve my goals.
    </p>
    <blockquote>
      <p>
        [Claude prompted: In AI_LEARNINGS the May 7 Figma entry says "the
        single biggest 'would not have existed at all solo' line item in
        the project." That's in tension with what you just said. Which is
        true? Or are both true and the framing matters?]
      </p>
    </blockquote>
    <p>
      oooooh good point. Yeah. I think the moment was when I realized how
      much FUCKING data I needed to 1. find 2. parse 3. document 4. keep
      up to date 5. verify 6... uh.... verify again?
    </p>
    <blockquote>
      <p>
        [Claude prompted: When you hit that realization, was it a "whoa,
        cool, AI can handle this" moment, or an "oh shit, this would have
        broken me solo" moment?]
      </p>
    </blockquote>
    <p>
      It was a bit of both? It was realizing the sad truth of "why doesn't
      this tool already exist?", which is "because it's a lot of fucking
      work to pull together", and also "yay, claude can be my intern and do
      the data processing and gathering while I work on coordinating
      features and infrastructure"
    </p>
    <p>
      I remember a previous passion project of mine from years ago where I
      needed to collect and sort through data. It was tedious. It took
      forever. It almost broke me. DAYS spent sifting through information,
      documenting it, creating tools to parse it. all for it to break when
      the formatting on a new piece was slightly different. claude took
      what would have taken me probably weeks to do (not even considering
      the fact of future maintenance) and turned it into, like, and
      afternoon of mostly just spot checking his findings and making sure
      he didn't go off the rails too hard. A lot of what I did was self
      research, feeding him docs that I found on government websites. I
      was able to focus on "what is the important stuff" and I could
      offload the "okay now do it and suffer"
    </p>
    <p>
      I actually DID get the project done. but it quickly became a relic
      of my past because it relied on NEW data to stay current, and that
      continued work was not something I was interested in doing.
    </p>
    <p>
      If I got to the point of having to organize that information myself?
      I would have quit. No doubt about it. My insatiable drive to create
      can only get me so far before manual data processing turns me into a
      lifeless husk with no will left to live.
    </p>
    <p>The intern thing wasn't uncomfortable at all! it was awesome!</p>
  </>
);

const EditorialLight = () => (
  <>
    <blockquote>
      <p>
        [Claude prompted: What's the most "I would not have done this solo"
        moment?]
      </p>
    </blockquote>
    <p>
      Oh man... the most "I would not have done this solo" moment...
      Honestly, I don't think I had one? I am comfortable with all of the
      tools I'm using in this project on my own. Stronger with some (the
      actual programming side of things) and weaker in others (like Figma
      and infrastructure stuff like Cloudflare). But I've always been a
      pretty self-driven person when it comes to aggressively learning new
      tools to achieve my goals.
    </p>
    <blockquote>
      <p>
        [Claude prompted: In AI_LEARNINGS the Figma entry says it's the
        single biggest "would not have existed at all solo" line item —
        that's in tension with what you just said. Which is true?]
      </p>
    </blockquote>
    <p>
      Oooooh good point. Yeah. I think the moment was when I realized how
      much FUCKING data I needed to 1. find 2. parse 3. document 4. keep
      up to date 5. verify 6... uh.... verify again?
    </p>
    <blockquote>
      <p>
        [Claude prompted: When you hit that realization — "whoa, cool, AI
        can handle this", or "oh shit, this would have broken me solo"?]
      </p>
    </blockquote>
    <p>
      It was a bit of both? It was realizing the sad truth of "why doesn't
      this tool already exist?", which is "because it's a lot of fucking
      work to pull together", and also "yay, Claude can be my intern and
      do the data processing and gathering while I work on coordinating
      features and infrastructure".
    </p>
    <p>
      I remember a previous passion project of mine from years ago where I
      needed to collect and sort through data. It was tedious. It took
      forever. It almost broke me. DAYS spent sifting through information,
      documenting it, creating tools to parse it. All for it to break when
      the formatting on a new piece was slightly different. Claude took
      what would have taken me probably weeks to do (not even considering
      the fact of future maintenance) and turned it into, like, an
      afternoon of mostly just spot-checking his findings and making sure
      he didn't go off the rails too hard. A lot of what I did was self
      research, feeding him docs that I found on government websites. I
      was able to focus on "what is the important stuff" and I could
      offload the "okay now do it and suffer".
    </p>
    <p>
      I actually DID get the project done. But it quickly became a relic
      of my past because it relied on NEW data to stay current, and that
      continued work was not something I was interested in doing.
    </p>
    <p>
      If I got to the point of having to organize that information myself?
      I would have quit. No doubt about it. My insatiable drive to create
      can only get me so far before manual data processing turns me into a
      lifeless husk with no will left to live.
    </p>
    <p>The intern thing wasn't uncomfortable at all! It was awesome!</p>
  </>
);

const EditorialMedium = () => (
  <>
    <p>
      The most "I would not have done this solo" moment? Honestly, I
      don't think I had one. I'm comfortable with all of the tools I'm
      using on this project — stronger with some (the actual programming
      side) and weaker in others (Figma, Cloudflare infrastructure
      stuff). But I've always been pretty self-driven when it comes to
      aggressively learning new tools to achieve my goals.
    </p>
    <p>
      But the moment WAS when I realized how much FUCKING data I needed
      to find, parse, document, keep up to date, verify, and verify
      again. It was a bit of both — the sad truth of "why doesn't this
      tool already exist?", which is "because it's a lot of fucking work
      to pull together", and also "yay, Claude can be my intern and do
      the data processing while I work on coordinating features and
      infrastructure."
    </p>
    <p>
      I remember a previous passion project from years ago where I
      needed to collect and sort through data. It was tedious. It took
      forever. It almost broke me. DAYS spent sifting through
      information, documenting it, creating tools to parse it — all for
      it to break when the formatting on a new piece was slightly
      different. Claude took what would have taken me probably weeks
      (not even considering future maintenance) and turned it into an
      afternoon of mostly just spot-checking his findings and making
      sure he didn't go off the rails too hard. A lot of what I did was
      self research, feeding him docs I found on government websites. I
      was able to focus on "what is the important stuff" and offload
      the "okay now do it and suffer."
    </p>
    <p>
      I actually DID get the project done. But it quickly became a
      relic of my past because it relied on NEW data to stay current,
      and that continued work was not something I was interested in
      doing.
    </p>
    <p>
      If I got to the point of having to organize that information
      myself? I would have quit. No doubt about it. My insatiable drive
      to create can only get me so far before manual data processing
      turns me into a lifeless husk with no will left to live.
    </p>
    <p>The intern thing wasn't uncomfortable at all. It was awesome.</p>
  </>
);

const EditorialHeavy = () => (
  <>
    <p>
      A few days into the Atlas, I had a moment. Not a "wow, look what
      AI can do" moment — a sad-truth moment. It was when I realized
      how much fucking data I needed to find, parse, document, keep up
      to date, verify, and then verify again. And the question that
      came right after: why doesn't this tool already exist?
    </p>
    <p>
      The answer was sitting in the same realization. Because it's a
      lot of fucking work to pull together. Not the building — the
      data. The plumbing. The boring, slow, error-prone, never-finished
      work of finding the right sources, parsing them into the right
      shapes, citing them honestly, and re-verifying when the
      underlying data shifts.
    </p>
    <p>
      I've felt that wall before. Years ago I had a passion project
      that required collecting and sorting through data. I actually got
      it done, but it quickly became a relic, because it relied on new
      data to stay current and that continued work wasn't something I
      was interested in doing. Days of sifting through information,
      documenting it, building tools to parse it — all for it to break
      when the formatting on a new piece was slightly different.
    </p>
    <p>
      The Atlas's data wall is bigger than that one was. Federal tax
      brackets. State tax brackets. FICA wage bases. SNAP eligibility
      with state-specific BBCE multipliers. Medicaid expansion vs.
      non-expansion. CHIP. EITC. CTC refundability. HHS poverty
      guidelines. Cost-of-living per city. CEX expenditure data per
      income quintile, geography, household size, and family
      composition. Every single number cited, kept current, re-checked
      when the source moves.
    </p>
    <p>
      If I'd had to organize all that information myself, I would have
      quit. No doubt about it. My insatiable drive to create can only
      get me so far before manual data processing turns me into a
      lifeless husk with no will left to live.
    </p>
    <p>
      What changed isn't that I got faster at programming. I'm not
      faster at programming. What changed is that Claude can be my
      intern. I do the self-research, find the right government source,
      feed him the docs, decide what's important. Claude does the "okay
      now do it and suffer" part. Weeks of parsing become an afternoon
      of spot-checking.
    </p>
    <p>
      Even my own time log undersells it. I track hours-with-AI vs.
      hours-solo-estimated on every PR, and looking back at the data
      PRs, the 3-hour solo estimates I logged are a pipe dream — easily
      a multi-day effort across all of them. Past-me, trying to be
      honest about what AI saved, was lowballing it.
    </p>
    <p>
      The division is real and it's load-bearing. Claude doesn't
      replace the discernment about which CEX series to use or whether
      to model SNAP gross-income tests. It replaces the suffering of
      executing the consequences of those decisions. And honestly,
      having an intern is just awesome.
    </p>
  </>
);

const EditorialFull = () => (
  <>
    <p>A few days into the Atlas, I had a moment.</p>
    <p>Not a "wow, look what AI can do" moment. A sad-truth moment.</p>
    <p>
      It was when I realized how much fucking data I needed to find,
      parse, document, keep up to date, verify, and then verify again.
      And the question that came right after:{' '}
      <em>Why doesn't this tool already exist?</em>
    </p>
    <p>
      The answer was sitting in the same realization.{' '}
      <strong>Because it's a lot of fucking work to pull together.</strong>{' '}
      Not the building — the data. The plumbing. The boring, slow,
      error-prone, never-finished work of finding the right sources,
      parsing them into the right shapes, citing them honestly, and
      re-verifying when the underlying data shifts.
    </p>
    <p>
      I've felt that wall before. Years ago I had a passion project
      that required collecting and sorting through data. I actually got
      it done — but it quickly became a relic, because it relied on
      new data to stay current, and that continued work wasn't
      something I was interested in doing. Days of sifting through
      information, documenting it, building tools to parse it — all
      for it to break when the formatting on a new piece was slightly
      different. I shipped. It became a relic.
    </p>
    <p>
      The Atlas's data wall is bigger than that one was. Federal tax
      brackets. State tax brackets — fifty of them, plus DC. FICA wage
      bases. Standard deductions per filing status per year. SNAP
      eligibility thresholds with state-specific BBCE multipliers.
      Medicaid expansion vs. non-expansion plus per-state FPL
      multipliers. CHIP. EITC phase-in / plateau / phase-out. CTC
      refundability. HHS poverty guidelines. Cost-of-living data per
      city. CEX expenditure data per income quintile, geography,
      household size, and family composition. Every single number
      cited, kept current, re-checked when the source moves.
    </p>
    <p>
      Honestly? If I'd had to organize all that information myself, I
      would have quit. No doubt about it. My insatiable drive to create
      can only get me so far before manual data processing turns me
      into a lifeless husk with no will left to live.
    </p>
    <p>
      What changed isn't that I got faster at programming. I'm not
      faster at programming. What changed is that{' '}
      <strong>Claude can be my intern.</strong> I do the self-research.
      I find the right government source. I feed it the docs. I decide
      what's important. Claude does the{' '}
      <em>"okay now do it and suffer"</em> part. Weeks of parsing
      become an afternoon of spot-checking.
    </p>
    <p>
      Even my own time log undersells it. I track hours-with-AI vs.
      hours-solo-estimated on every PR. Looking back at the data PRs,
      the 3-hour solo estimates I logged are a pipe dream — easily a
      multi-day effort across all of them. Past-me, trying to be
      honest about what AI saved, was lowballing it.
    </p>
    <p>
      The division is real and it's load-bearing. Claude doesn't
      replace the discernment about which CEX series to use or whether
      to model SNAP gross-income tests. It replaces the{' '}
      <em>suffering</em> of executing the consequences of those
      decisions.
    </p>
    <p>And honestly, having an intern is just awesome.</p>
  </>
);

// =============================================================================
// FIELD NOTES — 5 polish levels
// =============================================================================

const FieldNotesRaw = () => (
  <>
    <p>
      <strong>2026-05-07 — Setting up the AI time log is itself the highest-leverage entry [meta]</strong>
      <br />
      Spent ~6 minutes scaffolding <code>AI_TIME_LOG.md</code>; would have spent ~45 minutes solo (designing the table, arguing with myself about columns, second-guessing the multiplier framing). The act of tracking AI savings is itself an AI-saved task. Recursion is healthy.
    </p>
    <p>
      <strong>2026-05-07 — Force-pushing my own feature branch is still a mistake [process]</strong>
      <br />
      Asked Claude to "get my branch up to date with main." It rebased and force-pushed (with-lease). My instinct: that's not how I want to work — squash-merge at PR close means the feature-branch history doesn't matter, so a merge commit is fine and a rewrite-and-force-push is friction with no upside. Saved as a memory; default going forward is <code>git merge main</code>.
    </p>
    <p>
      <strong>2026-05-07 — Worktree cleanup as a forcing function [process]</strong>
      <br />
      Accidentally deleted my Claude worktree and panicked about losing memory. Memory turned out to be in <code>~/.claude/</code> (separate from the worktree), so nothing was lost — but the panic itself surfaced that I'd been operating without a clear mental model of what's where. Worth knowing: memory is durable, worktrees are disposable, branches are recoverable via reflog.
    </p>
    <p>
      <strong>2026-05-07 — Compaction is a real throughput lever [meta]</strong>
      <br />
      End-of-session observation: "compact, compact, compact, or don't and hit your limit with 3 hours to sit around and do nothing." The auto-compact rhythm is the difference between continuing to work and burning quota waiting.
    </p>
    <p>
      <strong>2026-05-07 — Memory toggle was off and I didn't know [memory] [meta]</strong>
      <br />
      Realized late in the day: the in-product Claude Code memory feature wasn't toggled on. The file-based memory system Claude has been writing to (<code>~/.claude/projects/.../memory/</code>) is separate and gets loaded into context as system reminders at session start, so today's saves should be effective on next restart — but worth verifying explicitly on session resume.
    </p>
    <p>
      <strong>2026-05-07 — Worktrees: great until they're not [tooling]</strong>
      <br />
      "One second I'm working in one directory, the next I'm making changes to the wrong version of the repo and wondering why nothing is changing for me on the app." The cwd-vs-main split is too easy to lose track of mid-task. Saved as a memory already.
    </p>
    <p>
      <strong>2026-05-07 — Letting AI prune branches felt good and scary [trust] [scope]</strong>
      <br />
      Deleted ~25 stale local + remote branches in one session, including 20 force-pushed <code>--delete</code>s. "Felt so nice but kinda scary. Did it haphazardly with this project because I knew most of my stuff was safe and linear." Caveat for future: in larger projects, with collaborators, the same blast-radius action would warrant a more curated pass.
    </p>
    <p>
      <strong>2026-05-07 — Spot-correct beats fill-in-blank for backfill [process]</strong>
      <br />
      For the 22-PR time log backfill, Claude proposed estimates with confidence flags rather than asking 22 questions. Useful, "especially as memory fades." Convention going forward: when the user has to recall something fuzzy, lead with proposed numbers + uncertainty markers, not blank prompts. Recognition beats recall.
    </p>
    <p>
      <strong>2026-05-07 — The multiplier may be skewed low because solo would also produce worse output [trust]</strong>
      <br />
      Asked whether the calibrated ~4× multiplier matched my gut. Lower than expected, but maybe not — solo would have meant a lot of research and learning-while-doing, which is a huge time sink and produces a less cohesive product. The time log captures hours saved but can't capture the quality dimension.
    </p>
    <p>
      <strong>2026-05-07 — Some tasks are small enough to not use AI [scope] [process]</strong>
      <br />
      For small changes I could do in a few seconds of manual editing, I sometimes spent more time writing the prompt + waiting 2 minutes for processing than the change itself would have taken. Heuristic: if I can already see the diff in my head and it's &lt;5 lines, just type it.
    </p>
    <p>
      <strong>2026-05-07 — Figma is where AI made the impossible possible [skill] [tooling]</strong>
      <br />
      I am not a professional designer. I know basics, but I'm slow, I make mistakes, and I don't organize well because I don't live in Figma every day. Claude made the impossible possible here. The Figma file — Atlas Tokens, text styles, component variants, the swag explorations, the brand mark and lockups — would not exist in this shape without AI. The plugin API is gnarly, but Claude knows the patterns and the iteration loop is fast: screenshot → eval → tweak. This is the single biggest "would not have existed at all solo" line item in the project.
    </p>
    <p>
      <strong>2026-05-08 — Take notes after every day of work, don't wait until morning</strong>
      <br />
      Lesson learned. My memory is fuzzy now. Maybe I'm just tired though.
    </p>
    <p>
      <strong>2026-05-08 — Data import + sifting is where multi-day work collapses to hours [skill] [time-log]</strong>
      <br />
      This would have taken an enormous amount of time on my own. Getting this information imported. Sorting through it. Checking it. The 3-hour solo estimates I logged on these PRs are a pipe dream — this was easily a multi-day effort across all of these PRs and files. AI is incredible at sifting through, sorting, and organizing data intelligently.
    </p>
    <p>
      <strong>2026-05-08 — Scripts beat AI memory for repeated workflows [process] [tooling]</strong>
      <br />
      When you want to accomplish something repeatedly — say, spawning a new worktree and symlinking memory, node_modules, and builds — create scripts where possible instead of relying on AI to remember to do these things on its own. AI drifts over time, and simplifying a big complex query into "run X script when Y happens" is easier to manage and maintain.
    </p>
    <p>
      <strong>2026-05-08 — Claude REALLY likes backwards compatibility — gently (aggressively) push back [trust] [process]</strong>
      <br />
      Claude defaults to optional fields, fallback paths, and "preserve legacy behavior" shims — even when the codebase has no external consumers. Push back when you see one.
    </p>
    <p>
      <strong>2026-05-08 — AI wall-clock time ≠ time saved from doing it on my own [time-log] [calibration]</strong>
      <br />
      How long it took the AI to do the task is not equivalent to how much time it saved me from doing it on my own. It might take 30 minutes to do the thing, but I may have only spent 5 minutes with it manually going through design and PR reviews.
    </p>
    <p>
      <strong>2026-05-08 — Leaving Claude alone with a task is kind of awesome, actually [autonomy] [scope-setting]</strong>
      <br />
      Works WAY better when seeded with as much explicit direction as possible. Much less so otherwise.
    </p>
    <p>
      <strong>2026-05-08 — AI traced a thread down and back up super effectively, surfacing a model-honesty gap [trust] [audit]</strong>
      <br />
      AI helped me trace a thread down and back up super effectively, leading to the surfacing of a model-honesty gap.
    </p>
  </>
);

const FieldNotesLight = () => (
  <>
    <h3>2026-05-07</h3>
    <p>
      <strong>Setting up the AI time log is itself the highest-leverage entry.</strong> Spent ~6 minutes scaffolding <code>AI_TIME_LOG.md</code>; would have spent ~45 minutes solo. The act of tracking AI savings is itself an AI-saved task. Recursion is healthy.
    </p>
    <p>
      <strong>Force-pushing my own feature branch is still a mistake.</strong> Asked Claude to "get my branch up to date with main." It rebased and force-pushed (with-lease). Squash-merge at PR close means the feature-branch history doesn't matter, so a merge commit is fine and a rewrite-and-force-push is friction with no upside. Default going forward: <code>git merge main</code>.
    </p>
    <p>
      <strong>Worktree cleanup as a forcing function.</strong> Accidentally deleted my Claude worktree and panicked about losing memory. Memory was in <code>~/.claude/</code>, so nothing was lost — but the panic surfaced that I'd been operating without a clear mental model of what's where. Memory is durable, worktrees are disposable, branches are recoverable via reflog.
    </p>
    <p>
      <strong>Compaction is a real throughput lever.</strong> "Compact, compact, compact, or don't and hit your limit with 3 hours to sit around and do nothing."
    </p>
    <p>
      <strong>Memory toggle was off and I didn't know.</strong> The in-product Claude Code memory feature wasn't toggled on. The file-based memory system is separate and gets loaded into context as system reminders at session start. Worth verifying explicitly on session resume.
    </p>
    <p>
      <strong>Worktrees: great until they're not.</strong> "One second I'm working in one directory, the next I'm making changes to the wrong version of the repo." The cwd-vs-main split is too easy to lose track of mid-task.
    </p>
    <p>
      <strong>Letting AI prune branches felt good and scary.</strong> Deleted ~25 stale local + remote branches in one session, including 20 force-pushed <code>--delete</code>s. Felt so nice but kinda scary. Did it haphazardly with this project because I knew most of my stuff was safe and linear. In a larger project the same blast-radius action would warrant a more curated pass.
    </p>
    <p>
      <strong>Spot-correct beats fill-in-blank for backfill.</strong> For the 22-PR time log backfill, Claude proposed estimates with confidence flags rather than asking 22 questions. When the user has to recall something fuzzy, lead with proposed numbers + uncertainty markers. Recognition beats recall.
    </p>
    <p>
      <strong>The multiplier may be skewed low because solo would also produce worse output.</strong> Asked whether the calibrated ~4× multiplier matched my gut. Lower than expected, but maybe not — solo would have meant a lot of research and learning-while-doing, which is a huge time sink and produces a less cohesive product. The time log captures hours saved but can't capture the quality dimension.
    </p>
    <p>
      <strong>Some tasks are small enough to not use AI.</strong> For small changes I could do in a few seconds, I sometimes spent more time writing the prompt + waiting than the change itself would have taken. Heuristic: if I can already see the diff in my head and it's &lt;5 lines, just type it.
    </p>
    <p>
      <strong>Figma is where AI made the impossible possible.</strong> I am not a professional designer. The Figma file — Atlas Tokens, text styles, component variants, the swag explorations, the brand mark and lockups — would not exist in this shape without AI. The plugin API is gnarly, but Claude knows the patterns and the iteration loop is fast: screenshot → eval → tweak. The single biggest "would not have existed at all solo" line item in the project.
    </p>

    <h3>2026-05-08</h3>
    <p>
      <strong>Take notes after every day of work, don't wait until morning.</strong> Lesson learned. My memory is fuzzy now. Maybe I'm just tired though.
    </p>
    <p>
      <strong>Data import + sifting is where multi-day work collapses to hours.</strong> This would have taken an enormous amount of time on my own. Getting this information imported, sorting through it, checking it. The 3-hour solo estimates I logged on these PRs are a pipe dream — this was easily a multi-day effort across all of them. AI is incredible at sifting through, sorting, and organizing data intelligently.
    </p>
    <p>
      <strong>Scripts beat AI memory for repeated workflows.</strong> When you want to accomplish something repeatedly, create scripts instead of relying on AI to remember. AI drifts over time; "run X script when Y happens" is easier to manage and maintain.
    </p>
    <p>
      <strong>Claude REALLY likes backwards compatibility — gently (aggressively) push back.</strong> Claude defaults to optional fields, fallback paths, and "preserve legacy behavior" shims — even when the codebase has no external consumers. Push back when you see one.
    </p>
    <p>
      <strong>AI wall-clock time ≠ time saved from doing it on my own.</strong> It might take 30 minutes for AI to do the thing, but I may have only spent 5 minutes with it manually going through design and PR reviews.
    </p>
    <p>
      <strong>Leaving Claude alone with a task is kind of awesome, actually.</strong> Works WAY better when seeded with as much explicit direction as possible. Much less so otherwise.
    </p>
    <p>
      <strong>AI traced a thread down and back up super effectively, surfacing a model-honesty gap.</strong> AI helped me trace a thread down and back up super effectively, leading to the surfacing of a model-honesty gap.
    </p>
  </>
);

const FieldNotesMedium = () => (
  <>
    <h3>Trust</h3>
    <p>
      <strong>Letting AI prune branches felt good and scary.</strong> Deleted ~25 stale local + remote branches in one session, including 20 force-pushed <code>--delete</code>s. Felt so nice but kinda scary. Did it haphazardly with this project because I knew most of my stuff was safe and linear. In a larger project the same blast-radius action would warrant a more curated pass.
    </p>
    <p>
      <strong>Claude REALLY likes backwards compatibility — gently (aggressively) push back.</strong> Claude defaults to optional fields, fallback paths, and "preserve legacy behavior" shims — even when the codebase has no external consumers. Push back when you see one.
    </p>
    <p>
      <strong>The multiplier may be skewed low because solo would also produce worse output.</strong> Asked whether the calibrated ~4× multiplier matched my gut. Lower than expected, but maybe not — solo would have meant a lot of research and learning-while-doing, which is a huge time sink and produces a less cohesive product. The time log captures hours saved but can't capture the quality dimension.
    </p>
    <p>
      <strong>AI traced a thread down and back up super effectively, surfacing a model-honesty gap.</strong> AI helped me trace a thread down and back up super effectively, leading to the surfacing of a model-honesty gap.
    </p>

    <h3>Process</h3>
    <p>
      <strong>Force-pushing my own feature branch is still a mistake.</strong> Asked Claude to "get my branch up to date with main." It rebased and force-pushed (with-lease). Squash-merge at PR close means the feature-branch history doesn't matter, so a merge commit is fine. Default going forward: <code>git merge main</code>.
    </p>
    <p>
      <strong>Spot-correct beats fill-in-blank for backfill.</strong> For the 22-PR time log backfill, Claude proposed estimates with confidence flags rather than asking 22 questions. Lead with proposed numbers + uncertainty markers. Recognition beats recall.
    </p>
    <p>
      <strong>Some tasks are small enough to not use AI.</strong> If I can already see the diff in my head and it's &lt;5 lines, just type it.
    </p>
    <p>
      <strong>Leaving Claude alone with a task is kind of awesome, actually.</strong> Works WAY better when seeded with as much explicit direction as possible. Much less so otherwise.
    </p>

    <h3>Tooling</h3>
    <p>
      <strong>Figma is where AI made the impossible possible.</strong> I am not a professional designer. The Figma file would not exist in this shape without AI. The plugin API is gnarly, but Claude knows the patterns and the iteration loop is fast: screenshot → eval → tweak. The single biggest "would not have existed at all solo" line item.
    </p>
    <p>
      <strong>Worktrees: great until they're not.</strong> "One second I'm working in one directory, the next I'm making changes to the wrong version of the repo." The cwd-vs-main split is too easy to lose track of mid-task.
    </p>
    <p>
      <strong>Scripts beat AI memory for repeated workflows.</strong> Create scripts instead of relying on AI to remember. AI drifts over time; "run X script when Y happens" is easier to manage.
    </p>

    <h3>Meta &amp; memory</h3>
    <p>
      <strong>Setting up the AI time log is itself the highest-leverage entry.</strong> Spent ~6 minutes scaffolding <code>AI_TIME_LOG.md</code>; would have spent ~45 minutes solo. The act of tracking AI savings is itself an AI-saved task.
    </p>
    <p>
      <strong>Compaction is a real throughput lever.</strong> "Compact, compact, compact, or don't and hit your limit with 3 hours to sit around and do nothing."
    </p>
    <p>
      <strong>Memory toggle was off and I didn't know.</strong> The in-product Claude Code memory feature wasn't toggled on. The file-based memory system is separate. Worth verifying explicitly on session resume.
    </p>
    <p>
      <strong>AI wall-clock time ≠ time saved from doing it on my own.</strong> It might take 30 minutes for AI to do the thing, but I may have only spent 5 minutes with it.
    </p>
    <p>
      <strong>Worktree cleanup as a forcing function.</strong> Accidentally deleted my Claude worktree and panicked about losing memory. Memory was in <code>~/.claude/</code>, separate from the worktree. Memory is durable, worktrees are disposable, branches are recoverable via reflog.
    </p>
    <p>
      <strong>Take notes after every day of work, don't wait until morning.</strong> Lesson learned. My memory is fuzzy now. Maybe I'm just tired though.
    </p>

    <h3>Skill</h3>
    <p>
      <strong>Data import + sifting is where multi-day work collapses to hours.</strong> This would have taken an enormous amount of time on my own. The 3-hour solo estimates I logged on these PRs are a pipe dream — easily a multi-day effort across all of them. AI is incredible at sifting through, sorting, and organizing data intelligently.
    </p>
  </>
);

const FieldNotesHeavy = () => (
  <>
    <h3>Trust &amp; calibration</h3>
    <p>
      <em>AI's competence outpaces its judgment — calibrated trust contingent on context.</em>
    </p>
    <p>
      <strong>Letting AI prune branches felt good and scary.</strong> Deleted ~25 stale local + remote branches in one session, including 20 force-pushed <code>--delete</code>s. Felt so nice but kinda scary. Did it haphazardly with this project because I knew most of my stuff was safe and linear. In a larger project the same blast-radius action would warrant a more curated pass.
    </p>
    <p>
      <strong>Claude REALLY likes backwards compatibility — gently (aggressively) push back.</strong> Claude defaults to optional fields, fallback paths, and "preserve legacy behavior" shims — even when the codebase has no external consumers. Push back when you see one.
    </p>
    <p>
      <strong>The multiplier may be skewed low because solo would also produce worse output.</strong> Lower than expected, but maybe not — solo would have meant a lot of research and learning-while-doing, which is a huge time sink and produces a less cohesive product. The time log captures hours saved but can't capture the quality dimension.
    </p>
    <p>
      <strong>AI traced a thread down and back up super effectively, surfacing a model-honesty gap.</strong> AI helped me trace a thread down and back up, leading to the surfacing of a model-honesty gap.
    </p>

    <h3>Scope &amp; process</h3>
    <p>
      <em>AI has fixed overhead per round-trip — match the tool to the task.</em>
    </p>
    <p>
      <strong>Some tasks are small enough to not use AI.</strong> If I can already see the diff in my head and it's &lt;5 lines, just type it.
    </p>
    <p>
      <strong>Spot-correct beats fill-in-blank for backfill.</strong> For the 22-PR time log backfill, Claude proposed estimates with confidence flags rather than asking 22 questions. Lead with proposed numbers + uncertainty markers. Recognition beats recall.
    </p>
    <p>
      <strong>Force-pushing my own feature branch is still a mistake.</strong> Asked Claude to "get my branch up to date with main." It rebased and force-pushed. Default going forward: <code>git merge main</code>.
    </p>
    <p>
      <strong>Leaving Claude alone with a task is kind of awesome, actually.</strong> Works WAY better when seeded with as much explicit direction as possible.
    </p>

    <h3>Tooling</h3>
    <p>
      <em>AI shines where the iteration loop is fast and scope is bounded.</em>
    </p>
    <p>
      <strong>Figma is where AI made the impossible possible.</strong> I am not a professional designer. The Figma file would not exist in this shape without AI. The plugin API is gnarly, but Claude knows the patterns and the iteration loop is fast: screenshot → eval → tweak. The single biggest "would not have existed at all solo" line item.
    </p>
    <p>
      <strong>Worktrees: great until they're not.</strong> "One second I'm working in one directory, the next I'm making changes to the wrong version of the repo." The cwd-vs-main split is too easy to lose track of mid-task.
    </p>
    <p>
      <strong>Scripts beat AI memory for repeated workflows.</strong> Create scripts instead of relying on AI to remember. AI drifts over time; "run X script when Y happens" is easier to manage.
    </p>

    <h3>Meta &amp; memory</h3>
    <p>
      <em>The system around the AI matters as much as the AI itself.</em>
    </p>
    <p>
      <strong>Setting up the AI time log is itself the highest-leverage entry.</strong> Spent ~6 minutes scaffolding <code>AI_TIME_LOG.md</code>; would have spent ~45 minutes solo. The act of tracking AI savings is itself an AI-saved task.
    </p>
    <p>
      <strong>Compaction is a real throughput lever.</strong> "Compact, compact, compact, or don't and hit your limit with 3 hours to sit around and do nothing."
    </p>
    <p>
      <strong>Memory toggle was off and I didn't know.</strong> The in-product Claude Code memory feature wasn't toggled on. The file-based memory system is separate. Worth verifying explicitly on session resume.
    </p>
    <p>
      <strong>AI wall-clock time ≠ time saved from doing it on my own.</strong> It might take 30 minutes for AI to do the thing, but I may have only spent 5 minutes with it.
    </p>
    <p>
      <strong>Worktree cleanup as a forcing function.</strong> Accidentally deleted my Claude worktree and panicked about losing memory. Memory is durable, worktrees are disposable, branches are recoverable via reflog.
    </p>
    <p>
      <strong>Take notes after every day of work, don't wait until morning.</strong> Lesson learned. My memory is fuzzy now. Maybe I'm just tired though.
    </p>
    <p>
      <strong>Data import + sifting is where multi-day work collapses to hours.</strong> The 3-hour solo estimates I logged on these PRs are a pipe dream — easily a multi-day effort across all of them. AI is incredible at sifting through, sorting, and organizing data intelligently.
    </p>
  </>
);

const FieldNotesFull = () => (
  <>
    <p>
      Roughly a week of entries in. They cluster around a recognizable
      shape: AI is competent, calibration is the load-bearing human
      skill, and the system <em>around</em> the AI matters as much as
      the AI itself. The recurring failure mode isn't AI being bad at
      things — it's me failing to put the right scaffolding around it,
      or failing to push back when the output is competent but the{' '}
      <em>choice</em> was wrong.
    </p>

    <h3>Trust &amp; calibration</h3>
    <p>
      The throughline is uncomfortable:{' '}
      <strong>
        AI's competence outpaces its judgment, and that's the
        calibration problem.
      </strong>{' '}
      Claude can rebase-and-force-push correctly. Claude can write
      backwards-compat shims correctly. The output is right; the choice
      was wrong. My job stops being writing code and becomes
      adjudicating intent — which is harder, not easier, because
      incorrect output you can fix while correct-but-misframed output
      is the kind of thing that ships.
    </p>
    <p>
      The branch-prune entry sharpens this: I let Claude do something
      destructive specifically <em>because I knew the project's blast
      radius was small</em>. That's the actual model — calibrated trust
      contingent on context, not blanket trust or blanket suspicion.
    </p>
    <p>
      <strong>Letting AI prune branches felt good and scary.</strong>{' '}
      Deleted ~25 stale local + remote branches in one session,
      including 20 force-pushed <code>--delete</code>s. Felt so nice
      but kinda scary. Did it haphazardly with this project because I
      knew most of my stuff was safe and linear. In a larger project,
      with collaborators, the same blast-radius action would warrant a
      more curated pass — verify each branch's status, ask before bulk
      deletes. Project context determines whether "drop the bomb" is
      OK or a mistake.
    </p>
    <p>
      <strong>
        Claude REALLY likes backwards compatibility — gently
        (aggressively) push back.
      </strong>{' '}
      Claude defaults to optional fields, fallback paths, and
      "preserve legacy behavior" shims — even when the codebase has no
      external consumers. Push back when you see one.
    </p>
    <p>
      <strong>
        The multiplier may be skewed low because solo would also
        produce worse output.
      </strong>{' '}
      Asked whether the calibrated ~4× multiplier matched my gut.
      Lower than expected, but maybe not — solo would have meant a lot
      of research and learning-while-doing, which is a huge time sink{' '}
      <em>and</em> produces a less cohesive product, because the
      half-learning gets baked into the codebase as inconsistencies.
      The time log captures hours saved but can't capture the quality
      dimension.
    </p>
    <p>
      <strong>
        AI traced a thread down and back up super effectively,
        surfacing a model-honesty gap.
      </strong>{' '}
      AI helped me trace a thread down and back up super effectively,
      leading to the surfacing of a model-honesty gap.
    </p>

    <h3>Scope &amp; process</h3>
    <p>
      Two patterns rhyme here:{' '}
      <strong>
        AI has fixed overhead per round-trip, and it pays best when
        scope is bounded enough for the tool to stay on rails but big
        enough to clear the overhead.
      </strong>{' '}
      Below the floor (small inline edits), the prompt-write + wait
      time exceeds the change. Above the ceiling (open-ended drift),
      Claude needs explicit direction to not wander.
    </p>
    <p>
      Spot-correct-beats-fill-in-blank is the same insight from a
      different angle: humans recognize faster than they recall, and
      AI generating-then-asking-for-correction matches that asymmetry.
      It's also the implicit pattern in how this very post got drafted
      — Claude drafts, I push back, the draft tightens.
    </p>
    <p>
      <strong>Some tasks are small enough to not use AI.</strong> For
      small changes I could do in a few seconds of manual editing, I
      sometimes spent more time writing the prompt + waiting 2 minutes
      for processing than the change itself would have taken.
      Heuristic: if I can already see the diff in my head and it's
      &lt;5 lines, just type it.
    </p>
    <p>
      <strong>Spot-correct beats fill-in-blank for backfill.</strong>{' '}
      For the 22-PR time log backfill, Claude proposed estimates with
      confidence flags rather than asking 22 questions. When the user
      has to recall something fuzzy, lead with proposed numbers +
      uncertainty markers, not blank prompts. Recognition beats
      recall.
    </p>
    <p>
      <strong>Force-pushing my own feature branch is still a mistake.</strong>{' '}
      Asked Claude to "get my branch up to date with main." It rebased
      and force-pushed (with-lease). Not how I want to work —
      squash-merge at PR close means the feature-branch history
      doesn't matter, so a merge commit is fine and a rewrite-and-force-push
      is friction with no upside. Default going forward:{' '}
      <code>git merge main</code>.
    </p>
    <p>
      <strong>
        Leaving Claude alone with a task is kind of awesome, actually.
      </strong>{' '}
      Works WAY better when seeded with as much explicit direction as
      possible. Much less so otherwise.
    </p>

    <h3>Tooling</h3>
    <p>
      The tooling entries split cleanly into "fast iteration loop,
      bounded scope, AI shines" (Figma, scripts) and "tool whose mental
      model spans contexts, AI doesn't save you" (worktrees). Figma is
      the one that actually opens new capability — not "I can do design
      faster" but "I can do design at all, well." Worktrees are the
      reminder that AI's leverage doesn't help if the underlying
      human-tool relationship is broken — Claude can drive worktrees
      competently and I'll still get lost in which checkout I'm in.
    </p>
    <p>
      <strong>Figma is where AI made the impossible possible.</strong>{' '}
      I am not a professional designer. I know basics, but I'm slow, I
      make mistakes, and I don't organize well because I don't live in
      Figma every day. The Figma file — Atlas Tokens, text styles,
      component variants, the swag explorations, the brand mark and
      lockups — would not exist in this shape without AI. The plugin
      API is gnarly (variable axes can't be set, skew decomposes to
      scale+rotation, text sizing has to be set on both axes), but
      Claude knows the patterns and the iteration loop is fast:
      screenshot → eval → tweak.
    </p>
    <p>
      <strong>Worktrees: great until they're not.</strong> "One second
      I'm working in one directory, the next I'm making changes to the
      wrong version of the repo and wondering why nothing is changing
      for me on the app." The cwd-vs-main split is too easy to lose
      track of mid-task. Single-checkout for now; open question
      whether worktrees ever pay rent here.
    </p>
    <p>
      <strong>Scripts beat AI memory for repeated workflows.</strong>{' '}
      When you want to accomplish something repeatedly — say, spawning
      a new worktree and symlinking memory, node_modules, and builds —
      create scripts instead of relying on AI to remember. AI drifts
      over time; "run X script when Y happens" is easier to manage
      and maintain.
    </p>

    <h3>Meta &amp; memory</h3>
    <p>
      The most recursive cluster of the week.{' '}
      <strong>
        The system around AI matters as much as the AI
      </strong>{' '}
      — time log, compaction rhythm, where memory lives, what scripts
      exist for repeated workflows. Setting up the time log was{' '}
      <em>itself</em> AI-saved work. Tracking AI's leverage is
      leverage.
    </p>
    <p>
      The "memory toggle was off" entry is in some ways the loudest —
      it surfaces that there are <em>multiple</em> mechanisms of state
      in this stack (in-product memory, file-based memory, session
      context, journal files, project memory), and the failure mode
      isn't any one of them. It's not having a clean mental model of
      which is which.
    </p>
    <p>
      <strong>
        Setting up the AI time log is itself the highest-leverage
        entry.
      </strong>{' '}
      Spent ~6 minutes scaffolding <code>AI_TIME_LOG.md</code>; would
      have spent ~45 minutes solo. The act of tracking AI savings is
      itself an AI-saved task. Recursion is healthy.
    </p>
    <p>
      <strong>Compaction is a real throughput lever.</strong>{' '}
      "Compact, compact, compact, or don't and hit your limit with 3
      hours to sit around and do nothing." When sessions go long,
      compaction strategy starts mattering more than tool choice or
      model choice.
    </p>
    <p>
      <strong>Memory toggle was off and I didn't know.</strong> The
      in-product Claude Code memory feature wasn't toggled on. Unclear
      what that's affected. The file-based memory system is separate
      and gets loaded into context as system reminders at session
      start. The "I'll save this to memory" moments don't always map
      to a single mechanism.
    </p>
    <p>
      <strong>
        AI wall-clock time ≠ time saved from doing it on my own.
      </strong>{' '}
      It might take 30 minutes for AI to do the thing, but I may have
      only spent 5 minutes with it manually going through design and
      PR reviews.
    </p>
    <p>
      <strong>Worktree cleanup as a forcing function.</strong>{' '}
      Accidentally deleted my Claude worktree and panicked about
      losing memory. Memory turned out to be in <code>~/.claude/</code>{' '}
      (separate from the worktree), so nothing was lost — but the
      panic surfaced that I'd been operating without a clear mental
      model of what's where. Memory is durable, worktrees are
      disposable, branches are recoverable via reflog.
    </p>
    <p>
      <strong>
        Take notes after every day of work, don't wait until morning.
      </strong>{' '}
      Lesson learned. My memory is fuzzy now. Maybe I'm just tired
      though.
    </p>

    <h3>What I'm watching for</h3>
    <p>
      A few tensions this week surfaced that I don't have answers to
      yet:
    </p>
    <ul>
      <li>
        <strong>When to leave Claude alone vs. supervise?</strong>{' '}
        "Leaving Claude alone is awesome" and "Force-push was a
        mistake" and "Backwards-compat reflex" all live in the same
        week. The first one says give it room; the others say watch
        closely. The reconciliation is probably "leave it alone for
        bounded execution; supervise for choices that have downstream
        irreversibility" — but that needs more entries to confirm.
      </li>
      <li>
        <strong>
          Is the calibration-from-context heuristic exportable?
        </strong>{' '}
        The branch-prune call worked because I knew this project. In
        larger / collaborative / unfamiliar projects, the same
        instinct could be dangerous. What would replace "I know the
        blast radius" when I don't?
      </li>
      <li>
        <strong>
          Does the time-log multiplier capture quality, or just hours?
        </strong>{' '}
        The "skewed low because solo would also produce worse output"
        entry says no. But the time log is now CI-enforced. Worth
        thinking about whether that artifact needs a quality column
        too, or whether quality should live in this journal instead.
      </li>
    </ul>
  </>
);

// =============================================================================
// LEVEL COMPOSITIONS
// =============================================================================

const Raw = () => (
  <>
    <EditorialRaw />
    <hr />
    <h2 style={{ marginTop: 0 }}>From the journal</h2>
    <p>
      AI_LEARNINGS entries from the week, in chronological order, verbatim.
    </p>
    <FieldNotesRaw />
  </>
);

const Light = () => (
  <>
    <EditorialLight />
    <hr />
    <h2 style={{ marginTop: 0 }}>Field Notes</h2>
    <FieldNotesLight />
  </>
);

const Medium = () => (
  <>
    <EditorialMedium />
    <hr />
    <h2 style={{ marginTop: 0 }}>Field Notes</h2>
    <FieldNotesMedium />
  </>
);

const Heavy = () => (
  <>
    <EditorialHeavy />
    <hr />
    <h2 style={{ marginTop: 0 }}>Field Notes</h2>
    <FieldNotesHeavy />
  </>
);

const Full = () => (
  <>
    <EditorialFull />
    <hr />
    <h2 style={{ marginTop: 0 }}>Field Notes</h2>
    <FieldNotesFull />
  </>
);

export const post1: Post = {
  slug: 'post-1',
  number: 'Week 1',
  title: 'Now do it and suffer',
  date: '2026-05-09',
  coversFrom: '2026-05-01',
  dek: 'Why this tool did not already exist, and what changed.',
  levels: { raw: Raw, light: Light, medium: Medium, heavy: Heavy, full: Full },
};
