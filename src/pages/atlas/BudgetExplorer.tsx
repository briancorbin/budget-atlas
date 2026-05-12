import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FilingStatus, HousingTenure, Lifestyle } from '@/types';
import { theme as T } from '@/theme';
import { computeBudget } from '@/lib/budget';
import { checkBenefit, type BenefitId } from '@/lib/benefits';
import {
  decodeConfig,
  encodeConfig,
  loadFromStorage,
  looksLikeConfigHash,
  saveToStorage,
  type SharedConfig,
} from '@/lib/configShare';
import { Masthead } from './Masthead';
import { Footer } from '@/components/Footer';
import { ScrollToTop } from '@/components/ScrollToTop';
import { MethodologyNote } from './MethodologyNote';
import { CustomizePanel, CustomizeStickyBar, ScenarioPicker, type InputsState } from './Inputs';
import { ShareLink } from './ShareLink';
import { StatRow, StatusBanner } from './Summary';
import { IncomeFlow } from './IncomeFlow';
import { BracketWalkthrough } from './BracketWalkthrough';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { DiscretionaryPlan } from './DiscretionaryPlan';
import { CityComparison } from './CityComparison';
import { IncomePosition } from './IncomePosition';
import { CliffCurve } from './CliffCurve';
import { Benefits } from './Benefits';
import { Notes } from './Notes';
import { PageNav, type PageNavSection } from './PageNav';
import { PitWarning } from './PitWarning';

const PAGE_NAV_SECTIONS: readonly PageNavSection[] = [
  { id: 'customize', label: 'Customize' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'summary', label: 'Summary' },
  { id: 'income-flow', label: 'Take-home' },
  { id: 'tax-brackets', label: 'Tax brackets' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'plan', label: 'Surplus plan' },
  { id: 'population', label: 'Population' },
  { id: 'geography', label: 'Geography' },
  { id: 'cliffs', label: 'Cliffs' },
  { id: 'notes', label: 'Notes' },
];

// Live initial values for a fresh page load (no shared link, no localStorage).
// A single parent at $40K HoH with two kids in Columbus — picked so the
// safety-net machinery (EITC, refundable CTC, possible SNAP / Medicaid /
// CHIP eligibility) lights up immediately and shows what makes Atlas
// distinct from a tax calculator. Independent of DEFAULTS_V1 in
// configShare.ts: editing here changes only what a brand-new visitor sees;
// editing DEFAULTS_V1 would silently rewrite every previously-shared link.
const INITIAL: SharedConfig = {
  incomeA: 40000,
  incomeB: 0,
  twoIncome: false,
  filing: 'head',
  city: 'cmh',
  kids: 2,
  lifestyle: 'moderate',
  tenure: 'renter',
  compareCity: 'sf',
  claimedBenefits: new Set(),
  overrides: {},
};

function readBootConfig(): SharedConfig {
  if (typeof window !== 'undefined') {
    const hash = window.location.hash;
    if (hash && looksLikeConfigHash(hash)) {
      return decodeConfig(hash);
    }
    const stored = loadFromStorage();
    if (stored) return stored;
  }
  return { ...INITIAL, claimedBenefits: new Set(INITIAL.claimedBenefits) };
}

export function BudgetExplorer() {
  // Read once on mount: hash > localStorage > INITIAL. Subsequent state changes
  // are written back to both via the sync effect below.
  const [boot] = useState(readBootConfig);

  const [incomeA, setIncomeA] = useState(boot.incomeA);
  const [incomeB, setIncomeB] = useState(boot.incomeB);
  const [twoIncome, setTwoIncome] = useState(boot.twoIncome);
  const [filing, setFiling] = useState<FilingStatus>(boot.filing);
  const [city, setCity] = useState(boot.city);
  const [kids, setKids] = useState(boot.kids);
  const [lifestyle, setLifestyle] = useState<Lifestyle>(boot.lifestyle);
  const [tenure, setTenure] = useState<HousingTenure>(boot.tenure);
  const [compareCity, setCompareCity] = useState(boot.compareCity);
  const [claimedBenefits, setClaimedBenefits] = useState<ReadonlySet<string>>(
    () => new Set(boot.claimedBenefits),
  );
  const [overrides, setOverrides] = useState<Readonly<Record<string, number>>>(() => ({
    ...boot.overrides,
  }));

  const effectiveIncomeB = twoIncome ? incomeB : 0;

  const result = useMemo(
    () =>
      computeBudget({
        incomeA,
        incomeB: effectiveIncomeB,
        hasPartner: twoIncome,
        filing,
        city,
        kids,
        lifestyle,
        tenure,
        claimedBenefits,
        overrides,
      }),
    [
      incomeA,
      effectiveIncomeB,
      twoIncome,
      filing,
      city,
      kids,
      lifestyle,
      tenure,
      claimedBenefits,
      overrides,
    ],
  );

  const toggleBenefit = useCallback((id: string) => {
    setClaimedBenefits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Claiming Medicaid auto-drops CHIP — Medicaid covers the entire
        // household including kids, so a simultaneous CHIP claim adds
        // nothing and just creates a misleading "Claimed" badge on a card
        // that contributes zero. Mirrors the budget code's priority logic.
        if (id === 'medicaid') next.delete('chip');
      }
      return next;
    });
  }, []);

  // Auto-drop any claimed benefit the household no longer qualifies for
  // (e.g. user raised income, switched scenarios, moved to a state with a
  // tighter threshold). "Claimed" means actively receiving — stale intent
  // shouldn't linger as a misleading "✓ Claimed" badge while the budget
  // calc silently refuses to apply it.
  //
  // Implemented with the "adjust state during render" pattern (gated on a
  // previous-result comparison) instead of a useEffect that calls setState.
  // Effects that synchronously setState cause cascading renders; React
  // optimizes the gated-during-render path by discarding the first render
  // and re-running with the corrected state — same end-user behavior, no
  // extra commit. See https://react.dev/learn/you-might-not-need-an-effect
  const [prevResult, setPrevResult] = useState(result);
  if (result !== prevResult) {
    setPrevResult(result);
    if (claimedBenefits.size > 0) {
      const preBenefitHealthcare =
        result.expenses.Healthcare +
        (result.benefitsApplied['Medicaid'] ?? 0) +
        (result.benefitsApplied['CHIP'] ?? 0);
      const inputs = {
        grossIncome: result.grossIncome,
        householdSize: result.householdSize,
        state: result.cityData.state,
        adults: result.adults,
        kids: result.householdSize - result.adults,
        monthlyHealthcareCost: preBenefitHealthcare,
        monthlyHealthcarePremium: result.healthcarePremium,
        monthlyHealthcareSingle: result.cityData.healthSingle,
      };
      const next = new Set(claimedBenefits);
      let changed = false;
      for (const id of claimedBenefits) {
        if (!checkBenefit(id as BenefitId, inputs).eligible) {
          next.delete(id);
          changed = true;
        }
      }
      if (changed) setClaimedBenefits(next);
    }
  }

  const currentConfig: SharedConfig = useMemo(
    () => ({
      incomeA,
      incomeB,
      twoIncome,
      filing,
      city,
      kids,
      lifestyle,
      tenure,
      compareCity,
      claimedBenefits,
      overrides,
    }),
    [
      incomeA,
      incomeB,
      twoIncome,
      filing,
      city,
      kids,
      lifestyle,
      tenure,
      compareCity,
      claimedBenefits,
      overrides,
    ],
  );

  // Sync hash + localStorage whenever any config field changes. replaceState
  // (not pushState) keeps the back button uncluttered. Persisting on every
  // change — instead of only on a Share click — means the URL bar always
  // reflects the current view, so Copy is always one button away.
  const encoded = useMemo(() => encodeConfig(currentConfig), [currentConfig]);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState(null, '', `#${encoded}`);
    saveToStorage(currentConfig);
  }, [encoded, currentConfig]);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}#${encoded}`
      : `#${encoded}`;

  // Sticky compact Customize bar — shown only after the full panel has
  // scrolled offscreen. A sentinel `<div>` placed just below the panel
  // toggles `stickyVisible` via IntersectionObserver: when the sentinel is
  // out of view (i.e. scrolled past), the user has lost access to the
  // inputs and the sticky bar pops in.
  const stickySentinelRef = useRef<HTMLDivElement | null>(null);
  // Mobile sticky bar is the *only* Customize entry point — the in-flow
  // CustomizePanel is hidden below 720px to avoid duplicating controls.
  // So on mobile the bar must be visible from page-load (no scroll
  // trigger), and the IntersectionObserver that drives desktop's pop-in
  // is skipped entirely.
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(max-width: 720px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(max-width: 720px)');
    const update = () => setIsMobile(mql.matches);
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);
  // Desktop pop-in trigger: the sentinel toggles a flag that's OR'd with
  // the mobile-always-visible rule below. Splitting the source-of-truth
  // (vs. a single `setStickyVisible(true)` inside an `if (isMobile)`
  // effect) avoids the React lint warning about cascading setState in
  // effects, and keeps the wiring declarative.
  const [scrolledPastSentinel, setScrolledPastSentinel] = useState(false);
  useEffect(() => {
    if (isMobile) return;
    const el = stickySentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        // Visible when sentinel is above the viewport (scrolled past).
        const rect = entry.boundingClientRect;
        setScrolledPastSentinel(!entry.isIntersecting && rect.top < 0);
      },
      { threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [isMobile]);
  const stickyVisible = isMobile || scrolledPastSentinel;

  const inputState: InputsState = {
    incomeA,
    setIncomeA,
    incomeB,
    setIncomeB,
    twoIncome,
    setTwoIncome,
    filing,
    setFiling,
    city,
    setCity,
    kids,
    setKids,
    lifestyle,
    setLifestyle,
    tenure,
    setTenure,
  };

  return (
    <div
      className="atlas-page"
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.ink,
        fontFamily: '"IBM Plex Sans", sans-serif',
        padding: '40px 24px 80px',
        backgroundImage: T.pageGradient,
      }}
    >
      <PageNav sections={PAGE_NAV_SECTIONS} />
      <CustomizeStickyBar {...inputState} visible={stickyVisible} />
      {/* Hide the in-flow Customize panel on mobile — the sticky bar at the
          top of the viewport is the sole Customize entry point on phones.
          The standalone Scenario picker takes its place (mobile-only) so
          the "load an example" affordance doesn't disappear with the rest
          of the panel. Also reserve top padding for the always-visible
          sticky chip so the masthead doesn't sit underneath it on
          initial load. */}
      <style>{`
        .mobile-scenario-picker { display: none; }
        @media (max-width: 720px) {
          .in-flow-customize { display: none; }
          .mobile-scenario-picker { display: block; }
          .atlas-page { padding-top: 56px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Masthead />
        <MethodologyNote />
        <section id="customize" className="in-flow-customize" style={{ scrollMarginTop: 96 }}>
          <CustomizePanel {...inputState} />
        </section>
        {/* Mobile-only: scenario picker as a static element where the
            full Customize panel would otherwise sit. Gives phone users a
            one-tap way to load an example household; the chip up top
            handles per-input editing. */}
        <ScenarioPicker
          {...inputState}
          className="mobile-scenario-picker"
          label="START WITH AN EXAMPLE"
          description="Real-feeling households across the income spectrum — each one prefills every input so you can see how the math plays out, then tap Customize up top to tweak."
          style={{
            margin: '0 0 32px',
            padding: '20px 18px',
            background: T.surface,
            border: `1px solid ${T.border}`,
          }}
        />
        <div ref={stickySentinelRef} aria-hidden style={{ height: 1 }} />
        <section id="benefits" style={{ scrollMarginTop: 96 }}>
          <PitWarning
            city={city}
            kids={kids}
            filing={filing}
            lifestyle={lifestyle}
            hasPartner={twoIncome}
            incomeA={incomeA}
            incomeB={effectiveIncomeB}
          />
          <Benefits result={result} claimed={claimedBenefits} toggle={toggleBenefit} />
        </section>
        <section id="summary" style={{ scrollMarginTop: 96 }}>
          <StatRow result={result} />
          <StatusBanner result={result} />
        </section>
        <section id="income-flow" style={{ scrollMarginTop: 96 }}>
          <IncomeFlow result={result} />
        </section>
        <section id="tax-brackets" style={{ scrollMarginTop: 96 }}>
          <BracketWalkthrough
            result={result}
            incomeA={incomeA}
            incomeB={effectiveIncomeB}
            hasPartner={twoIncome}
            filing={filing}
          />
        </section>
        <section id="expenses" style={{ scrollMarginTop: 96 }}>
          <ExpenseBreakdown
            result={result}
            lifestyle={lifestyle}
            overrides={overrides}
            onOverrideChange={(label, value) => {
              setOverrides((prev) => {
                const next = { ...prev };
                if (value === null) delete next[label];
                else next[label] = value;
                return next;
              });
            }}
          />
        </section>
        <section id="plan" style={{ scrollMarginTop: 96 }}>
          <DiscretionaryPlan result={result} />
          <ShareLink shareUrl={shareUrl} />
        </section>
        <section id="population" style={{ scrollMarginTop: 96 }}>
          <IncomePosition result={result} />
        </section>
        <section id="geography" style={{ scrollMarginTop: 96 }}>
          <CityComparison
            result={result}
            compareCity={compareCity}
            setCompareCity={setCompareCity}
            incomeA={incomeA}
            incomeB={effectiveIncomeB}
            hasPartner={twoIncome}
            filing={filing}
            kids={kids}
            lifestyle={lifestyle}
          />
        </section>
        <section id="cliffs" style={{ scrollMarginTop: 96 }}>
          <CliffCurve
            city={city}
            kids={kids}
            filing={filing}
            lifestyle={lifestyle}
            hasPartner={twoIncome}
            incomeA={incomeA}
            incomeB={effectiveIncomeB}
          />
        </section>
        <section id="notes" style={{ scrollMarginTop: 96 }}>
          <Notes stateTaxSource={result.stateData.taxSource} />
        </section>
        <Footer />
      </div>
      <ScrollToTop />
    </div>
  );
}
