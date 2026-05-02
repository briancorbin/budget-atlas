import type { Source, StateCode } from '@/types';

/**
 * Benefit-program data. Each program here will eventually have:
 *   - a max benefit / formula reference
 *   - an authoritative source link
 *   - any program-specific lookup tables (e.g. state Medicaid expansion)
 *
 * Adding a new program: add data + source here, then implement eligibility
 * and benefit-amount math in `lib/benefits.ts`, then surface in the
 * Benefits panel.
 */

// ── SNAP ────────────────────────────────────────────────────────────────

/**
 * SNAP maximum monthly benefit by household size, FY2026 (Oct 2025 – Sep 2026).
 * Set annually by USDA based on the Thrifty Food Plan.
 */
export const SNAP_MAX_BENEFIT_2026: Readonly<Record<number, number>> = {
  1: 298,
  2: 546,
  3: 785,
  4: 994,
  5: 1183,
  6: 1421,
  7: 1571,
  8: 1789,
};

/** Each additional household member beyond 8. */
export const SNAP_MAX_PER_ADDITIONAL_2026 = 224;

/**
 * SNAP gross income limit, expressed as a multiple of FPL. The federal
 * statutory floor is 130%. Most states have adopted Broad-Based
 * Categorical Eligibility (BBCE) which raises the threshold (typically
 * to 165%, 185%, or 200% of FPL). The map below records each state's
 * effective gross-income limit; states not listed default to the 130%
 * federal floor.
 *
 * Values are pulled from CBPP's BBCE tracking and USDA state policy
 * tables, current as of 2024–2025. Thresholds change occasionally as
 * states adopt or repeal BBCE — verify before relying on this for any
 * non-editorial purpose.
 */
export const SNAP_GROSS_INCOME_LIMIT_FPL_FEDERAL = 1.30;

export const SNAP_BBCE_BY_STATE: Partial<Record<StateCode, number>> = {
  // 200% FPL — most common BBCE expansion
  AK: 2.00, CA: 2.00, CO: 2.00, CT: 2.00, DC: 2.00, DE: 2.00,
  GA: 2.00, HI: 2.00, IA: 2.00, KY: 2.00, MA: 2.00, MD: 2.00,
  MI: 2.00, MT: 2.00, NV: 2.00, NJ: 2.00, NM: 2.00, NY: 2.00,
  NC: 2.00, ND: 2.00, OK: 2.00, OR: 2.00, PA: 2.00, RI: 2.00,
  VT: 2.00, VA: 2.00, WA: 2.00, WV: 2.00, WI: 2.00,
  // 185% FPL
  FL: 1.85, ME: 1.85, NH: 1.85, OH: 1.85,
  // 165% FPL
  AZ: 1.65, IL: 1.65, MN: 1.65, NE: 1.65, TX: 1.65,
  // States not listed (AL, AR, ID, IN, KS, LA, MO, MS, SC, SD, TN, UT, WY)
  // use the 130% federal floor with no BBCE expansion.
};

/** Effective SNAP gross-income limit for a given state. */
export function snapIncomeLimitFpl(state: StateCode): number {
  return SNAP_BBCE_BY_STATE[state] ?? SNAP_GROSS_INCOME_LIMIT_FPL_FEDERAL;
}

/**
 * Standard deduction in the SNAP net-income calculation, FY2026, applied
 * to households of 1–3. (Households of 4+ get slightly more; we round.)
 * The earned income deduction (20% of earned income) is also applied.
 */
export const SNAP_STD_DEDUCTION_2026 = 204;

export const SNAP_SOURCE: Source = {
  label: 'USDA SNAP Eligibility & Benefit Amounts',
  url: 'https://www.fns.usda.gov/snap/recipient/eligibility',
  date: '2026',
};

export const SNAP_BBCE_SOURCE: Source = {
  label: 'CBPP: SNAP Broad-Based Categorical Eligibility',
  url: 'https://www.cbpp.org/research/food-assistance/states-have-flexibility-to-expand-snap-categorical-eligibility',
  date: '2024',
};

/**
 * State agency that administers SNAP (program name varies by state —
 * CalFresh in California, OTDA in New York, DTA in Massachusetts, etc.).
 * URLs point to the agency's SNAP/food-assistance landing page where
 * possible, otherwise the agency homepage. Subject to occasional
 * reorganization at the state level.
 */
const STATE_SNAP_AGENCY: Record<StateCode, Source> = {
  AL: { label: 'AL DHR Food Assistance',                   url: 'https://dhr.alabama.gov/services/food-assistance/',                                              date: '2026' },
  AK: { label: 'AK DPA SNAP',                              url: 'http://dhss.alaska.gov/dpa/Pages/snap/default.aspx',                                             date: '2026' },
  AZ: { label: 'AZ DES Nutrition Assistance',              url: 'https://des.az.gov/services/basic-needs/food-assistance/nutrition-assistance',                  date: '2026' },
  AR: { label: 'AR DHS SNAP',                              url: 'https://humanservices.arkansas.gov/divisions-shared-services/county-operations/programs-services/snap/', date: '2026' },
  CA: { label: 'CalFresh (CA DSS)',                        url: 'https://www.cdss.ca.gov/calfresh',                                                                date: '2026' },
  CO: { label: 'CO CDHS SNAP',                             url: 'https://cdhs.colorado.gov/snap',                                                                  date: '2026' },
  CT: { label: 'CT DSS SNAP',                              url: 'https://portal.ct.gov/DSS/SNAP/SNAP',                                                             date: '2026' },
  DE: { label: 'DE DHSS Food Benefits',                    url: 'https://dhss.delaware.gov/dss/foodstamps.html',                                                   date: '2026' },
  FL: { label: 'FL DCF Food Assistance',                   url: 'https://www.myflfamilies.com/services/public-assistance/food-assistance',                        date: '2026' },
  GA: { label: 'GA DHS Food Stamps',                       url: 'https://dhs.georgia.gov/services/food-stamps',                                                    date: '2026' },
  HI: { label: 'HI DHS SNAP',                              url: 'https://humanservices.hawaii.gov/bessd/snap-2/',                                                  date: '2026' },
  ID: { label: 'ID DHW Food Stamps',                       url: 'https://healthandwelfare.idaho.gov/services-programs/food-assistance/food-stamps-snap',          date: '2026' },
  IL: { label: 'IL DHS SNAP',                              url: 'https://www.dhs.state.il.us/page.aspx?item=30357',                                                date: '2026' },
  IN: { label: 'IN FSSA SNAP',                             url: 'https://www.in.gov/fssa/dfr/snap/',                                                               date: '2026' },
  IA: { label: 'IA HHS Food Assistance',                   url: 'https://hhs.iowa.gov/programs/welcome-iowa-snap',                                                 date: '2026' },
  KS: { label: 'KS DCF Food Assistance',                   url: 'https://www.dcf.ks.gov/services/Pages/Food-Assistance.aspx',                                      date: '2026' },
  KY: { label: 'KY DCBS SNAP',                             url: 'https://www.chfs.ky.gov/agencies/dcbs/dfs/Pages/snap.aspx',                                       date: '2026' },
  LA: { label: 'LA DCFS SNAP',                             url: 'https://www.dcfs.louisiana.gov/page/snap',                                                        date: '2026' },
  ME: { label: 'ME DHHS Food Supplement',                  url: 'https://www.maine.gov/dhhs/ofi/programs-services/food-supplement',                                date: '2026' },
  MD: { label: 'MD DHS Food Supplement',                   url: 'https://dhs.maryland.gov/food-supplement-program/',                                               date: '2026' },
  MA: { label: 'MA DTA SNAP',                              url: 'https://www.mass.gov/snap-benefits-formerly-food-stamps',                                         date: '2026' },
  MI: { label: 'MI MDHHS Food Assistance',                 url: 'https://www.michigan.gov/mdhhs/assistance-programs/food-assistance',                              date: '2026' },
  MN: { label: 'MN DHS SNAP',                              url: 'https://mn.gov/dhs/people-we-serve/adults/economic-assistance/food-nutrition/programs-and-services/supplemental-nutrition-program.jsp', date: '2026' },
  MS: { label: 'MS DHS SNAP',                              url: 'https://www.mdhs.ms.gov/economic-assistance/snap/',                                               date: '2026' },
  MO: { label: 'MO DSS Food Stamp Program',                url: 'https://dss.mo.gov/fsd/food-stamps/',                                                             date: '2026' },
  MT: { label: 'MT DPHHS SNAP',                            url: 'https://dphhs.mt.gov/hcsd/snap',                                                                  date: '2026' },
  NE: { label: 'NE DHHS SNAP',                             url: 'https://dhhs.ne.gov/Pages/Economic-Assistance-SNAP.aspx',                                          date: '2026' },
  NV: { label: 'NV DWSS SNAP',                             url: 'https://dwss.nv.gov/SNAP/SNAP_Home/',                                                              date: '2026' },
  NH: { label: 'NH DHHS Food Stamp',                       url: 'https://www.dhhs.nh.gov/programs-services/medicaid/food-stamp-program',                            date: '2026' },
  NJ: { label: 'NJ SNAP (DHS)',                            url: 'https://www.nj.gov/humanservices/njsnap/',                                                         date: '2026' },
  NM: { label: 'NM HCA SNAP',                              url: 'https://www.hca.nm.gov/lookingforassistance/snap/',                                                date: '2026' },
  NY: { label: 'NY OTDA SNAP',                             url: 'https://otda.ny.gov/programs/snap/',                                                               date: '2026' },
  NC: { label: 'NC DHHS Food and Nutrition Services',      url: 'https://www.ncdhhs.gov/divisions/social-services/food-and-nutrition-services-food-stamps',         date: '2026' },
  ND: { label: 'ND HHS SNAP',                              url: 'https://www.hhs.nd.gov/snap',                                                                      date: '2026' },
  OH: { label: 'OH ODJFS Food Assistance',                 url: 'https://jfs.ohio.gov/family-services-and-assistance/cash-and-food-assistance/food-assistance',     date: '2026' },
  OK: { label: 'OK DHS SNAP',                              url: 'https://oklahoma.gov/okdhs/services/sfn.html',                                                     date: '2026' },
  OR: { label: 'OR ODHS SNAP',                             url: 'https://www.oregon.gov/odhs/food/Pages/default.aspx',                                              date: '2026' },
  PA: { label: 'PA DHS SNAP',                              url: 'https://www.dhs.pa.gov/Services/Assistance/Pages/SNAP.aspx',                                       date: '2026' },
  RI: { label: 'RI DHS SNAP',                              url: 'https://dhs.ri.gov/programs-and-services/supplemental-nutrition-assistance-program-snap',          date: '2026' },
  SC: { label: 'SC DSS SNAP',                              url: 'https://dss.sc.gov/snap/',                                                                          date: '2026' },
  SD: { label: 'SD DSS Food Stamps',                       url: 'https://dss.sd.gov/foodstamps/',                                                                    date: '2026' },
  TN: { label: 'TN DHS SNAP',                              url: 'https://www.tn.gov/humanservices/for-families/supplemental-nutrition-assistance-program-snap.html', date: '2026' },
  TX: { label: 'TX HHSC SNAP',                             url: 'https://www.hhs.texas.gov/services/food/snap-food-benefits',                                       date: '2026' },
  UT: { label: 'UT DWS Food Stamps',                       url: 'https://jobs.utah.gov/customereducation/services/foodstamps/index.html',                           date: '2026' },
  VT: { label: '3SquaresVT (VT DCF)',                      url: 'https://dcf.vermont.gov/benefits/3SquaresVT',                                                       date: '2026' },
  VA: { label: 'VA DSS SNAP',                              url: 'https://www.dss.virginia.gov/benefit/snap.cgi',                                                     date: '2026' },
  WA: { label: 'WA DSHS Basic Food',                       url: 'https://www.dshs.wa.gov/esa/community-services-offices/basic-food',                                 date: '2026' },
  WV: { label: 'WV DHHR SNAP',                             url: 'https://dhhr.wv.gov/bcf/Services/Pages/SNAP.aspx',                                                  date: '2026' },
  WI: { label: 'FoodShare Wisconsin (DHS)',                url: 'https://www.dhs.wisconsin.gov/foodshare/index.htm',                                                 date: '2026' },
  WY: { label: 'WY DFS Food Stamps',                       url: 'https://dfs.wyo.gov/assistance-programs/food-and-nutrition/',                                       date: '2026' },
  DC: { label: 'DC DHS SNAP',                              url: 'https://dhs.dc.gov/service/snap-food-stamps',                                                       date: '2026' },
};

/** State SNAP agency citation for a given state. */
export function snapStateSource(state: StateCode): Source {
  return STATE_SNAP_AGENCY[state];
}

// ── Medicaid ────────────────────────────────────────────────────────────

/**
 * Per-state Medicaid policy. ACA expansion adopters cover all adults up to
 * 138% FPL. Non-expansion states cover parents up to a much lower threshold
 * and offer no Medicaid pathway for childless adults — the "coverage gap"
 * affects an estimated 1.5M Americans.
 *
 * Non-expansion parent limits are approximate FY2024–25 figures and shift
 * occasionally; verify before relying on them.
 */
export interface StateMedicaidPolicy {
  expanded: boolean;
  /** % FPL parent threshold in non-expansion states. Childless adults
   *  remain ineligible regardless of income. */
  nonExpansionParentLimit?: number;
}

export const STATE_MEDICAID_POLICY: Record<StateCode, StateMedicaidPolicy> = {
  // Expansion states (40 + DC)
  AK: { expanded: true }, AZ: { expanded: true }, AR: { expanded: true },
  CA: { expanded: true }, CO: { expanded: true }, CT: { expanded: true },
  DE: { expanded: true }, DC: { expanded: true }, HI: { expanded: true },
  ID: { expanded: true }, IL: { expanded: true }, IN: { expanded: true },
  IA: { expanded: true }, KY: { expanded: true }, LA: { expanded: true },
  ME: { expanded: true }, MD: { expanded: true }, MA: { expanded: true },
  MI: { expanded: true }, MN: { expanded: true }, MO: { expanded: true },
  MT: { expanded: true }, NE: { expanded: true }, NV: { expanded: true },
  NH: { expanded: true }, NJ: { expanded: true }, NM: { expanded: true },
  NY: { expanded: true }, NC: { expanded: true }, ND: { expanded: true },
  OH: { expanded: true }, OK: { expanded: true }, OR: { expanded: true },
  PA: { expanded: true }, RI: { expanded: true }, SD: { expanded: true },
  UT: { expanded: true }, VT: { expanded: true }, VA: { expanded: true },
  WA: { expanded: true }, WV: { expanded: true },
  // Non-expansion states (10) — parent limits as % FPL, approximate
  AL: { expanded: false, nonExpansionParentLimit: 0.18 },
  FL: { expanded: false, nonExpansionParentLimit: 0.30 },
  GA: { expanded: false, nonExpansionParentLimit: 0.36 },
  KS: { expanded: false, nonExpansionParentLimit: 0.38 },
  MS: { expanded: false, nonExpansionParentLimit: 0.27 },
  SC: { expanded: false, nonExpansionParentLimit: 0.67 },
  TN: { expanded: false, nonExpansionParentLimit: 0.95 },
  TX: { expanded: false, nonExpansionParentLimit: 0.17 },
  WI: { expanded: false, nonExpansionParentLimit: 1.00 },
  WY: { expanded: false, nonExpansionParentLimit: 0.58 },
};

/** Federal Medicaid expansion is 138% FPL (133% + 5% disregard). */
export const MEDICAID_EXPANSION_LIMIT_FPL = 1.38;

export const MEDICAID_SOURCE: Source = {
  label: 'Medicaid.gov',
  url: 'https://www.medicaid.gov/medicaid/index.html',
  date: '2026',
};

export const MEDICAID_EXPANSION_SOURCE: Source = {
  label: 'KFF: Status of State Medicaid Expansion Decisions',
  url: 'https://www.kff.org/medicaid/issue-brief/status-of-state-medicaid-expansion-decisions-interactive-map/',
  date: '2025',
};

// ── CHIP ────────────────────────────────────────────────────────────────

/**
 * CHIP income limit (% FPL) for children in each state. Each state sets
 * its own threshold, typically 200%–400% FPL. CHIP fills the gap above
 * Medicaid for children — a family that's over Medicaid for adults can
 * often still get the kids covered through CHIP. Approximate FY2024
 * values; some states have separate tiers and pregnancy-specific limits
 * not captured here.
 */
export const STATE_CHIP_LIMIT_FPL: Record<StateCode, number> = {
  AL: 3.17, AK: 2.08, AZ: 2.05, AR: 2.16, CA: 2.66,
  CO: 2.65, CT: 3.23, DE: 2.17, DC: 3.24, FL: 2.10,
  GA: 2.55, HI: 3.13, ID: 1.85, IL: 3.18, IN: 2.55,
  IA: 3.07, KS: 2.50, KY: 2.18, LA: 2.55, ME: 2.13,
  MD: 3.22, MA: 3.05, MI: 2.17, MN: 2.88, MS: 2.14,
  MO: 3.05, MT: 2.66, NE: 2.18, NV: 2.05, NH: 3.23,
  NJ: 3.55, NM: 3.05, NY: 4.05, NC: 2.16, ND: 1.75,
  OH: 2.11, OK: 2.10, OR: 3.05, PA: 3.19, RI: 2.66,
  SC: 2.13, SD: 2.09, TN: 2.55, TX: 2.06, UT: 2.05,
  VT: 3.17, VA: 2.05, WA: 3.17, WV: 3.05, WI: 3.06,
  WY: 2.00,
};

export const CHIP_SOURCE: Source = {
  label: 'InsureKidsNow.gov',
  url: 'https://www.insurekidsnow.gov',
  date: '2026',
};

export const CHIP_STATE_THRESHOLDS_SOURCE: Source = {
  label: 'Medicaid.gov: CHIP Eligibility Levels',
  url: 'https://www.medicaid.gov/chip/eligibility/index.html',
  date: '2025',
};
