import { theme as T, fonts } from '@/theme';
import { navigate } from '@/lib/nav';
import { SectionTitle } from './ui';

const GITHUB_URL = 'https://github.com/TheBudgetAtlas/thebudgetatlas';
const CONTACT_EMAIL = 'brian@thebudgetatlas.com';

export function About({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.ink,
        fontFamily: fonts.body,
        padding: '40px 24px 80px',
        backgroundImage: `radial-gradient(circle at 20% 0%, rgba(166, 38, 28, 0.04), transparent 50%),
         radial-gradient(circle at 80% 100%, rgba(45, 80, 22, 0.03), transparent 50%)`,
      }}
    >
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        <Header onBack={onBack} />
        <Intro />
        <WhyThisExists />
        <BiggerGoal />
        <StillImproving />
        <AboutMe />
        <AIExperiment />
        <Elsewhere />
        <Footer onBack={onBack} />
      </div>
    </div>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        borderTop: `2px solid ${T.ink}`,
        paddingTop: 16,
        marginBottom: 32,
        gap: 16,
        flexWrap: 'wrap',
      }}
    >
      <div
        style={{
          fontSize: 12,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 600,
        }}
      >
        The Budget Atlas · Vol. 2026 · About
      </div>
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          fontSize: 11,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          color: T.inkSoft,
          textDecoration: 'none',
          borderBottom: `1px solid ${T.border}`,
          paddingBottom: 2,
        }}
      >
        ← Back to the atlas
      </a>
    </div>
  );
}

function Intro() {
  return (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 'clamp(34px, 5vw, 44px)',
          fontWeight: 500,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
          marginBottom: 16,
        }}
      >
        Why I built this
      </div>
      <p
        style={{
          fontSize: 16,
          lineHeight: 1.55,
          color: T.inkSoft,
          maxWidth: 640,
          margin: 0,
        }}
      >
        Three reasons, roughly in order of how they showed up: a question about money and place I'd
        been chewing on for years, a public-good goal that matters more than the question, and a
        deliberate experiment in how far AI tools can go when handed a real, messy, multi-month
        project to drive end-to-end. This page is the honest version of all three.
      </p>
    </div>
  );
}

const proseStyle = {
  fontSize: 16,
  lineHeight: 1.65,
  color: T.ink,
  maxWidth: 680,
  margin: '0 0 16px',
} as const;

function WhyThisExists() {
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle kicker="Origin">Why this exists</SectionTitle>
      <p style={proseStyle}>
        A few years ago I moved from California to Washington to "save money" on state income tax —
        Washington being one of the no-income-tax states the napkin math always seems to favor. The
        savings were real, but much smaller than I'd expected. Federal taxes barely moved. Sales
        tax, gas, more driving in a more spread-out place, AC and heating in a less forgiving
        climate — it all ate most of the difference. I was still ahead, just nowhere near as far
        ahead as I'd told myself I'd be.
      </p>
      <p style={proseStyle}>
        The lesson stuck. Take-home pay is a small piece of the picture, and the picture changes by
        geography in ways you can't see by looking at a paystub. So I started a Google Sheet. Then
        another tab. Then a city-comparison sheet. Then federal-vs-state-vs-FICA tabs that pulled
        from each other. It kept growing until it was clearly trying to be an app.
      </p>
      <p style={proseStyle}>
        The Budget Atlas is what that spreadsheet wanted to be — a tool that takes a real household,
        in a real place, with real (cited) numbers, and shows where the money actually ends up.
        Brackets walked through line by line. Benefits checked against the actual income tests. Cost
        of living that varies by city instead of one national average. The goal was never a slick
        personal-finance app. It's an editorial reference — closer in spirit to{' '}
        <em>The Atlantic</em> than to Mint.
      </p>
    </section>
  );
}

function BiggerGoal() {
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle kicker="The bigger goal">Who this is for</SectionTitle>
      <p style={proseStyle}>
        The personal origin is one half of why this exists. The other half is the part that matters
        more: the people who could most benefit from a tool like this aren't usually the ones who
        build spreadsheets to compare cities. They're navigating a fragmented patchwork of federal,
        state, and local programs — SNAP, Medicaid, CHIP, EITC, the Child Tax Credit, state-specific
        waivers, local food banks, shelters, utility assistance, legal aid. Most of these go
        unclaimed because most of them are hard to find, harder to qualify for, and easy to miss the
        rules of.
      </p>
      <p style={proseStyle}>
        I want the Budget Atlas to be that map. Type in your real situation, see what you'd actually
        qualify for at every level of government, with links straight to the programs themselves.
        Over time I'd like to add more dedicated tools for navigating these resources — eligibility
        walkthroughs, "what to bring" application guides, a clearer view of where the cliffs are
        between programs.
      </p>
      <p style={proseStyle}>
        And I want this to be community-driven. The federal and state pieces I can model — the IRS
        publishes brackets, USDA publishes SNAP rules, every state has a Medicaid agency. The local
        layer is the part no centralized site does well: the food bank that opens at 7am on
        Tuesdays, the diaper bank with sliding-scale criteria, the legal-aid clinic that takes
        walk-ins. That kind of knowledge lives with the people who already use it. The plan is to
        open a path for anyone to add their city's resources to the atlas, with light moderation.
      </p>
      <p style={proseStyle}>
        This is the slower half of the project. Most of what's shipped today is the modeling —
        taxes, cost of living, the federal safety net at a baseline level. The community-resources
        directory and the application-walkthrough tools are still on the{' '}
        <a
          href="/roadmap"
          onClick={(e) => {
            e.preventDefault();
            navigate('/roadmap');
          }}
          style={{
            color: T.accent,
            textDecoration: 'none',
            fontWeight: 600,
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 1,
          }}
        >
          roadmap
        </a>
        . But that's the direction this is pointed.
      </p>
    </section>
  );
}

function StillImproving() {
  const linkStyle = {
    color: T.accent,
    textDecoration: 'none',
    fontWeight: 600,
    borderBottom: `1px solid ${T.border}`,
    paddingBottom: 1,
  } as const;
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle kicker="Honest caveats">Help us keep it accurate</SectionTitle>
      <p style={proseStyle}>
        The Budget Atlas is not meant to be the definitive word on taxes, benefits, or cost of
        living. It's a public-good project, deliberately editorial in spirit — useful as a way to
        see the <em>shape</em> of how American households live across geographies and life
        configurations, not as a substitute for talking to a tax preparer, a benefits navigator, or
        the actual program office that runs a benefit you might qualify for.
      </p>
      <p style={proseStyle}>
        Some specifics will be wrong. State agencies reorganize URLs and citations rot. Programs
        update eligibility rules between annual cycles. Cost-of-living numbers are approximations
        rounded for readability, not personal-finance-grade precision. We try to flag the
        approximations as approximations rather than dress them up as harder numbers than they are.
      </p>
      <p style={proseStyle}>
        This is a growing community tool that gets more accurate as more eyes check it. If you find
        a broken citation, an outdated program rule, or a number that looks wrong, the way to make
        it better is to open an issue or a pull request. Every citation the model relies on is
        listed on the{' '}
        <a
          href="/sources"
          onClick={(e) => {
            e.preventDefault();
            navigate('/sources');
          }}
          style={linkStyle}
        >
          sources page
        </a>{' '}
        with attribution and review history; the underlying{' '}
        <a
          href={`${GITHUB_URL}/tree/main/audit`}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          link audit
        </a>{' '}
        runs nightly.
      </p>
    </section>
  );
}

function AboutMe() {
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle kicker="Author">About me</SectionTitle>
      <p style={proseStyle}>
        I've been a software engineer for 11 years. I started in Swift and iOS, ended up full-stack
        — Rust, React (and React Native), Flutter, web backends, mobile, dashboards, most of the
        usual sprawl. A few stops along the way that shape why I cared enough to build this:
      </p>
      <ul
        style={{
          ...proseStyle,
          paddingLeft: 24,
          marginBottom: 16,
        }}
      >
        <li style={{ marginBottom: 10 }}>
          <strong style={{ color: T.ink }}>Virgin Orbit</strong> — built data-visualization
          dashboards used during rocket launches. Cared a lot about getting numbers right when there
          are many of them and they all matter.
        </li>
        <li style={{ marginBottom: 10 }}>
          <strong style={{ color: T.ink }}>MobileCoin</strong> — worked across the stack on a
          privacy-focused payments protocol. Backend, frontend, mobile. Lived in financial-software
          land for years.
        </li>
        <li style={{ marginBottom: 10 }}>
          <strong style={{ color: T.ink }}>Galaxy</strong> (currently) — software engineer on the
          GalaxyOne mobile app. Still in fintech, still pointing the same instincts at the same
          kinds of problems.
        </li>
      </ul>
      <p style={proseStyle}>
        This project sits where those interests overlap: financial accuracy, clear data
        visualization, a dose of editorial framing. It's the thing I'd want to read.
      </p>
    </section>
  );
}

function AIExperiment() {
  return (
    <section style={{ marginBottom: 56 }}>
      <SectionTitle kicker="Method">The AI experiment</SectionTitle>
      <p style={proseStyle}>
        The other reason this exists is that I wanted to test what AI tools can actually do when
        handed a real, multi-month project to drive end-to-end. Not a tutorial app, not a one-shot
        prompt — a thing with citation discipline, a roadmap, a deploy pipeline, and the kind of
        accumulating cruft that makes real software real.
      </p>
      <p style={proseStyle}>
        Most of this codebase was written collaboratively with Claude, with me as the architect and
        reviewer. The git history reflects it — co-authored commits all the way through. A few
        things have surprised me:
      </p>
      <ul
        style={{
          ...proseStyle,
          paddingLeft: 24,
          marginBottom: 16,
        }}
      >
        <li style={{ marginBottom: 10 }}>
          <strong style={{ color: T.ink }}>The bottleneck moved.</strong> With AI accelerating the
          typing, the limiting factor became deciding <em>what</em> to build and{' '}
          <em>how to verify it.</em> Editorial judgment, not keystrokes.
        </li>
        <li style={{ marginBottom: 10 }}>
          <strong style={{ color: T.ink }}>Citation discipline survived.</strong> I worried that
          adding numbers via AI would erode the rule that every value traces to a source. The
          opposite happened — AI is patient enough to chase down a source on every single addition.
          It catches my own laziness now.
        </li>
        <li style={{ marginBottom: 10 }}>
          <strong style={{ color: T.ink }}>Tool discovery has been the unexpected gift.</strong>{' '}
          Shell tricks, git worktrees, zoxide, debugging patterns, deploy flows — a lot of small
          craft I would not have hunted down on my own. Working alongside AI has been a faster path
          to "things I should already know."
        </li>
      </ul>
      <p style={proseStyle}>
        The experiment is ongoing. Some things are still firmly the human's job — taste, what to
        model, the editorial stance on the safety net, when to push back when the AI takes an
        obvious-looking but wrong turn. Others I'm increasingly happy to delegate. This page is
        itself a checkpoint: where the project is, where it's going, and what I'm learning while I
        drive it.
      </p>
    </section>
  );
}

function Elsewhere() {
  const linkStyle = {
    color: T.accent,
    textDecoration: 'none',
    fontWeight: 600,
    borderBottom: `1px solid ${T.border}`,
    paddingBottom: 1,
  } as const;
  return (
    <section style={{ marginBottom: 48 }}>
      <SectionTitle kicker="Find this elsewhere">Code &amp; contact</SectionTitle>
      <p style={proseStyle}>
        The source for the Budget Atlas lives on{' '}
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={linkStyle}>
          GitHub
        </a>{' '}
        — issues, pull requests, and corrections welcome. For anything that doesn't fit there, I
        read{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </section>
  );
}

function Footer({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        borderTop: `2px solid ${T.ink}`,
        paddingTop: 24,
        marginTop: 48,
        textAlign: 'center',
      }}
    >
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          fontFamily: fonts.body,
          fontSize: 13,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          padding: '10px 18px',
          background: T.surface,
          border: `1px solid ${T.border}`,
          color: T.ink,
          fontWeight: 600,
          textDecoration: 'none',
          display: 'inline-block',
        }}
      >
        ← Back to the atlas
      </a>
    </div>
  );
}
