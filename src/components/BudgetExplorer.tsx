import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FilingStatus, Lifestyle } from '@/types';
import { theme as T } from '@/theme';
import { computeBudget } from '@/lib/budget';
import { checkBenefit, type BenefitId } from '@/lib/benefits';
import { Masthead } from './Masthead';
import { ScenarioPicker, CustomizePanel, type InputsState } from './Inputs';
import { StatRow, StatusBanner } from './Summary';
import { IncomeFlow } from './IncomeFlow';
import { BracketWalkthrough } from './BracketWalkthrough';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { DiscretionaryPlan } from './DiscretionaryPlan';
import { CityComparison } from './CityComparison';
import { Benefits } from './Benefits';
import { Notes } from './Notes';

export function BudgetExplorer() {
  const [scenarioId, setScenarioId] = useState('teacher_oh');
  const [incomeA, setIncomeA] = useState(56000);
  const [incomeB, setIncomeB] = useState(54000);
  const [twoIncome, setTwoIncome] = useState(true);
  const [filing, setFiling] = useState<FilingStatus>('married');
  const [city, setCity] = useState('cmh');
  const [kids, setKids] = useState(2);
  const [lifestyle, setLifestyle] = useState<Lifestyle>('moderate');
  const [compareCity, setCompareCity] = useState('sf');
  const [claimedBenefits, setClaimedBenefits] = useState<ReadonlySet<string>>(() => new Set());

  const effectiveIncomeB = twoIncome ? incomeB : 0;

  const result = useMemo(
    () => computeBudget({ incomeA, incomeB: effectiveIncomeB, hasPartner: twoIncome, filing, city, kids, lifestyle, claimedBenefits }),
    [incomeA, effectiveIncomeB, twoIncome, filing, city, kids, lifestyle, claimedBenefits],
  );

  const toggleBenefit = useCallback((id: string) => {
    setClaimedBenefits(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // Auto-drop any claimed benefit the household no longer qualifies for
  // (e.g. user raised income, switched scenarios, moved to a state with a
  // tighter threshold). "Claimed" means actively receiving — stale intent
  // shouldn't linger as a misleading "✓ Claimed" badge while the budget
  // calc silently refuses to apply it.
  useEffect(() => {
    if (claimedBenefits.size === 0) return;
    const preBenefitHealthcare =
      result.expenses.Healthcare
      + (result.benefitsApplied['Medicaid'] ?? 0)
      + (result.benefitsApplied['CHIP'] ?? 0);
    const inputs = {
      grossIncome: result.grossIncome,
      householdSize: result.householdSize,
      state: result.cityData.state,
      kids: result.householdSize - result.adults,
      monthlyHealthcareCost: preBenefitHealthcare,
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
  }, [result, claimedBenefits]);

  const inputState: InputsState = {
    scenarioId, setScenarioId,
    incomeA, setIncomeA,
    incomeB, setIncomeB,
    twoIncome, setTwoIncome,
    filing, setFiling,
    city, setCity,
    kids, setKids,
    lifestyle, setLifestyle,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg, color: T.ink,
      fontFamily: '"IBM Plex Sans", sans-serif',
      padding: '40px 24px 80px',
      backgroundImage:
        `radial-gradient(circle at 20% 0%, rgba(166, 38, 28, 0.04), transparent 50%),
         radial-gradient(circle at 80% 100%, rgba(45, 80, 22, 0.03), transparent 50%)`,
    }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <Masthead />
        <ScenarioPicker {...inputState} />
        <CustomizePanel {...inputState} />
        <Benefits result={result} claimed={claimedBenefits} toggle={toggleBenefit} />
        <StatRow result={result} />
        <StatusBanner result={result} />
        <IncomeFlow result={result} />
        <BracketWalkthrough
          result={result}
          incomeA={incomeA} incomeB={effectiveIncomeB}
          hasPartner={twoIncome} filing={filing}
        />
        <ExpenseBreakdown result={result} />
        <DiscretionaryPlan result={result} />
        <CityComparison
          result={result}
          compareCity={compareCity} setCompareCity={setCompareCity}
          incomeA={incomeA} incomeB={effectiveIncomeB} hasPartner={twoIncome}
          filing={filing} kids={kids} lifestyle={lifestyle}
        />
        <Notes filing={filing} stateTaxSource={result.stateData.taxSource} />
      </div>
    </div>
  );
}
