import { theme as T, fonts, rem } from '@/theme';
import { navigate } from '@/lib/nav';
import { SectionTitle } from '@/components/ui';

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
        <LastUpdated />
        <NoBackend />
        <Analytics />
        <NoCookiesNoStorage />
        <ExternalLinks />
        <HostingNote />
        <Fonts />
        <DntGpc />
        <NoEmbeds />
        <ChildrensPrivacy />
        <NoDataToReturn />
        <NoAITraining />
        <SiteShutdown />
        <OpenSource />
        <SecurityDisclosure />
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
        The short version: <strong style={{ color: T.ink }}>this is a static website</strong>. No
        backend, no database, no accounts, no forms, no cookies. Nothing you input — your income,
        location, household — is ever sent anywhere.
      </p>
      <p style={proseStyle}>
        We do run one piece of aggregate, cookieless analytics (Cloudflare Web Analytics) so we know
        roughly how many people are using the site and whether it's loading well. It does not track
        you, fingerprint you, see your inputs, or follow you across sites. The exact details — what
        it collects, what it doesn't, and how to verify or block it — are below.
      </p>
      <p style={proseStyle}>
        If anything here ever changes, this page changes first and we'll make it loud and clear.
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
          href="https://workers.cloudflare.com/"
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

function Analytics() {
  const cellStyle = {
    padding: '8px 12px',
    fontSize: rem(14),
    borderBottom: `1px solid ${T.border}`,
    verticalAlign: 'top' as const,
  };
  const headStyle = {
    ...cellStyle,
    fontWeight: 600,
    color: T.inkMuted,
    fontSize: rem(11),
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    borderBottom: `2px solid ${T.ink}`,
  };
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="What we run">Aggregate analytics, no personal data</SectionTitle>
      <p style={proseStyle}>
        We use{' '}
        <a
          href="https://www.cloudflare.com/web-analytics/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          Cloudflare Web Analytics
        </a>{' '}
        — a cookieless, privacy-first analytics tool — so we can see roughly how many people are
        using the site and whether it's loading well. It is the lightest-touch product-analytics
        option we know of short of running nothing.
      </p>
      <p style={proseStyle}>Here's what it does and doesn't do, in plain language:</p>
      <table
        style={{
          width: '100%',
          maxWidth: 680,
          borderCollapse: 'collapse',
          fontFamily: fonts.body,
          marginBottom: 16,
        }}
      >
        <thead>
          <tr>
            <th style={{ ...headStyle, textAlign: 'left', width: '50%' }}>What it collects</th>
            <th style={{ ...headStyle, textAlign: 'left' }}>What it does NOT collect</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={cellStyle}>
              URL path of pages viewed (e.g. <code>/sources</code>)
            </td>
            <td style={cellStyle}>
              Your IP address (stripped at the Cloudflare edge before logging)
            </td>
          </tr>
          <tr>
            <td style={cellStyle}>Referrer (the previous URL, if any)</td>
            <td style={cellStyle}>Cookies — none are set</td>
          </tr>
          <tr>
            <td style={cellStyle}>Browser + OS (e.g. "Chrome 124 on macOS")</td>
            <td style={cellStyle}>
              Personal identifiers, account data, email — none exist on this site
            </td>
          </tr>
          <tr>
            <td style={cellStyle}>Country, derived from IP then discarded</td>
            <td style={cellStyle}>Precise geolocation — only country-level</td>
          </tr>
          <tr>
            <td style={cellStyle}>Screen size bucket (e.g. "desktop"/"mobile")</td>
            <td style={cellStyle}>Canvas, audio, font, or other browser fingerprinting</td>
          </tr>
          <tr>
            <td style={cellStyle}>Page-load performance (Core Web Vitals: LCP, INP, CLS)</td>
            <td style={cellStyle}>Anything you type — incomes, locations, household details</td>
          </tr>
          <tr>
            <td style={cellStyle}>A short-lived (~30 min) random token for visit deduplication</td>
            <td style={cellStyle}>Cross-site tracking — the token doesn't persist or follow you</td>
          </tr>
        </tbody>
      </table>
      <p style={proseStyle}>
        Cloudflare's documentation on the product is{' '}
        <a
          href="https://developers.cloudflare.com/web-analytics/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          here
        </a>
        , the exact data-collection and reporting behavior is documented{' '}
        <a
          href="https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/#data-collection-and-reporting"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          here
        </a>
        , and their privacy commitments for it are{' '}
        <a
          href="https://blog.cloudflare.com/privacy-first-web-analytics/#what-does-privacy-first-mean"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          documented publicly
        </a>
        .
      </p>
      <p style={proseStyle}>
        <strong style={{ color: T.ink }}>Verifying or blocking it.</strong> The analytics beacon is
        a script loaded from <code>static.cloudflareinsights.com/beacon.min.js</code>. You can
        confirm it's the only third-party request the page makes by opening your browser's DevTools
        → Network tab. If you'd rather it didn't load, blocking that hostname in any ad-blocker,
        uBlock Origin, or your <code>/etc/hosts</code> file disables it cleanly with no impact on
        the rest of the site.
      </p>
      <p style={proseStyle}>
        <strong style={{ color: T.ink }}>What we don't run:</strong> Google Analytics, Plausible,
        Mixpanel, Amplitude, Segment, PostHog, Hotjar, Fathom, Heap, FullStory, session replay,
        heatmaps, A/B testing, tag managers, pixels, advertising scripts, or any custom telemetry of
        our own. The code that runs this site is open source and{' '}
        <a href={`${GITHUB_URL}`} target="_blank" rel="noreferrer" style={linkStyle}>
          on GitHub
        </a>{' '}
        — you can grep it yourself.
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
        The site is hosted on Cloudflare Workers and uses Cloudflare Web Analytics (covered in
        detail above). Beyond those two, Cloudflare also retains operational edge logs (IP address,
        timestamp, URL path, user-agent) for abuse-prevention and reliability per their{' '}
        <a
          href="https://www.cloudflare.com/privacypolicy/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          standard privacy policy
        </a>
        . Those edge logs are Cloudflare's, not ours — we don't ingest, query, or use them.
        Cloudflare retains them according to their own retention windows.
      </p>
      <p style={proseStyle}>
        We have <strong style={{ color: T.ink }}>not</strong> enabled any advertising,
        audience-targeting, or marketing-attribution tooling — from Cloudflare or anyone else.
      </p>
      <p style={proseStyle}>
        You can verify this yourself: open <code>thebudgetatlas.com</code> in your browser, open
        DevTools → Network tab, filter by <code>cloudflare</code>, and reload. The only third-party
        request the page makes is the Web Analytics beacon at{' '}
        <code>static.cloudflareinsights.com/beacon.min.js</code>. If you see anything else from a
        Cloudflare hostname, that's a beacon we haven't accounted for and we'd want to hear about
        it.
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
        <em>any</em> additional analytics or telemetry beyond the cookieless aggregate Web Analytics
        already documented above, <em>any</em> account or login, <em>any</em> new category of data
        leaving your browser — <strong style={{ color: T.ink }}>this page changes first</strong>,
        before the feature ships. We'll be loud and explicit about it: a banner on the page, an
        entry in the{' '}
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

function LastUpdated() {
  // Static "last meaningful update" date. Update when this page changes
  // in a way that affects what we collect or how data flows. Cosmetic
  // edits don't require bumping this.
  return (
    <div
      style={{
        fontSize: rem(12),
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: T.inkMuted,
        marginBottom: 32,
        fontWeight: 500,
      }}
    >
      Last updated: 2026-05-04
    </div>
  );
}

function Fonts() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Typography">Fonts are self-hosted</SectionTitle>
      <p style={proseStyle}>
        The site uses Fraunces (display) and IBM Plex Sans / IBM Plex Mono (body and code), both
        bundled directly with the site via{' '}
        <a href="https://fontsource.org/" target="_blank" rel="noreferrer" style={linkStyle}>
          Fontsource
        </a>
        . The fonts are served from our own bundle on Cloudflare's edge — they are{' '}
        <strong style={{ color: T.ink }}>not loaded from Google Fonts</strong> or any third-party
        font CDN. That means Google (or any other font provider) never sees your IP address or
        user-agent when you load the page.
      </p>
    </section>
  );
}

function DntGpc() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Privacy signals">DNT and Global Privacy Control</SectionTitle>
      <p style={proseStyle}>
        Cloudflare Web Analytics{' '}
        <a
          href="https://developers.cloudflare.com/web-analytics/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          honors
        </a>{' '}
        the{' '}
        <a
          href="https://globalprivacycontrol.org/"
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          Global Privacy Control (GPC)
        </a>{' '}
        signal: if your browser sends GPC, the analytics beacon respects it. We don't override that
        behavior, and we don't have any of our own tracking that would ignore it. The same applies
        in spirit to the older Do Not Track (DNT) header — we don't collect anything beyond what
        CFWA does, and CFWA itself is already cookieless and IP-anonymized.
      </p>
    </section>
  );
}

function NoEmbeds() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="No third-party widgets">No embeds, no widgets, no pixels</SectionTitle>
      <p style={proseStyle}>
        The site has no embedded YouTube videos, Twitter/X widgets, Disqus or other comment systems,
        social-media share buttons, chat widgets, livechat tools, customer-support beacons, A/B
        testing scripts, marketing pixels, or any other third-party content that would phone home as
        part of a normal page load. The only third-party request the page makes is the Cloudflare
        Web Analytics beacon described in the section above.
      </p>
    </section>
  );
}

function ChildrensPrivacy() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Children">Children's privacy</SectionTitle>
      <p style={proseStyle}>
        The site isn't directed at children under 13, and we don't knowingly collect personal
        information from anyone of any age — there's nothing to collect, by design. If you have any
        concerns about a young user's interaction with the site, get in touch using the contact
        below.
      </p>
    </section>
  );
}

function NoDataToReturn() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Your rights">Nothing to return, nothing to delete</SectionTitle>
      <p style={proseStyle}>
        Privacy laws in California (CCPA/CPRA), the EU (GDPR), and similar regimes elsewhere give
        you the right to request a copy of personal data a business holds about you, the right to
        have it corrected, and the right to have it deleted. We hold{' '}
        <strong style={{ color: T.ink }}>no personal data about you</strong>: no account, no email,
        no profile, no behavioral history, no contact list, nothing tied to a person. So a request
        to access, correct, port, or delete your data is one we can honor immediately and trivially
        — by confirming there is nothing to act on. If you'd still like that confirmation in
        writing, ask using the contact below.
      </p>
    </section>
  );
}

function NoAITraining() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="AI training">Your activity isn't fed to AI models</SectionTitle>
      <p style={proseStyle}>
        We don't license, sell, share, or otherwise hand your activity on this site to anyone — AI
        training pipelines included. Because nothing about your visit is collected in the first
        place (see the analytics section above for the one narrow exception, which is cookieless
        aggregate page-view data), there is nothing to license, even if a request came in.
      </p>
      <p style={proseStyle}>
        The site itself does not call any AI APIs at runtime. The model that produces a budget is
        plain TypeScript running in your browser; no LLM, no external inference service, no
        prompt-with-your-data anywhere in the stack.
      </p>
    </section>
  );
}

function SiteShutdown() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="If the site goes away">Nothing of yours persists</SectionTitle>
      <p style={proseStyle}>
        If The Budget Atlas ever goes offline — domain expires, hosting changes, project winds down
        — nothing about you persists anywhere, because nothing about you was ever stored. There is
        no database to migrate, no user list to back up, no archive to leak. Closing the tab is
        already the most complete deletion.
      </p>
    </section>
  );
}

function OpenSource() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Verifiable">Every claim here is checkable</SectionTitle>
      <p style={proseStyle}>
        The full source code for this site lives at{' '}
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={linkStyle}>
          github.com/TheBudgetAtlas/thebudgetatlas
        </a>
        . You don't have to take our word for any of the claims on this page — clone the repo and
        grep it. There is no proprietary backend, no closed-source bundle, no hidden analytics layer
        that the public can't see. The same code that produces the site you're reading is the code
        in that repo.
      </p>
      <p style={proseStyle}>
        Found something on this page that contradicts what's actually in the codebase? That's a bug,
        and we'd want to hear about it via the contact below.
      </p>
    </section>
  );
}

function SecurityDisclosure() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Security">Reporting a vulnerability</SectionTitle>
      <p style={proseStyle}>
        If you find a security issue that could affect anyone using the site — cross-site-scripting,
        a leak in the build pipeline, a third-party script we missed, a misconfigured CDN — please
        report it privately rather than opening a public GitHub issue. Email{' '}
        <a href="mailto:security@thebudgetatlas.com" style={linkStyle}>
          security@thebudgetatlas.com
        </a>{' '}
        or open a private security advisory at{' '}
        <a
          href={`${GITHUB_URL}/security/advisories/new`}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          github.com/TheBudgetAtlas/thebudgetatlas/security/advisories
        </a>
        . We'll respond and patch as quickly as possible.
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
