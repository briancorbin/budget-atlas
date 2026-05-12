import { theme as T, fonts, rem } from '@/theme';
import { navigate } from '@/lib/nav';
import { SectionTitle } from '@/components/ui';
import { Footer as SiteFooter } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';

const GITHUB_URL = 'https://github.com/TheBudgetAtlas/thebudgetatlas';
const CONTACT_EMAIL = 'hello@thebudgetatlas.com';

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

export function Terms({ onBack }: { onBack: () => void }) {
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
        <NotAdvice />
        <NoWarranty />
        <LimitOfLiability />
        <AccuracyAndFreshness />
        <AcceptableUse />
        <IntellectualProperty />
        <ExternalLinks />
        <Children />
        <Changes />
        <Contact />
        <SiteFooter />
      </div>
      <ScrollToTop />
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
        The Budget Atlas · Vol. 2026 · Terms
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
        Terms, in one page.
      </h1>
      <p style={proseStyle}>
        The short version:{' '}
        <strong style={{ color: T.ink }}>
          The Budget Atlas is a free educational tool, not financial advice
        </strong>
        . It models how taxes, cost of living, and benefits interact for hypothetical households. It
        is not a tax return, not a benefits application, and not a substitute for talking to a CPA,
        a benefits caseworker, or a financial planner about your actual situation.
      </p>
      <p style={proseStyle}>
        Use the numbers to think. Don't use them to file, to claim, or to make a decision you can't
        unmake.
      </p>
      <p style={proseStyle}>
        These terms apply to anyone who visits{' '}
        <a href="https://thebudgetatlas.com" style={linkStyle}>
          thebudgetatlas.com
        </a>{' '}
        or any other surface the project publishes.
      </p>
    </section>
  );
}

function NotAdvice() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="The big one">
        This is not financial, tax, legal, or benefits advice
      </SectionTitle>
      <p style={proseStyle}>
        Everything the atlas displays — federal and state tax estimates, FICA, EITC and CTC
        outcomes, SNAP/Medicaid/CHIP eligibility, take-home pay, lifestyle budgets, cliff-curve
        sweeps — is a <strong style={{ color: T.ink }}>model</strong>. A model is a simplification
        of reality. It omits things real households deal with (retirement contributions, HSAs,
        student loans, homeownership, capital gains, ACA marketplace insurance, self-employment,
        ITIN filers, and more — the{' '}
        <a
          href="/about"
          onClick={(e) => {
            e.preventDefault();
            navigate('/about');
          }}
          style={linkStyle}
        >
          About
        </a>{' '}
        page lists what's deliberately out of scope). It assumes the published tax brackets,
        deductions, and benefit thresholds for the year stamped on the masthead. It rounds.
      </p>
      <p style={proseStyle}>
        That makes the atlas a useful instrument for{' '}
        <em>understanding the shape of how American household finances work</em>. It does{' '}
        <strong style={{ color: T.ink }}>not</strong> make it a substitute for personalized advice.
        Before you do anything that has real money or legal consequences attached — file a return,
        apply for a benefit, accept a job offer, move across state lines, change filing status —
        talk to a qualified professional who can look at your actual paperwork.
      </p>
      <p style={proseStyle}>
        Specifically: nothing on this site is <strong style={{ color: T.ink }}>tax advice</strong>{' '}
        (we are not your CPA or enrolled agent),{' '}
        <strong style={{ color: T.ink }}>legal advice</strong> (we are not your lawyer),{' '}
        <strong style={{ color: T.ink }}>financial-planning advice</strong> (we are not your CFP),
        or <strong style={{ color: T.ink }}>benefits-eligibility determination</strong> (only the
        relevant agency can make that call).
      </p>
    </section>
  );
}

function NoWarranty() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="As-is">No warranty</SectionTitle>
      <p style={proseStyle}>
        The Budget Atlas is provided{' '}
        <strong style={{ color: T.ink }}>
          "as is" and "as available," with no warranties of any kind
        </strong>{' '}
        — express, implied, statutory, or otherwise. That includes, without limitation, any implied
        warranty of merchantability, fitness for a particular purpose, accuracy, completeness,
        non-infringement, or uninterrupted availability.
      </p>
      <p style={proseStyle}>
        We try hard to keep the math right and the citations current — that's the whole point of the{' '}
        <a
          href="/sources"
          onClick={(e) => {
            e.preventDefault();
            navigate('/sources');
          }}
          style={linkStyle}
        >
          Sources
        </a>{' '}
        page and the link-audit pipeline. But "we try hard" is not a guarantee. Brackets change,
        agencies update thresholds, our data refresh might lag, code can have bugs. If you spot one,
        please tell us — see the contact section below.
      </p>
    </section>
  );
}

function LimitOfLiability() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="If something goes wrong">Limit of liability</SectionTitle>
      <p style={proseStyle}>
        To the maximum extent permitted by law, the maintainers of The Budget Atlas are{' '}
        <strong style={{ color: T.ink }}>not liable</strong> for any damages — direct, indirect,
        incidental, special, consequential, or punitive — arising from your use of the site, your
        reliance on anything it displays, or any errors or omissions in its content. That includes
        lost money, lost benefits, missed deadlines, tax penalties, denied applications, or any
        other downstream consequence of treating the model as if it were advice.
      </p>
      <p style={proseStyle}>
        Some jurisdictions don't allow limits like this; where that's the case, the limit applies to
        the extent permitted, and not further.
      </p>
      <p style={proseStyle}>
        The site is offered free of charge with no commercial relationship between you and the
        project. There is no account, no transaction, no purchase, no subscription. The maintainers
        receive nothing from your use of the site and owe nothing in return.
      </p>
    </section>
  );
}

function AccuracyAndFreshness() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Tax years and updates">Accuracy and freshness</SectionTitle>
      <p style={proseStyle}>
        Tax brackets, deductions, FICA wage bases, poverty guidelines, and benefits thresholds
        change every year — sometimes mid-year. The atlas is stamped with a volume label (e.g.{' '}
        <em>Vol. 2026</em>) on the masthead, indicating the tax year it models. We refresh the model
        each year as the IRS, SSA, HHS, and the relevant state agencies publish new figures.
      </p>
      <p style={proseStyle}>
        Between annual refreshes, individual numbers may lag the underlying source. The{' '}
        <a
          href="/sources"
          onClick={(e) => {
            e.preventDefault();
            navigate('/sources');
          }}
          style={linkStyle}
        >
          Sources
        </a>{' '}
        page lists every citation with a publication date and a live status indicator. If a citation
        looks broken or out of date, that's a bug — please flag it.
      </p>
      <p style={proseStyle}>
        Cost-of-living figures (rent, groceries, utilities) for individual cities are pulled from
        public aggregators (RentCafe, Zillow, BLS) and rounded to defensible medians. They are
        representative, not predictive. Your block, your landlord, and your grocery store will not
        match the model exactly.
      </p>
    </section>
  );
}

function AcceptableUse() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Use it freely, just">Acceptable use</SectionTitle>
      <p style={proseStyle}>
        You can browse, share, screenshot, link to, quote, and cite the atlas freely. The site is
        meant to be used and re-used.
      </p>
      <p style={proseStyle}>Please don't:</p>
      <ul style={{ ...proseStyle, paddingLeft: 22 }}>
        <li style={{ marginBottom: 6 }}>
          Misrepresent the model as authoritative tax, legal, or benefits advice.
        </li>
        <li style={{ marginBottom: 6 }}>
          Strip the source citations off a screenshot and present the numbers as your own analysis.
        </li>
        <li style={{ marginBottom: 6 }}>
          Scrape the site at a rate that imposes a burden on the hosting (we're a hobby project on
          shared infrastructure) — clone the{' '}
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" style={linkStyle}>
            repo
          </a>{' '}
          if you want bulk access.
        </li>
        <li style={{ marginBottom: 6 }}>
          Use the site to harass, defame, or doxx anyone, or to launder a position you hold by
          dressing it up in our typography.
        </li>
      </ul>
    </section>
  );
}

function IntellectualProperty() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Code and content">Intellectual property</SectionTitle>
      <p style={proseStyle}>
        The source code is open source under the{' '}
        <a
          href={`${GITHUB_URL}/blob/main/LICENSE`}
          target="_blank"
          rel="noreferrer"
          style={linkStyle}
        >
          MIT License
        </a>
        . You can fork it, modify it, and use it in your own projects under the terms of that
        license. The license text is the authoritative statement; this paragraph is just a pointer.
      </p>
      <p style={proseStyle}>
        The editorial content of the site — the prose on{' '}
        <a
          href="/about"
          onClick={(e) => {
            e.preventDefault();
            navigate('/about');
          }}
          style={linkStyle}
        >
          About
        </a>
        ,{' '}
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            navigate('/privacy');
          }}
          style={linkStyle}
        >
          Privacy
        </a>
        , this Terms page, and the takeaway notes on each scenario — is © Brian Corbin and is shared
        for personal reading and reasonable quotation with attribution. If you want to republish a
        substantial passage, please ask.
      </p>
      <p style={proseStyle}>
        "The Budget Atlas" is the name and identity of this project. The wordmark, color palette,
        and typography choices belong to the project; please don't use them to brand something that
        isn't ours, in a way that would confuse a reader about who made it.
      </p>
      <p style={proseStyle}>
        Tax brackets, benefit thresholds, poverty guidelines, and other government-published figures
        are public-domain facts and belong to no one. Aggregator data (rent medians, cost-of-living
        indices) belongs to the publishers we cite — we link to each one on the{' '}
        <a
          href="/sources"
          onClick={(e) => {
            e.preventDefault();
            navigate('/sources');
          }}
          style={linkStyle}
        >
          Sources
        </a>{' '}
        page and use it under a fair-use research read.
      </p>
    </section>
  );
}

function ExternalLinks() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="When you click out">External links</SectionTitle>
      <p style={proseStyle}>
        The atlas links to a lot of agencies, aggregators, and reference sites. We don't control
        those destinations and aren't responsible for their content, accuracy, or what they do with
        your visit. The{' '}
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            navigate('/privacy');
          }}
          style={linkStyle}
        >
          Privacy
        </a>{' '}
        page covers what happens to your data when you click out (short version: we don't see it).
      </p>
    </section>
  );
}

function Children() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Audience">Not directed at children</SectionTitle>
      <p style={proseStyle}>
        The site discusses adult financial topics — wages, taxes, household budgets, benefits — and
        isn't targeted at children under 13. There's nothing harmful here, but there's also no
        account system or interactive feature that would be designed for a young user.
      </p>
    </section>
  );
}

function Changes() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="If these terms change">Updates to this page</SectionTitle>
      <p style={proseStyle}>
        If we materially change what's on this page — adding a new restriction, taking on
        sponsorship, accepting donations, anything that shifts the relationship between you and the
        project — we'll update the "last updated" date at the top and call out the change in the{' '}
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
        .
      </p>
      <p style={proseStyle}>
        Cosmetic edits — fixing typos, tightening a sentence — don't bump the date.
      </p>
    </section>
  );
}

function Contact() {
  return (
    <section style={{ marginBottom: 40 }}>
      <SectionTitle kicker="Questions">Reach out</SectionTitle>
      <p style={proseStyle}>
        If you found a math bug, a stale citation, a broken link, a sentence on this page that
        contradicts how the site actually works, or you have a question about any of the above:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} style={linkStyle}>
          {CONTACT_EMAIL}
        </a>{' '}
        or open an issue on{' '}
        <a href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" style={linkStyle}>
          GitHub
        </a>
        .
      </p>
      <p style={{ ...proseStyle, color: T.inkMuted, fontSize: rem(14) }}>
        This isn't a contract drafted by a lawyer. It's a plain-English statement of how the project
        is offered and what it isn't.
      </p>
    </section>
  );
}

function LastUpdated() {
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
      Last updated: 2026-05-09
    </div>
  );
}
