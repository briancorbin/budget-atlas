import type { BudgetInput, BudgetResult } from '@/types';
import { CITIES } from '@/data/cities';
import { STATES } from '@/data/states';
import { FEDERAL_BRACKETS_2026, STD_DEDUCTION_2026 } from '@/data/federalTax';
import { progressiveTax, calcFICA, calcChildTaxCredit, calcEITC } from '@/lib/tax';
import { checkChip, checkMedicaid, checkSnap } from '@/lib/benefits';

/**
 * Given household inputs, compute taxes, expenses, and discretionary income.
 *
 * Tax handling distinguishes three real cases:
 *   1. Married filing jointly — combined income, MFJ brackets, single std deduction
 *   2. Cohabitating partners (single/head + 2 incomes) — each files separately
 *   3. Single earner — current behavior
 *
 * FICA is always computed per-person because Social Security has a per-person
 * wage base cap.
 */
export function computeBudget(input: BudgetInput): BudgetResult {
  const { incomeA, incomeB = 0, hasPartner = false, filing, city, kids, lifestyle, claimedBenefits } = input;
  const cityData = CITIES[city];
  const stateData = STATES[cityData.state];
  const totalIncome = incomeA + incomeB;
  const hasSecondIncome = incomeB > 0;
  // Adults reflects household composition (intent), not income. A stay-at-home
  // spouse / partner still counts. Married filing status implies a partner.
  const adults = (filing === 'married' || hasPartner || hasSecondIncome) ? 2 : 1;

  // ── Tax calculation ──
  let fedTaxRaw: number;
  let taxableIncome: number;
  let ctc: number;
  let eitc: number;

  // State tax: progressive brackets applied to (gross − state std deduction),
  // mirroring the per-earner logic of the federal return. Filing status at
  // the state level follows federal (MFJ → joint state return; cohabitating
  // → each files singly).
  let stateTax: number;

  if (filing === 'married') {
    // MFJ: one combined return regardless of one or two earners
    const std = STD_DEDUCTION_2026.married;
    taxableIncome = Math.max(0, totalIncome - std);
    fedTaxRaw = progressiveTax(taxableIncome, FEDERAL_BRACKETS_2026.married);
    ctc = calcChildTaxCredit(totalIncome, kids, 'married');
    eitc = calcEITC(totalIncome, kids, 'married');

    const stateTaxable = Math.max(0, totalIncome - stateData.stdDeduction.married);
    stateTax = progressiveTax(stateTaxable, stateData.brackets.married);
  } else if (hasSecondIncome) {
    // Cohabitating: each files singly. Person A may file HoH if there are kids.
    const stdA = STD_DEDUCTION_2026[filing];
    const stdB = STD_DEDUCTION_2026.single;
    const taxableA = Math.max(0, incomeA - stdA);
    const taxableB = Math.max(0, incomeB - stdB);
    taxableIncome = taxableA + taxableB;
    const fedRawA = progressiveTax(taxableA, FEDERAL_BRACKETS_2026[filing]);
    const fedRawB = progressiveTax(taxableB, FEDERAL_BRACKETS_2026.single);
    fedTaxRaw = fedRawA + fedRawB;
    // Only one parent can claim each child; primary earner does
    ctc = calcChildTaxCredit(incomeA, kids, filing);
    eitc = calcEITC(incomeA, kids, filing);

    const stateTaxableA = Math.max(0, incomeA - stateData.stdDeduction[filing]);
    const stateTaxableB = Math.max(0, incomeB - stateData.stdDeduction.single);
    stateTax = progressiveTax(stateTaxableA, stateData.brackets[filing])
             + progressiveTax(stateTaxableB, stateData.brackets.single);
  } else {
    // Single earner
    const std = STD_DEDUCTION_2026[filing];
    taxableIncome = Math.max(0, incomeA - std);
    fedTaxRaw = progressiveTax(taxableIncome, FEDERAL_BRACKETS_2026[filing]);
    ctc = calcChildTaxCredit(incomeA, kids, filing);
    eitc = calcEITC(incomeA, kids, filing);

    const stateTaxable = Math.max(0, incomeA - stateData.stdDeduction[filing]);
    stateTax = progressiveTax(stateTaxable, stateData.brackets[filing]);
  }

  // CTC: $2,000/child, refundable up to $1,700 (2026 OBBBA).
  // EITC: fully refundable. Net federal tax can therefore go negative.
  const ctcRefundableCap = 1700 * kids;
  const taxAfterNonRefundable = Math.max(0, fedTaxRaw - ctc);
  const ctcRefundedExcess = Math.min(ctcRefundableCap, Math.max(0, ctc - fedTaxRaw));
  const federalTax = taxAfterNonRefundable - ctcRefundedExcess - eitc;

  const localTax = totalIncome * (cityData.localTax || 0);
  const fica = calcFICA(incomeA) + (hasSecondIncome ? calcFICA(incomeB) : 0);

  const totalTaxes = federalTax + stateTax + localTax + fica;
  const netIncome = totalIncome - totalTaxes;
  const monthlyNet = netIncome / 12;

  // ── Expenses ──
  const lifestyleMult = lifestyle === 'modest' ? 0.85 : lifestyle === 'comfortable' ? 1.20 : 1.0;
  const householdSize = adults + kids;

  // Housing footprint:
  //   solo, no kids → 1BR
  //   couple, no kids → 1BR + ~20% (small 2BR or larger 1BR)
  //   any kids → 3BR family-sized
  let baseRent: number;
  if (kids >= 1) baseRent = cityData.rent3;
  else if (adults === 2) baseRent = cityData.rent1 * 1.2;
  else baseRent = cityData.rent1;
  const housing = baseRent * (lifestyle === 'modest' ? 0.9 : lifestyle === 'comfortable' ? 1.15 : 1.0);

  const utilities = cityData.utilities * (kids >= 2 ? 1.2 : 1.0);
  const groceries = cityData.groceries * householdSize *
    (lifestyle === 'modest' ? 0.85 : lifestyle === 'comfortable' ? 1.15 : 1.0);

  // Big transit cities: childless workers use transit; families need cars
  const isTransitCity = ['nyc', 'sf', 'bos', 'dc', 'chi'].includes(city);
  const transportation = (isTransitCity && kids === 0)
    ? cityData.transit * adults
    : cityData.carCost * (adults === 2 && kids > 0 ? 1.4 : 1.0);

  const hasFamilyPlan = adults === 2 || kids > 0;
  const healthcare = hasFamilyPlan ? cityData.healthFamily : cityData.healthSingle;

  // Childcare lite: kids × preschool average × 0.85 (mix of ages, after-school discount)
  const childcare = kids > 0 ? (cityData.childcarePreschool * kids * 0.85) : 0;

  const phoneInternet = 130 + (adults === 2 ? 50 : 0) + (kids * 25);
  const insuranceOther = 90 + (kids * 15) + ((kids >= 1 || adults === 2) ? 40 : 0);
  const personalEssentials = 120 * householdSize * lifestyleMult;

  // ── Benefits ──
  // For each claimed program, compute eligibility from inputs (re-checked
  // here so the budget can never apply a benefit the household isn't
  // eligible for, even if the UI somehow lets them claim it).
  const benefitsApplied: Record<string, number> = {};
  let groceriesAfterBenefits = groceries;
  let healthcareAfterBenefits = healthcare;

  const benefitInputs = {
    grossIncome: totalIncome,
    householdSize,
    state: cityData.state,
    adults,
    kids,
    monthlyHealthcareCost: healthcare,
    monthlyHealthcareSingle: cityData.healthSingle,
  };

  if (claimedBenefits?.has('snap')) {
    const snap = checkSnap(benefitInputs);
    if (snap.eligible && snap.monthlyBenefit > 0) {
      const offset = Math.min(snap.monthlyBenefit, groceries);
      groceriesAfterBenefits = groceries - offset;
      benefitsApplied['SNAP'] = offset;
    }
  }

  // Medicaid takes priority over CHIP — if Medicaid covers the household,
  // CHIP isn't separately needed (Medicaid covers kids too in this case).
  let medicaidApplied = false;
  if (claimedBenefits?.has('medicaid')) {
    const med = checkMedicaid(benefitInputs);
    if (med.eligible) {
      benefitsApplied['Medicaid'] = healthcareAfterBenefits;
      healthcareAfterBenefits = 0;
      medicaidApplied = true;
    }
  }

  if (!medicaidApplied && claimedBenefits?.has('chip')) {
    const chip = checkChip(benefitInputs);
    if (chip.eligible && chip.monthlyBenefit > 0) {
      const offset = Math.min(chip.monthlyBenefit, healthcareAfterBenefits);
      healthcareAfterBenefits = healthcareAfterBenefits - offset;
      benefitsApplied['CHIP'] = offset;
    }
  }

  const totalBenefits = Object.values(benefitsApplied).reduce((s, n) => s + n, 0);

  const totalExpenses = housing + utilities + groceriesAfterBenefits + transportation +
    healthcareAfterBenefits + childcare + phoneInternet + insuranceOther + personalEssentials;

  const discretionary = monthlyNet - totalExpenses;
  const annualDiscretionary = discretionary * 12;

  const suggestedSavings = Math.max(0, discretionary * 0.50);
  const suggestedVacation = Math.max(0, discretionary * 0.20);
  const suggestedSplurge = Math.max(0, discretionary * 0.20);
  const suggestedEmergency = Math.max(0, discretionary * 0.10);

  return {
    grossIncome: totalIncome, incomeA, incomeB, hasSecondIncome, adults, householdSize,
    federalTax, fedTaxRaw, ctc, eitc, stateTax, localTax, fica, totalTaxes, taxableIncome,
    netIncome, monthlyNet,
    expenses: {
      Housing: housing, Utilities: utilities, Groceries: groceriesAfterBenefits,
      Transportation: transportation, Healthcare: healthcareAfterBenefits,
      Childcare: childcare, 'Phone & Internet': phoneInternet,
      Insurance: insuranceOther, 'Personal Essentials': personalEssentials,
    },
    totalExpenses, discretionary, annualDiscretionary,
    benefitsApplied, totalBenefits,
    suggestedSavings, suggestedVacation, suggestedSplurge, suggestedEmergency,
    cityData, stateData,
  };
}
