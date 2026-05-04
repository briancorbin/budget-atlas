import { theme as T, fonts, rem } from '@/theme';
import { navigate } from '@/lib/nav';
import { SectionTitle } from './ui';

const GITHUB_URL = 'https://github.com/TheBudgetAtlas/thebudgetatlas';
const CONTACT_EMAIL = 'privacy@thebudgetatlas.com';

const proseStyle = {
  fontSize: rem(16),
  lineHeight: 1.65,
  color: T.ink,
  maxWidth: 680,
  margin: '0 0 16px',
} as const;

const linkStyle = {
  color: T.accent,
  textDecoration: 'none',
  fontWeight: 600,
  borderBottom: `1px solid ${T.border}`,
  paddingBottom: 1,
} as const;

export function Privacy({ onBack }: { onBack: () => void }) {
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
        <NoBackend />
        <NoTracking />
        <NoCookiesNoStorage />
        <ExternalLinks />
        <HostingNote />
        <FuturePromise />
        <Contact />
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
          fontSize: rem(12),
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: T.accent,
          fontWeight: 600,
        }}
      >
        The Budget Atlas · Vol. 2026 · Privacy
      </div>
      <a
        href="/"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        style={{
          fontSize: rem(11),
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: T.inkMuted,
          textDecoration: 'none',
          fontWeight: 500,
        }}
      >
        ← Back to the atlas
      </a>
    </div>
  );
}

function Intro() {
  return (
    <section style={{ marginBottom: 40 }}>
      <h1
        style={{
          fontFamily: fonts.display,
          fontSize: `clamp(${rem(28)}, 5vw, ${rem(44)})`,
          fontWeight: 400,
          letterSpacing: '-0.02em',
          lineHeight: 1.1,
          margin: '0 0 14px',
          fontStyle: 'italic',
          maxWidth: '20ch',
        }}
      >
        Privacy, in one page.
      </h1>
      <p style={proseStyle}>
        The short version: <strong style={{ color: T.ink }}>this is a static website</strong>. There
        is no backend, no database, no analytics, no accounts, no forms, no cookies, no tracking.
        Nothing you input — your income, location, household — is ever sent anywhere.
      </p>
      <p style={proseStyle}>
        The longer version is below. If anything here ever changes, this page changes first and
        we'll make it loud and clear.
      </p>
    </section>
  );
}

function NoBackend() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="The architecture">No backend</SectionTitle>
      <p style={proseStyle}>
        The Budget Atlas runs entirely in your browser. The site is built as a static bundle (HTML,
        CSS, JavaScript) and served from{' '}
        <a
          href="https://www.cloudflare.com/web-analytics/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          Cloudflare Workers
        </a>
        . There is no server we operate that receives or stores anything you do.
      </p>
      <p style={proseStyle}>
        When you adjust an income, change a city, or toggle a benefit, the calculation happens in
        your browser using the same code that the rest of the page renders with. No values you type
        leave the device.
      </p>
    </section>
  );
}

function NoTracking() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="What we don't do">No analytics, no tracking</SectionTitle>
      <p style={proseStyle}>We do not run any of the following:</p>
      <ul
        style={{
          ...proseStyle,
          paddingLeft: 24,
          marginBottom: 16,
        }}
      >
        <li style={{ marginBottom: 6 }}>
          Google Analytics, Plausible, Mixpanel, Amplitude, Segment, PostHog, Hotjar, Fathom, Heap,
          FullStory, or any other product-analytics tool.
        </li>
        <li style={{ marginBottom: 6 }}>Session replay, heatmap, or scroll-tracking tools.</li>
        <li style={{ marginBottom: 6 }}>A/B testing or feature-flagging services.</li>
        <li style={{ marginBottom: 6 }}>
          Tag managers, pixels, or third-party advertising scripts.
        </li>
        <li style={{ marginBottom: 6 }}>Custom telemetry or "phone-home" requests of our own.</li>
      </ul>
      <p style={proseStyle}>
        We don't know how many people visit, what city you picked, what scenario you ran, or whether
        you came back. By design.
      </p>
    </section>
  );
}

function NoCookiesNoStorage() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Your browser">No cookies, no storage</SectionTitle>
      <p style={proseStyle}>
        Today, the site does not set any cookies or write anything to your browser's local storage.
        Reload the page and your inputs reset to the defaults — that's not a bug, it's the current
        behavior.
      </p>
      <p style={proseStyle}>
        We have <strong style={{ color: T.ink }}>planned</strong> a future feature that uses
        browser-local storage (specifically, the <code>localStorage</code> API) to remember your
        inputs across visits, so navigating away and back doesn't wipe your scenario. When that
        ships, this page will get a clear section explaining exactly what gets stored, where it
        lives, and how to clear it.{' '}
        <strong style={{ color: T.ink }}>That data would live only in your browser</strong> —
        clearing your site data wipes it; it's never transmitted anywhere.
      </p>
    </section>
  );
}

function ExternalLinks() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Citations">External links</SectionTitle>
      <p style={proseStyle}>
        The Budget Atlas cites a lot of agencies and aggregators — the IRS, the SSA, state
        Departments of Revenue, KFF, BLS, and so on. Every cited number includes a link to the
        source. When you click one, you leave the Budget Atlas and arrive at someone else's site,
        whose privacy policy (and tracking habits) is outside our control. We never see that you
        clicked.
      </p>
      <p style={proseStyle}>
        Same goes for the GitHub links — clicking "Suggest an idea" or any code link routes you to
        github.com, where{' '}
        <a
          href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          GitHub's privacy policy
        </a>{' '}
        applies.
      </p>
    </section>
  );
}

function HostingNote() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Hosting">A note about Cloudflare</SectionTitle>
      <p style={proseStyle}>
        The site is hosted on Cloudflare Workers. As an edge host, Cloudflare may log requests (IP,
        timestamp, URL path, user-agent) for operational and abuse-prevention purposes per their{' '}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          standard privacy policy
        </a>
        . We don't ingest, query, or use those logs. Cloudflare retains them according to their own
        retention windows, not ours.
      </p>
      <p style={proseStyle}>
        We do not have Cloudflare Web Analytics, Cloudflare Insights, or any other Cloudflare
        product analytics enabled.
      </p>
    </section>
  );
}

function FuturePromise() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="If anything changes">A promise about the future</SectionTitle>
      <p style={proseStyle}>
        If we ever add anything that changes the picture above — <em>any</em> backend feature,{' '}
        <em>any</em> analytics, <em>any</em> account or login, <em>any</em> data leaving your
        browser — <strong style={{ color: T.ink }}>this page changes first</strong>, before the
        feature ships. We'll be loud and explicit about it: a banner on the page, an entry in the{' '}
        <a
          href="/roadmap"
          onClick={(e) => {
            e.preventDefault();
            navigate('/roadmap');
          }}
          style={linkStyle}
        >
          public roadmap
        </a>
        , and a clear note here describing what's new and why.
      </p>
      <p style={proseStyle}>
        The whole point of the project is to be transparent about how it works. That goes for the
        tax math, the source citations, the funding ledger, <em>and</em> the privacy posture.
      </p>
    </section>
  );
}

function Contact() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Questions">Reach out</SectionTitle>
      <p style={proseStyle}>
        If you have a privacy concern, find something on the site that contradicts what's written
        here, or want to verify a claim, the fastest way to reach me is{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>
          {CONTACT_EMAIL}
        </a>{' '}
        or filing an issue on{' '}
        <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" style={linkStyle}>
          GitHub
        </a>
        .
      </p>
      <p style={{ ...proseStyle, color: T.inkMuted, fontSize: rem(14) }}>
        This isn't a legal document. It's a plain-English description of how the site works today.
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
          fontSize: rem(13),
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
