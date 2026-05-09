import type { Post } from '../types';

export const post0: Post = {
  slug: 'post-0',
  number: 'Post 0',
  title: 'Meh, why not',
  date: '2026-05-09',
  dek: 'Why I started Marginalia, and what I am trying not to be.',
  editorial: () => (
    <>
      <p>
        I put this project off for a year. Not because I didn't want to do it
        — I do — but because I knew how much of me it would take. Real
        commitment, real attention. The kind of thing you can't half-do.
      </p>
      <p>
        I'd also been largely ignoring AI in my workflow. GitHub Copilot for
        some PR reviews, the smart autocomplete in VS Code, and that was about
        it. Not skepticism — inertia. I just hadn't been keeping up.
      </p>
      <p>
        For context: I'm a senior engineer, ten-plus years in. CS degree in
        2015, time split between large companies and startups, mostly in
        crypto and finance. Avid Swift enthusiast. I hate Python.
      </p>
      <p>
        Then last month I started a new job, and we had access to Claude Code
        for whatever we needed.
      </p>
      <p>
        <em>Meh, why not give it a shot.</em>
      </p>
      <p>
        Over the next few weeks I ramped up how much I used it. I knew
        immediately it was something that was going to shape the direction of
        the industry, and I knew I had to take a deep dive into figuring out
        what that was going to look like.
      </p>
      <p>
        But the work I do at my job is sensitive. It's not the place to push
        AI to its limits, rattle the cage, figure out the pitfalls. I needed
        a safe playground.
      </p>
      <p>
        That's where this project came in. The Budget Atlas is something I'd
        been pushing off for a year, and it needed a lot of setup work —
        exactly the kind of thing AI seemed competent and efficient at. So I
        figured: let AI kickstart the project, get the ball rolling, and use
        the project as a vehicle to really let AI loose.
      </p>
      <p>
        This blog — <em>Marginalia</em> — is where I'm going to write down
        what comes of that. Weekly. The good, the bad, the weird, the ugly.
        What I learned. Where I faltered. Lessons learned. Future-proofing.
        Interesting things.
      </p>
      <p>
        One thing I want on the record from the start:{' '}
        <strong>I don't want this to become AI slop.</strong> Not the blog,
        and not the project either. The Atlas is a tool I believe could help
        a lot of people, and I'm trying my best, in this exploration, to
        keep the human aspect alive and thriving.
      </p>
      <p>
        A note on how these posts get made: I'm not a particularly gifted
        writer when it comes to this kind of thing, and it's nice to have
        some organization in my onslaught of thought vomit. So every post
        on <em>Marginalia</em> has a toggle at the top —{' '}
        <strong>Raw</strong> and <strong>Edited</strong>. The Edited
        version is what I'd hand to a friend. The Raw version is what I'd
        hand to a tape recorder. Both are mine. The middle is where AI
        lives. I'm doing this for you, really.
      </p>
      <p>That's the why. The rest of <em>Marginalia</em> is the what.</p>
    </>
  ),
  raw: () => (
    <>
      <blockquote>
        <p>
          [Claude prompted: Just talk. In whatever order, no structure
          required. What's been on your mind about working with AI on this
          project — the parts you'd want a stranger to know, the parts that
          surprised you, the parts that made you uncomfortable, the parts
          you're still trying to figure out? If you want a smaller prompt to
          start, pick one: Why now? What made you want to start writing this
          this week (vs. six months ago, vs. never)? What's the honest version
          of what you're trying to figure out? Not the tidy version — the
          real one. What are you afraid this blog becomes if you're not
          careful?]
        </p>
      </blockquote>
      <p>
        Why Now: So, I've been putting off starting this project for a really
        long time because of how time consuming I knew it was going to be.
        This is a real project, that requires real commitment and real
        attention. I have been largely ignoring using AI tooling in my
        workflow. Mostly just github copilot for some small reviews on PRs,
        and the smart autocomplete in VS Code. It wasn't until recently that
        I decided to look into where the tech actually was, and when I saw
        the state of it, I knew it was something I had to dive in to HARD.
        So naturally, it collided with this project I have been pushing off
        for the last year.
      </p>
      <blockquote>
        <p>
          [Claude prompted: What was the moment? A specific thing you saw or
          read or tried? Posts live or die on this kind of detail. "I saw a
          demo" is fine, "I watched X do Y and realized Z" is gold.]
        </p>
      </blockquote>
      <p>
        The specific moment was when I started my new job last month, and we
        had access to claude code for whatever we needed. I figured "meh, why
        not give it a shot?"
      </p>
      <blockquote>
        <p>
          [Claude prompted: What flipped casual curiosity into "drop
          everything, this is the thing"? Was it a specific task it nailed, a
          moment where it did something you didn't expect, the cumulative
          weight of a week of using it, or something else?]
        </p>
      </blockquote>
      <p>
        Right so, over the first few weeks of my job, I continually ramped up
        how much I used claude in my day to day workflow. I knew immediately
        that it was something that was gonna shape the direction of the
        industry, and I knew I had to take a deep dive into figuring out what
        that was gonna look like.
      </p>
      <p>
        Where that collided with this project. I needed a vehicle to really
        let AI loose. See what it could do. Push it to its limits and really
        rattle the cage. My thoughts were this. Let's use AI to kickstart
        this project to get the ball rolling. Setup is a LOT of work, and
        from what I've done at work, AI seemed very competent and efficient
        at that. I needed a safe playground to do this in, because the stuff
        I do at work is sensitive, and I don't honestly know the limits and
        pitfalls of this kind of AI tooling.
      </p>
      <p>
        I largely ignored AI in my workflow because I just hadn't been
        keeping up with it. Inertia really.
      </p>
      <blockquote>
        <p>
          [Claude prompted: What are you afraid this blog becomes if you're
          not careful? What's the failure mode? AI-content slop disguised as
          reflection? Cheerleading? Doomering? A graveyard of two posts and
          silence?]
        </p>
      </blockquote>
      <p>
        I want to make sure this does NOT become AI slop. both the blog but
        ALSO the project itself. This is an important tool that I believe
        could help a lot of people. Which is why, in my exploration, I am
        trying my best to keep the human aspect alive and thriving.
      </p>
      <p>
        I would also like to note in post 0 that I am using AI to help me
        format and draft these posts (including this one). I am not a
        particularly gifted writer when it comes to things like this, and
        it's nice to have some organization in my onslaught of thought
        vomit. I'm doing this for you, really.
      </p>
      <p>
        also, maaaaybe... just maybe... it could be super fun to provide a
        toggle to let people see 2 different versions of the blog post. one
        is the AI curated and assisted organized post, and the OTHER is my
        raw, unfiltered, unaltered, unabridged thought dump.
      </p>
      <p>
        I would also like to note that I'm a senior engineer, ten-plus years
        in. CS degree in 2015, time split between large companies and
        startups, mostly in crypto and finance. Avid Swift enthusiast. I
        hate Python.
      </p>
    </>
  ),
};
