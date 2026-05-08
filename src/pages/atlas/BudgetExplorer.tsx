import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FilingStatus, Lifestyle } from '@/types';
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
import { CustomizePanel, type InputsState } from './Inputs';
import { ShareLink } from './ShareLink';
import { StatRow, StatusBanner } from './Summary';
import { IncomeFlow } from './IncomeFlow';
import { BracketWalkthrough } from './BracketWalkthrough';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { DiscretionaryPlan } from './DiscretionaryPlan';
import { CityComparison } from './CityComparison';
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
  compareCity: 'sf',
  claimedBenefits: new Set(),
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
  const [compareCity, setCompareCity] = useState(boot.compareCity);
  const [claimedBenefits, setClaimedBenefits] = useState<ReadonlySet<string>>(
    () => new Set(boot.claimedBenefits),
  );

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
        claimedBenefits,
      }),
    [incomeA, effectiveIncomeB, twoIncome, filing, city, kids, lifestyle, claimedBenefits],
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
      compareCity,
      claimedBenefits,
    }),
    [incomeA, incomeB, twoIncome, filing, city, kids, lifestyle, compareCity, claimedBenefits],
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
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.bg,
        color: T.ink,
        fontFamily: '"IBM Plex Sans", sans-serif',
        padding: '40px 24px 80px',
        backgroundImage: `radial-gradient(circle at 20% 0%, rgba(166, 38, 28, 0.04), transparent 50%),
         radial-gradient(circle at 80% 100%, rgba(45, 80, 22, 0.03), transparent 50%)`,
      }}
    >
      <PageNav sections={PAGE_NAV_SECTIONS} />
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Masthead />
        <section id="customize" style={{ scrollMarginTop: 24 }}>
          <CustomizePanel {...inputState} />
        </section>
        <section id="benefits" style={{ scrollMarginTop: 24 }}>
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
        <section id="summary" style={{ scrollMarginTop: 24 }}>
          <StatRow result={result} />
          <StatusBanner result={result} />
        </section>
        <section id="income-flow" style={{ scrollMarginTop: 24 }}>
          <IncomeFlow result={result} />
        </section>
        <section id="tax-brackets" style={{ scrollMarginTop: 24 }}>
          <BracketWalkthrough
            result={result}
            incomeA={incomeA}
            incomeB={effectiveIncomeB}
            hasPartner={twoIncome}
            filing={filing}
          />
        </section>
        <section id="expenses" style={{ scrollMarginTop: 24 }}>
          <ExpenseBreakdown result={result} />
        </section>
        <section id="plan" style={{ scrollMarginTop: 24 }}>
          <DiscretionaryPlan result={result} />
          <ShareLink shareUrl={shareUrl} />
        </section>
        <section id="geography" style={{ scrollMarginTop: 24 }}>
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
        <section id="cliffs" style={{ scrollMarginTop: 24 }}>
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
        <section id="notes" style={{ scrollMarginTop: 24 }}>
          <Notes stateTaxSource={result.stateData.taxSource} />
        </section>
      </div>
    </div>
  );
}
