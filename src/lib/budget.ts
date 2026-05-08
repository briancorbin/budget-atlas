import type { BudgetInput, BudgetResult } from '@/types';
import { getCityData } from '@/data/cities';
import { STATES } from '@/data/states';
import { FEDERAL_BRACKETS_2026, STD_DEDUCTION_2026 } from '@/data/federalTax';
import { progressiveTax, calcFICA, calcChildTaxCredit, calcEITC } from '@/lib/tax';
import { checkChip, checkMedicaid, checkSnap } from '@/lib/benefits';
import {
  cexLineItemSpendingForCity,
  quintileFromIncome,
  type BLSCEXLineItem,
  type GeoGranularity,
} from '@/data/cex';

/**
 * Per-line categorization for the essentials vs. lifestyle split (#203).
 * Keys are the labels used in `BudgetResult.expenses` — granular sub-
 * lines, not rolled-up parents. Food and transportation get split into
 * their constituent lines so each one lands cleanly in 'essential' or
 * 'lifestyle': 'Food at home' is essential, 'Food away' is lifestyle;
 * 'Transit' / 'Gasoline' / 'Vehicle (insurance & maint.)' are essential,
 * 'Vehicle (purchase)' is lifestyle. The ExpenseBreakdown component
 * groups these under "Mixed" rollups in the UI when both kinds appear.
 *
 * Apparel and Personal Care are gray-zone (the BLS lines bundle
 * essentials with discretionary), filed as lifestyle because the
 * discretionary share dominates spending in those categories.
 */
/**
 * Per-line source attribution. Drives the small "source: X" label in
 * the detail-view UI so a reader can tell at a glance whether a number
 * came from BLS CEX, a commercial dataset, or a hand-tuned formula.
 *
 * Healthcare is mixed: the premium component comes from KFF (reference
 * tier), the OOP component from BLS CEX (primary tier). Both are
 * surfaced.
 *
 * Audit gaps: Phone & Internet, Insurance, and Transit currently
 * carry no formal source (Phone+Internet and Insurance are hand
 * formulas in this file; Transit is a per-city curated value in
 * cityData with no published source citation). These are flagged as
 * `tier: 'none'` so the UI can render them honestly rather than
 * pretending they're cited.
 */
export interface ExpenseSource {
  label: string;
  /**
   * The visual tier here labels how a *line* is sourced (not just the
   * tier of a single source). Single-source lines use the underlying
   * source's tier (primary / reference / commercial). Lines that
   * combine multiple sources use 'mixed'. Lines without a formal
   * source use 'none'. This is decoupled from `Source.tier` in
   * sources.ts which classifies individual sources only.
   */
  tier: 'primary' | 'reference' | 'commercial' | 'mixed' | 'none';
  /** Short description shown in the hover popover. */
  description: string;
}

const BLS_CEX: ExpenseSource = {
  label: 'BLS CEX',
  tier: 'primary',
  description:
    'Bureau of Labor Statistics Consumer Expenditure Survey — the primary US-government dataset on household spending. We use Table 1101 (income quintiles) for the income axis and the region / division / MSA cross-tabs for the geographic axis, blended via the synthetic factor (nationalQuintile × geoAllCU/nationalAllCU).',
};

export const EXPENSE_SOURCE: Record<string, ExpenseSource> = {
  Housing: {
    label: 'RentCafe / Zillow',
    tier: 'commercial',
    description:
      "City-specific median rents, hand-curated per city in src/data/cities.ts. RentCafe and Zillow publish monthly market data; values are rounded to the nearest $50–100. 1BR for solo / couple-no-kids, 3BR for any household with kids. Replaces BLS's 'Shelter' line, which is averaged across owners and renters and isn't useful as a renter-specific number.",
  },
  Utilities: BLS_CEX,
  'Food at home': BLS_CEX,
  'Food away': BLS_CEX,
  Transit: {
    label: 'Transit-agency rates',
    tier: 'none',
    description:
      "Hand-curated monthly transit-pass costs per city in src/data/cities.ts (e.g. NYC OMNY $132, SF Muni $81). Sourced from each city's transit agency website but not formally cited in our sources registry — known audit gap.",
  },
  Gasoline: BLS_CEX,
  'Vehicle (insurance & maint.)': BLS_CEX,
  'Vehicle (purchase)': BLS_CEX,
  Healthcare: {
    label: 'KFF (premium) + BLS CEX (OOP)',
    tier: 'mixed',
    description:
      'Healthcare splits two ways. The premium portion comes from KFF Employer Health Benefits Survey (worker share of an employer-sponsored plan, single vs. family). The out-of-pocket portion (deductibles, copays, drugs, supplies) comes from BLS CEX with insurance premium explicitly excluded — so KFF and BLS are added without double-counting.',
  },
  Childcare: {
    label: 'Care.com',
    tier: 'commercial',
    description:
      "Care.com Cost of Care Report — annual commercial survey of US childcare costs. We use the preschool monthly value × kids × 0.85 (mix-of-ages discount for after-school / part-time). Note: BLS's Education line includes a small daycare share that overlaps slightly with this — see issue #190.",
  },
  'Phone & Internet': {
    label: 'Hand formula (uncited)',
    tier: 'none',
    description:
      'Hand-tuned formula in lib/budget.ts: $130 baseline + $50 per second adult + $25 per kid. No published source; the values are rough averages of typical phone+internet bundles. Known audit gap — should be replaced with a cited source.',
  },
  Insurance: {
    label: 'Hand formula (uncited)',
    tier: 'none',
    description:
      "Hand-tuned formula for renters' / life / other personal insurance: $90 baseline + $15/kid + $40 if family. No published source. Distinct from healthcare premiums (KFF) and from BLS's 'Personal insurance and pensions' which we don't pull. Known audit gap.",
  },
  Apparel: BLS_CEX,
  Entertainment: BLS_CEX,
  'Personal Care': BLS_CEX,
  Education: BLS_CEX,
  'Household Operations': BLS_CEX,
  'Housekeeping Supplies': BLS_CEX,
  Furnishings: BLS_CEX,
};

export const EXPENSE_CATEGORY: Record<string, 'essential' | 'lifestyle'> = {
  Housing: 'essential',
  Utilities: 'essential',
  'Food at home': 'essential',
  'Food away': 'lifestyle',
  Transit: 'essential',
  Gasoline: 'essential',
  'Vehicle (insurance & maint.)': 'essential',
  'Vehicle (purchase)': 'lifestyle',
  Healthcare: 'essential',
  Childcare: 'essential',
  'Phone & Internet': 'essential',
  Insurance: 'essential',
  Education: 'essential',
  'Housekeeping Supplies': 'essential',
  Apparel: 'lifestyle',
  Entertainment: 'lifestyle',
  'Personal Care': 'lifestyle',
  'Household Operations': 'lifestyle',
  Furnishings: 'lifestyle',
};

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
  const {
    incomeA,
    incomeB = 0,
    hasPartner = false,
    filing,
    city,
    kids,
    lifestyle,
    claimedBenefits,
  } = input;
  const cityData = getCityData(city);
  const stateData = STATES[cityData.state];
  const totalIncome = incomeA + incomeB;
  const hasSecondIncome = incomeB > 0;
  // Adults reflects the household composition the user explicitly modeled
  // via the partner toggle. Filing status drives tax math but never
  // household size — a married couple living apart, or filing jointly
  // while modeling one person's budget, both pick "no partner" and get a
  // 1-adult household. Income from a non-toggled partner is already zero.
  const adults = hasPartner ? 2 : 1;

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
    stateTax =
      progressiveTax(stateTaxableA, stateData.brackets[filing]) +
      progressiveTax(stateTaxableB, stateData.brackets.single);
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
  const lifestyleMult = lifestyle === 'modest' ? 0.85 : lifestyle === 'comfortable' ? 1.2 : 1.0;
  const householdSize = adults + kids;

  // ── BLS CEX wire-up ─────────────────────────────────────────────────
  // For every line item BLS CEX publishes, derive the household's monthly
  // spend from the (city/MSA × division × region × income-quintile) blend.
  // The lifestyle lever stays as a ±15% / ±20% modulator on top — gives
  // users a knob inside their quintile without throwing out the BLS
  // shape. CEX values are per consumer-unit (CU) per year; we /12 for
  // monthly and don't multiply by householdSize (the average CU in BLS's
  // sample is ~2.5 people; finer per-CU-size scaling is roadmap #128).
  //
  // The rolled-up legacy fields on `cityData` (groceries, utilities,
  // carCost, healthSingle/Family) were "approximate medians" hand-set
  // per city. They get superseded by CEX where the mapping is clean:
  //
  //   cityData.groceries        → cex.foodAtHome + cex.foodAway
  //   cityData.utilities        → cex.utilitiesElectricGas + cex.utilitiesWaterPublic
  //   cityData.carCost          → cex.gasoline + cex.vehiclePurchase + cex.vehicleOther
  //   cityData.healthFamily/Single → KFF premium (still cityData) + cex.healthcareOOP
  //   cityData (none)           → cex.apparel / cex.entertainment / cex.personalCare /
  //                                cex.education / cex.householdOperations /
  //                                cex.housekeepingSupplies / cex.furnishings (NEW)
  //
  // Rent (HUD/Zillow), childcare (Care.com), phone/internet flat,
  // insurance flat — these stay non-CEX with their existing sources.
  // Income axis is smoothed across BLS quintile means — see
  // `smoothNationalQuintile` in src/data/cex.ts. The `quintile` value
  // below is still useful for the UI badge ("you're in q4") but no
  // longer drives spending lookups; passing `totalIncome` directly
  // eliminates the artifact step functions at quintile boundaries.
  const quintile = quintileFromIncome(totalIncome);
  const cexGranularity: Partial<Record<BLSCEXLineItem, GeoGranularity>> = {};
  const cexMonthly = (item: BLSCEXLineItem): number => {
    const { spending, granularity } = cexLineItemSpendingForCity(
      city,
      cityData.state,
      totalIncome,
      item,
    );
    if (granularity) cexGranularity[item] = granularity;
    return (spending / 12) * lifestyleMult;
  };

  // Housing footprint — sourced and editorial parts both flagged:
  //   solo, no kids        → 1BR  (HUD occupancy: 1 person fits a 1BR)
  //   couple, no kids      → 1BR × 1.2  (HUD says 2 people are within 1BR
  //                          occupancy limits; the +20% premium is an
  //                          editorial split between staying in a 1BR vs.
  //                          stepping up to a small 2BR. Zillow rent-by-
  //                          bedroom data shows 1BR→2BR runs ~25–30% in
  //                          most metros, so 1.2× is a "blended" couple.)
  //   any kids             → 3BR family-sized  (matches HUD FMR's family
  //                          benchmark and EPI Family Budget Calculator,
  //                          which both use 3BR for households with
  //                          children regardless of count)
  // See RENT_LOGIC_SOURCES in src/data/cities.ts for citations.
  let baseRent: number;
  if (kids >= 1) baseRent = cityData.rent3;
  else if (adults === 2) baseRent = cityData.rent1 * 1.2;
  else baseRent = cityData.rent1;
  const housing =
    baseRent * (lifestyle === 'modest' ? 0.9 : lifestyle === 'comfortable' ? 1.15 : 1.0);

  // Utilities = electric + gas + fuel oil + water/public. Phone/internet
  // stays as a separate line (CEX rolls "Telephone services" into the
  // same parent label, but our model keeps it broken out).
  const utilities = cexMonthly('utilitiesElectricGas') + cexMonthly('utilitiesWaterPublic');

  // Groceries = food at home + food away. CEX splits these; we keep
  // them broken out for the essentials vs. lifestyle split (#203):
  // foodAtHome is essential, foodAway (dining out) is lifestyle. SNAP
  // can only be redeemed at qualifying retailers (no restaurants), so
  // the SNAP offset comes off foodAtHome specifically, not the
  // combined groceries line.
  const foodAtHome = cexMonthly('foodAtHome');
  const foodAway = cexMonthly('foodAway');

  // Transportation: big transit cities + childless → transit pass per
  // adult (transit isn't in CEX; keep cityData.transit). Otherwise use
  // CEX vehicle line items (gasoline + vehicle purchase + other).
  // Broken out for the essentials vs. lifestyle split (#203): transit
  // pass / gasoline / vehicleOther (insurance, registration, maint)
  // are essential; vehiclePurchase is lifestyle (a car upgrade beyond
  // a baseline working vehicle).
  const isTransitCity = ['nyc', 'sf', 'bos', 'dc', 'chi'].includes(city);
  const usesTransit = isTransitCity && kids === 0;
  const transitCost = usesTransit ? cityData.transit * adults : 0;
  // For each car line, capture the BLS-modeled value separately from
  // the shipped value. When `usesTransit` is true the shipped value is
  // forced to 0 (model assumption: transit-only household has no car),
  // but the BLS number stays available so the UI can show the
  // model-vs-shipped comparison and explain the override.
  const gasolineBls = cexMonthly('gasoline');
  const vehicleOtherBls = cexMonthly('vehicleOther');
  const vehiclePurchaseBls = cexMonthly('vehiclePurchase');
  const gasoline = usesTransit ? 0 : gasolineBls;
  const vehicleOther = usesTransit ? 0 : vehicleOtherBls;
  const vehiclePurchase = usesTransit ? 0 : vehiclePurchaseBls;

  // Healthcare = KFF employer-plan premium (still cityData) + CEX OOP.
  // Medicaid covers both — zeros the entire line. CHIP value is the kids'
  // marginal premium share specifically (see checkChip), so the panel-side
  // offset under CHIP only ever matches what CHIP actually replaces.
  const hasFamilyPlan = adults === 2 || kids > 0;
  const healthcarePremium = hasFamilyPlan ? cityData.healthFamily : cityData.healthSingle;
  const healthcareOOP = cexMonthly('healthcareOOP');
  const healthcare = healthcarePremium + healthcareOOP;

  // Childcare lite: kids × preschool average × 0.85 (mix of ages, after-school discount)
  const childcare = kids > 0 ? cityData.childcarePreschool * kids * 0.85 : 0;

  const phoneInternet = 130 + (adults === 2 ? 50 : 0) + kids * 25;
  const insuranceOther = 90 + kids * 15 + (kids >= 1 || adults === 2 ? 40 : 0);

  // CEX-derived line items the model previously omitted entirely.
  // Each is per-CU monthly × lifestyle.
  const apparel = cexMonthly('apparel');
  const entertainment = cexMonthly('entertainment');
  const personalCare = cexMonthly('personalCare');
  const education = cexMonthly('education');
  const householdOperations = cexMonthly('householdOperations');
  const housekeepingSupplies = cexMonthly('housekeepingSupplies');
  const furnishings = cexMonthly('furnishings');

  // ── Benefits ──
  // For each claimed program, compute eligibility from inputs (re-checked
  // here so the budget can never apply a benefit the household isn't
  // eligible for, even if the UI somehow lets them claim it).
  const benefitsApplied: Record<string, number> = {};
  // SNAP redeems against foodAtHome only (no restaurants), so the
  // offset reduces the essential foodAtHome line; foodAway is
  // unaffected.
  let foodAtHomeAfterBenefits = foodAtHome;
  let healthcareAfterBenefits = healthcare;

  const benefitInputs = {
    grossIncome: totalIncome,
    householdSize,
    state: cityData.state,
    adults,
    kids,
    // Total healthcare cost (premium + OOP) — Medicaid covers both.
    monthlyHealthcareCost: healthcare,
    // Premium-only — CHIP covers the kids' premium share, not OOP. Without
    // this split CHIP value would be inflated by the OOP component.
    monthlyHealthcarePremium: healthcarePremium,
    monthlyHealthcareSingle: cityData.healthSingle,
  };

  if (claimedBenefits?.has('snap')) {
    const snap = checkSnap(benefitInputs);
    if (snap.eligible && snap.monthlyBenefit > 0) {
      const offset = Math.min(snap.monthlyBenefit, foodAtHome);
      foodAtHomeAfterBenefits = foodAtHome - offset;
      benefitsApplied['SNAP'] = offset;
    }
  }

  // Medicaid takes priority over CHIP — if Medicaid covers the household,
  // CHIP isn't separately needed (Medicaid covers kids too in this case).
  // Medicaid zeros the full healthcare line (premium + OOP). CHIP is
  // computed from monthlyHealthcarePremium (kids' marginal premium share)
  // and applied as a partial offset against the same line.
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

  // Essentials vs. lifestyle split (#203). The model previously
  // labeled "take-home − total expenses" as "Discretionary," but that
  // number actually deducts every line including foodAway, entertainment,
  // and vehiclePurchase — which IS the discretionary spending. Splitting
  // gives two honest readings:
  //
  //   discretionaryIncome = take-home − essentials   (textbook)
  //   surplus             = discretionaryIncome − lifestyle
  //                       = take-home − total expenses  (legacy
  //                                                     `discretionary`
  //                                                     field)
  //
  // Categorization is conservative. Unambiguously lifestyle: foodAway,
  // entertainment, vehiclePurchase, furnishings, householdOperations.
  // Gray-zone items (apparel, personalCare) bundle essentials with
  // discretionary in a single BLS line; we file them as lifestyle
  // because the discretionary share dominates. Education is essential
  // when present (tuition, school fees). vehicleOther (insurance,
  // registration, maintenance) is essential. Per-line user override is
  // roadmap #5.
  const essentialExpenses =
    housing +
    utilities +
    foodAtHomeAfterBenefits +
    transitCost +
    gasoline +
    vehicleOther +
    healthcareAfterBenefits +
    childcare +
    phoneInternet +
    insuranceOther +
    education +
    housekeepingSupplies;
  const lifestyleExpenses =
    foodAway +
    vehiclePurchase +
    apparel +
    entertainment +
    personalCare +
    householdOperations +
    furnishings;

  const totalExpenses = essentialExpenses + lifestyleExpenses;

  const discretionaryIncome = monthlyNet - essentialExpenses;
  const annualDiscretionaryIncome = discretionaryIncome * 12;
  const discretionary = monthlyNet - totalExpenses;
  const annualDiscretionary = discretionary * 12;

  const suggestedSavings = Math.max(0, discretionary * 0.5);
  const suggestedVacation = Math.max(0, discretionary * 0.2);
  const suggestedSplurge = Math.max(0, discretionary * 0.2);
  const suggestedEmergency = Math.max(0, discretionary * 0.1);

  return {
    grossIncome: totalIncome,
    incomeA,
    incomeB,
    hasSecondIncome,
    adults,
    householdSize,
    federalTax,
    fedTaxRaw,
    ctc,
    eitc,
    stateTax,
    localTax,
    fica,
    totalTaxes,
    taxableIncome,
    netIncome,
    monthlyNet,
    healthcarePremium,
    // Granular line items — every key is non-overlapping, so summing
    // values yields totalExpenses exactly. Food and Transportation are
    // exposed as their constituent parts (foodAtHome + foodAway, and
    // transit / gasoline / vehicleOther / vehiclePurchase) rather than
    // pre-rolled, so the drill-down UI can show the essentials-vs-
    // lifestyle split inside those parents. ALL keys are always present
    // — when a category doesn't apply to the household type the value
    // is $0 (e.g. Vehicle (purchase) for a transit-only household).
    // expenseModelNotes below records why a $0 line is $0 so the UI
    // can distinguish "model assumed N/A" from "BLS itself returned 0."
    expenses: {
      Housing: housing,
      Utilities: utilities,
      'Food at home': foodAtHomeAfterBenefits,
      'Food away': foodAway,
      Transit: transitCost,
      Gasoline: gasoline,
      'Vehicle (insurance & maint.)': vehicleOther,
      'Vehicle (purchase)': vehiclePurchase,
      Healthcare: healthcareAfterBenefits,
      Childcare: childcare,
      'Phone & Internet': phoneInternet,
      Insurance: insuranceOther,
      Apparel: apparel,
      Entertainment: entertainment,
      'Personal Care': personalCare,
      Education: education,
      'Household Operations': householdOperations,
      'Housekeeping Supplies': housekeepingSupplies,
      Furnishings: furnishings,
    },
    expenseModelNotes: {
      // Vehicle/gasoline lines are forced to $0 for transit-only
      // households. BLS-derived values (`*Bls`) are preserved so the
      // detail view can show "BLS says $X, model overrode to $0
      // because the household uses transit."
      ...(usesTransit
        ? {
            Gasoline: {
              modelValue: gasolineBls,
              reason: 'No car modeled — transit-only household',
            },
            'Vehicle (insurance & maint.)': {
              modelValue: vehicleOtherBls,
              reason: 'No car modeled — transit-only household',
            },
            'Vehicle (purchase)': {
              modelValue: vehiclePurchaseBls,
              reason: 'No car modeled — transit-only household',
            },
          }
        : {
            // For car households, Transit is forced to $0 — no BLS
            // counterpart since transit pass costs are sourced from
            // cityData, not CEX. modelValue stays null.
            Transit: {
              modelValue: null,
              reason: 'Modeled with a car instead of transit',
            },
          }),
      // Childcare is forced to $0 when no kids; no BLS counterpart
      // (childcare is sourced from cityData, not CEX).
      ...(kids === 0
        ? {
            Childcare: {
              modelValue: null,
              reason: 'No kids modeled',
            },
          }
        : {}),
    },
    totalExpenses,
    essentialExpenses,
    lifestyleExpenses,
    discretionaryIncome,
    annualDiscretionaryIncome,
    discretionary,
    annualDiscretionary,
    benefitsApplied,
    totalBenefits,
    suggestedSavings,
    suggestedVacation,
    suggestedSplurge,
    suggestedEmergency,
    cityData,
    stateData,
    cexProvenance: cexGranularity,
    incomeQuintile: quintile,
  };
}
