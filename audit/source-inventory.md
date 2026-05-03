# Source inventory audit

_Generated 2026-05-03 via `yarn audit:inventory`. Link-audit snapshot: 2026-05-03._
_Re-run after changes; broken counts reflect the snapshot date, not necessarily today — run `yarn check-links` first if a current curl-status reading matters._

Snapshot of every citation in the registry, crossed against where
it’s used in the codebase, its latest curl status, and its latest
human review. Three priority queues surface at the top.

**Total sources:** 229 · **Top-level:** 25 · **Per-state:** 204

## 1. Unused top-level sources

_No `SOURCES['<id>']` references detected outside the registry itself (`src/data/sources.ts`) or the bibliography page (`src/components/Sources.tsx`, which enumerates everything by design). Candidates for removal — but verify by hand: dynamic lookups (e.g. iterating `FLAT_SOURCES`) won’t show up in grep._

_None — every top-level source is referenced somewhere._

## 2. Broken sources

_Curl returned a hard error (000/000ERR/404/999/ERR). Mirrors issue [#116](https://github.com/TheBudgetAtlas/thebudgetatlas/issues/116)._

| id                  | label                             | tier      | status   | url                                                                                                                                     |
| ------------------- | --------------------------------- | --------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `state-dor-ms`      | Mississippi Department of Revenue | reference | `000ERR` | <https://www.dor.ms.gov>                                                                                                                |
| `state-dor-tn`      | Tennessee Department of Revenue   | reference | `000ERR` | <https://www.tn.gov/revenue>                                                                                                            |
| `state-snap-ct`     | CT DSS SNAP                       | reference | `404`    | <https://portal.ct.gov/DSS/SNAP/SNAP>                                                                                                   |
| `state-snap-de`     | DE DHSS Food Benefits             | reference | `999`    | <https://dhss.delaware.gov/dss/foodstamps.html>                                                                                         |
| `state-snap-fl`     | FL DCF Food Assistance            | reference | `404`    | <https://www.myflfamilies.com/services/public-assistance/food-assistance>                                                               |
| `state-snap-ga`     | GA DHS Food Stamps                | reference | `404`    | <https://dhs.georgia.gov/services/food-stamps>                                                                                          |
| `state-snap-hi`     | HI DHS SNAP                       | reference | `404`    | <https://humanservices.hawaii.gov/bessd/snap-2/>                                                                                        |
| `state-snap-id`     | ID DHW Food Stamps                | reference | `404`    | <https://healthandwelfare.idaho.gov/services-programs/food-assistance/food-stamps-snap>                                                 |
| `state-snap-in`     | IN FSSA SNAP                      | reference | `404`    | <https://www.in.gov/fssa/dfr/snap/>                                                                                                     |
| `state-snap-ia`     | IA HHS Food Assistance            | reference | `404`    | <https://hhs.iowa.gov/programs/welcome-iowa-snap>                                                                                       |
| `state-snap-ks`     | KS DCF Food Assistance            | reference | `404`    | <https://www.dcf.ks.gov/services/Pages/Food-Assistance.aspx>                                                                            |
| `state-snap-ky`     | KY DCBS SNAP                      | reference | `404`    | <https://www.chfs.ky.gov/agencies/dcbs/dfs/Pages/snap.aspx>                                                                             |
| `state-snap-mn`     | MN DHS SNAP                       | reference | `404`    | <https://mn.gov/dhs/people-we-serve/adults/economic-assistance/food-nutrition/programs-and-services/supplemental-nutrition-program.jsp> |
| `state-snap-mo`     | MO DSS Food Stamp Program         | reference | `404`    | <https://dss.mo.gov/fsd/food-stamps/>                                                                                                   |
| `state-snap-ne`     | NE DHHS SNAP                      | reference | `404`    | <https://dhhs.ne.gov/Pages/Economic-Assistance-SNAP.aspx>                                                                               |
| `state-snap-nv`     | NV DWSS SNAP                      | reference | `404`    | <https://dwss.nv.gov/SNAP/SNAP_Home/>                                                                                                   |
| `state-snap-ny`     | NY OTDA SNAP                      | reference | `000ERR` | <https://otda.ny.gov/programs/snap/>                                                                                                    |
| `state-snap-ok`     | OK DHS SNAP                       | reference | `404`    | <https://oklahoma.gov/okdhs/services/sfn.html>                                                                                          |
| `state-snap-sc`     | SC DSS SNAP                       | reference | `404`    | <https://dss.sc.gov/snap/>                                                                                                              |
| `state-snap-sd`     | SD DSS Food Stamps                | reference | `404`    | <https://dss.sd.gov/foodstamps/>                                                                                                        |
| `state-snap-wv`     | WV DHHR SNAP                      | reference | `404`    | <https://dhhr.wv.gov/bcf/Services/Pages/SNAP.aspx>                                                                                      |
| `state-snap-wy`     | WY DFS Food Stamps                | reference | `404`    | <https://dfs.wyo.gov/assistance-programs/food-and-nutrition/>                                                                           |
| `state-snap-dc`     | DC DHS SNAP                       | reference | `404`    | <https://dhs.dc.gov/service/snap-food-stamps>                                                                                           |
| `state-medicaid-al` | Alabama Medicaid Agency           | reference | `000ERR` | <https://medicaid.alabama.gov>                                                                                                          |
| `state-medicaid-ct` | HUSKY Health (CT DSS)             | reference | `404`    | <https://portal.ct.gov/dss/health-and-home-care/husky-health-program>                                                                   |
| `state-medicaid-de` | DE DMMA Medicaid                  | reference | `999`    | <https://dhss.delaware.gov/dhss/dmma/>                                                                                                  |
| `state-medicaid-la` | LA Medicaid                       | reference | `000ERR` | <https://www.medicaid.la.gov/>                                                                                                          |
| `state-medicaid-me` | MaineCare                         | reference | `404`    | <https://www.maine.gov/dhhs/ofi/programs-services/mainecare>                                                                            |
| `state-medicaid-ne` | NE DHHS Medicaid                  | reference | `404`    | <https://dhhs.ne.gov/Pages/Medicaid.aspx>                                                                                               |
| `state-medicaid-ri` | RI Medicaid (EOHHS)               | reference | `404`    | <https://eohhs.ri.gov/consumer/medicaid-information>                                                                                    |
| `state-medicaid-sc` | Healthy Connections (SC DHHS)     | reference | `000ERR` | <https://msp.scdhhs.gov/>                                                                                                               |
| `state-chip-al`     | ALL Kids (AL CHIP)                | reference | `000ERR` | <https://www.allkids.org/>                                                                                                              |
| `state-chip-ct`     | HUSKY B (CT CHIP)                 | reference | `404`    | <https://portal.ct.gov/dss/health-and-home-care/husky-health-program>                                                                   |
| `state-chip-de`     | Delaware Healthy Children Program | reference | `999`    | <https://dhss.delaware.gov/dhss/dhcq/dhcp.html>                                                                                         |
| `state-chip-ga`     | PeachCare for Kids                | reference | `404`    | <https://medicaid.georgia.gov/programs/peachcare-kids>                                                                                  |
| `state-chip-il`     | All Kids (IL)                     | reference | `404`    | <https://hfs.illinois.gov/medicalclients/allkids.html>                                                                                  |
| `state-chip-in`     | Hoosier Healthwise                | reference | `404`    | <https://www.in.gov/medicaid/members/health-coverage-programs/programs-by-name/hoosier-healthwise/>                                     |
| `state-chip-ia`     | Hawki (IA CHIP)                   | reference | `404`    | <https://hhs.iowa.gov/programs/welcome-iowa-hawki>                                                                                      |
| `state-chip-me`     | CubCare (MaineCare)               | reference | `404`    | <https://www.maine.gov/dhhs/ofi/programs-services/mainecare>                                                                            |
| `state-chip-mo`     | MO HealthNet for Kids             | reference | `404`    | <https://dss.mo.gov/mhd/participants/pages/mhdkids.htm>                                                                                 |
| `state-chip-mt`     | Healthy Montana Kids              | reference | `404`    | <https://dphhs.mt.gov/HealthyMontanaKids>                                                                                               |
| `state-chip-ne`     | Kids Connection (NE)              | reference | `404`    | <https://dhhs.ne.gov/Pages/Kids-Connection.aspx>                                                                                        |
| `state-chip-nv`     | Nevada Check Up                   | reference | `404`    | <https://dwss.nv.gov/Health_Care/Nevada_Check_Up/>                                                                                      |
| `state-chip-nc`     | NC Health Choice for Children     | reference | `404`    | <https://medicaid.ncdhhs.gov/beneficiaries/health-choice-children>                                                                      |
| `state-chip-nd`     | Healthy Steps (ND CHIP)           | reference | `404`    | <https://www.hhs.nd.gov/medicaid/healthy-steps>                                                                                         |
| `state-chip-pa`     | PA CHIP                           | reference | `000ERR` | <https://www.chipcoverspakids.com/>                                                                                                     |
| `state-chip-ri`     | RIte Care (RI Medicaid for kids)  | reference | `404`    | <https://eohhs.ri.gov/consumer/medicaid-information>                                                                                    |
| `state-chip-sc`     | Healthy Connections (SC, kids)    | reference | `000ERR` | <https://msp.scdhhs.gov/>                                                                                                               |
| `state-chip-tn`     | CoverKids                         | reference | `000ERR` | <https://www.tn.gov/tenncare/members-applicants/coverkids.html>                                                                         |
| `state-chip-tx`     | Texas CHIP                        | reference | `404`    | <https://www.hhs.texas.gov/services/health/medicaid-chip/programs/childrens-health-insurance-program-chip>                              |
| `state-chip-va`     | FAMIS (VA CHIP)                   | reference | `404`    | <https://coverva.dmas.virginia.gov/learn/programs/famis>                                                                                |
| `state-chip-wa`     | Apple Health for Kids             | reference | `404`    | <https://www.hca.wa.gov/health-care-services-supports/apple-health-medicaid-coverage/free-or-low-cost-health-care>                      |
| `state-chip-dc`     | DC Healthy Families               | reference | `404`    | <https://dhcf.dc.gov/page/dc-healthy-families>                                                                                          |

## 3. Original-tier sources never reviewed

_Highest-stakes queue. By rule these reviews are 100% human, no AI assistance — open the URL, read the destination, append a row to `audit/links/reviewed.tsv` describing what you saw._

| id                              | label                                             | added      | url                                                                        |
| ------------------------------- | ------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `irs-rev-proc-2025-32`          | IRS Rev. Proc. 2025-32                            | 2026-05-02 | <https://www.irs.gov/pub/irs-drop/rp-25-32.pdf>                            |
| `ssa-wage-base`                 | SSA Contribution and Benefit Base                 | 2026-05-02 | <https://www.ssa.gov/oact/cola/cbb.html>                                   |
| `bls-cex`                       | BLS Consumer Expenditure Survey                   | 2026-05-02 | <https://www.bls.gov/cex/>                                                 |
| `bls-cex-regional`              | BLS Consumer Expenditure Survey — regional tables | 2026-05-02 | <https://www.bls.gov/cex/tables.htm>                                       |
| `hud-fair-market-rents`         | HUD Fair Market Rents (FY2026)                    | 2026-05-02 | <https://www.huduser.gov/portal/datasets/fmr.html>                         |
| `eia-residential`               | EIA Residential Energy Consumption                | 2026-05-02 | <https://www.eia.gov/consumption/residential/>                             |
| `hhs-poverty-guidelines`        | HHS Poverty Guidelines                            | 2026-05-02 | <https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines> |
| `usda-snap-eligibility`         | USDA SNAP Eligibility & Benefit Amounts           | 2026-05-02 | <https://www.fns.usda.gov/snap/recipient/eligibility>                      |
| `medicaid-gov`                  | Medicaid.gov                                      | 2026-05-02 | <https://www.medicaid.gov/medicaid/index.html>                             |
| `insurekidsnow`                 | InsureKidsNow.gov                                 | 2026-05-02 | <https://www.insurekidsnow.gov>                                            |
| `medicaid-gov-chip-eligibility` | Medicaid.gov: CHIP Eligibility Levels             | 2026-05-02 | <https://www.medicaid.gov/chip/eligibility/index.html>                     |

## Full inventory · top-level sources

| id                              | label                                                    | tier      | added      | latest review | status | usage                      |
| ------------------------------- | -------------------------------------------------------- | --------- | ---------- | ------------- | ------ | -------------------------- |
| `aaa-driving-costs`             | AAA Your Driving Costs                                   | reference | 2026-05-02 | _never_       | `200`  | `src/data/cities.ts:384`   |
| `bls-cex`                       | BLS Consumer Expenditure Survey                          | original  | 2026-05-02 | _never_       | `403`  | `src/data/cities.ts:16`    |
| `bls-cex-regional`              | BLS Consumer Expenditure Survey — regional tables        | original  | 2026-05-02 | _never_       | `403`  | `src/data/cities.ts:380`   |
| `care-com-childcare`            | Care.com Cost of Care Report                             | reference | 2026-05-02 | 2026-05-03    | `200`  | `src/data/cities.ts:17`    |
| `cbpp-snap-bbce`                | CBPP: SNAP Broad-Based Categorical Eligibility           | reference | 2026-05-02 | _never_       | `403`  | `src/data/benefits.ts:110` |
| `child-care-aware`              | Child Care Aware — Price of Care                         | reference | 2026-05-02 | 2026-05-03    | `200`  | `src/data/cities.ts:382`   |
| `eia-residential`               | EIA Residential Energy Consumption                       | original  | 2026-05-02 | _never_       | `200`  | `src/data/cities.ts:381`   |
| `epi-family-budget-calculator`  | EPI Family Budget Calculator — methodology               | reference | 2026-05-02 | _never_       | `403`  | `src/data/cities.ts:374`   |
| `hhs-poverty-guidelines`        | HHS Poverty Guidelines                                   | original  | 2026-05-02 | _never_       | `200`  | `src/data/poverty.ts:44`   |
| `hud-fair-market-rents`         | HUD Fair Market Rents (FY2026)                           | original  | 2026-05-02 | _never_       | `200`  | `src/data/cities.ts:379`   |
| `hud-handbook-4350-3`           | HUD Handbook 4350.3 — Occupancy Requirements             | reference | 2026-05-02 | 2026-05-02    | `200`  | `src/data/cities.ts:373`   |
| `insurekidsnow`                 | InsureKidsNow.gov                                        | original  | 2026-05-02 | _never_       | `200`  | `src/data/benefits.ts:262` |
| `irs-rev-proc-2025-32`          | IRS Rev. Proc. 2025-32                                   | original  | 2026-05-02 | _never_       | `200`  | `src/data/federalTax.ts:5` |
| `kff-employer-health-benefits`  | KFF Employer Health Benefits Survey                      | reference | 2026-05-02 | 2026-05-03    | `200`  | 2 refs                     |
| `kff-medicaid-expansion`        | KFF: Status of State Medicaid Expansion Decisions        | reference | 2026-05-02 | _never_       | `200`  | `src/data/benefits.ts:196` |
| `medicaid-gov`                  | Medicaid.gov                                             | original  | 2026-05-02 | _never_       | `200`  | `src/data/benefits.ts:194` |
| `medicaid-gov-chip-eligibility` | Medicaid.gov: CHIP Eligibility Levels                    | original  | 2026-05-02 | _never_       | `200`  | `src/data/benefits.ts:264` |
| `ncsl-state-min-wage`           | NCSL State Minimum Wage Chart                            | reference | 2026-05-02 | _never_       | `200`  | `src/data/states.ts:11`    |
| `numbeo-cost-of-living`         | Numbeo cost-of-living indices (cross-check)              | reference | 2026-05-02 | _never_       | `200`  | `src/data/cities.ts:19`    |
| `rentcafe-national`             | RentCafe National Apartment List                         | reference | 2026-05-02 | _never_       | `403`  | `src/data/cities.ts:14`    |
| `ssa-wage-base`                 | SSA Contribution and Benefit Base                        | original  | 2026-05-02 | _never_       | `403`  | `src/data/federalTax.ts:8` |
| `tax-foundation-state-rates`    | Tax Foundation: 2026 State Income Tax Rates and Brackets | reference | 2026-05-02 | _never_       | `200`  | `src/data/states.ts:9`     |
| `usda-snap-eligibility`         | USDA SNAP Eligibility & Benefit Amounts                  | original  | 2026-05-02 | _never_       | `200`  | `src/data/benefits.ts:108` |
| `zillow-rent-by-bedroom`        | Zillow Rent by Bedroom Count                             | reference | 2026-05-02 | _never_       | `403`  | `src/data/cities.ts:375`   |
| `zillow-rent-index`             | Zillow Observed Rent Index                               | reference | 2026-05-02 | _never_       | `403`  | `src/data/cities.ts:15`    |

## Full inventory · per-state maps

_State-map entries are dynamically referenced (e.g. `STATE_DOR[stateCode]`); grep can’t verify per-state usage. Listed here grouped by map, sorted within each by id._

<details><summary><strong>STATE_DOR · Departments of Revenue</strong> (51)</summary>

| id             | label                                              | tier      | latest review | status      |
| -------------- | -------------------------------------------------- | --------- | ------------- | ----------- |
| `state-dor-ak` | Alaska Department of Revenue, Tax Division         | reference | _never_       | `200`       |
| `state-dor-al` | Alabama Department of Revenue                      | reference | _never_       | `200`       |
| `state-dor-ar` | Arkansas Department of Finance and Administration  | reference | _never_       | `200`       |
| `state-dor-az` | Arizona Department of Revenue                      | reference | _never_       | `200`       |
| `state-dor-ca` | California Franchise Tax Board                     | reference | _never_       | `200`       |
| `state-dor-co` | Colorado Department of Revenue, Taxation Division  | reference | _never_       | `200`       |
| `state-dor-ct` | Connecticut Department of Revenue Services         | reference | _never_       | `200`       |
| `state-dor-dc` | D.C. Office of Tax and Revenue                     | reference | _never_       | `200`       |
| `state-dor-de` | Delaware Division of Revenue                       | reference | _never_       | `200`       |
| `state-dor-fl` | Florida Department of Revenue                      | reference | _never_       | `200`       |
| `state-dor-ga` | Georgia Department of Revenue                      | reference | _never_       | `200`       |
| `state-dor-hi` | Hawaii Department of Taxation                      | reference | _never_       | `200`       |
| `state-dor-ia` | Iowa Department of Revenue                         | reference | _never_       | `200`       |
| `state-dor-id` | Idaho State Tax Commission                         | reference | _never_       | `200`       |
| `state-dor-il` | Illinois Department of Revenue                     | reference | _never_       | `200`       |
| `state-dor-in` | Indiana Department of Revenue                      | reference | _never_       | `200`       |
| `state-dor-ks` | Kansas Department of Revenue                       | reference | _never_       | `200`       |
| `state-dor-ky` | Kentucky Department of Revenue                     | reference | _never_       | `200`       |
| `state-dor-la` | Louisiana Department of Revenue                    | reference | _never_       | `200`       |
| `state-dor-ma` | Massachusetts Department of Revenue                | reference | _never_       | `200`       |
| `state-dor-md` | Comptroller of Maryland                            | reference | _never_       | `200`       |
| `state-dor-me` | Maine Revenue Services                             | reference | _never_       | `200`       |
| `state-dor-mi` | Michigan Department of Treasury                    | reference | _never_       | `403`       |
| `state-dor-mn` | Minnesota Department of Revenue                    | reference | _never_       | `200`       |
| `state-dor-mo` | Missouri Department of Revenue                     | reference | _never_       | `200`       |
| `state-dor-ms` | Mississippi Department of Revenue                  | reference | _never_       | 🔴 `000ERR` |
| `state-dor-mt` | Montana Department of Revenue                      | reference | _never_       | `200`       |
| `state-dor-nc` | North Carolina Department of Revenue               | reference | _never_       | `200`       |
| `state-dor-nd` | North Dakota Office of State Tax Commissioner      | reference | _never_       | `200`       |
| `state-dor-ne` | Nebraska Department of Revenue                     | reference | _never_       | `200`       |
| `state-dor-nh` | New Hampshire Department of Revenue Administration | reference | _never_       | `403`       |
| `state-dor-nj` | New Jersey Division of Taxation                    | reference | _never_       | `200`       |
| `state-dor-nm` | New Mexico Taxation and Revenue Department         | reference | _never_       | `200`       |
| `state-dor-nv` | Nevada Department of Taxation                      | reference | _never_       | `200`       |
| `state-dor-ny` | New York State Department of Taxation and Finance  | reference | _never_       | `200`       |
| `state-dor-oh` | Ohio Department of Taxation                        | reference | _never_       | `200`       |
| `state-dor-ok` | Oklahoma Tax Commission                            | reference | _never_       | `200`       |
| `state-dor-or` | Oregon Department of Revenue                       | reference | _never_       | `200`       |
| `state-dor-pa` | Pennsylvania Department of Revenue                 | reference | _never_       | `200`       |
| `state-dor-ri` | Rhode Island Division of Taxation                  | reference | _never_       | `200`       |
| `state-dor-sc` | South Carolina Department of Revenue               | reference | _never_       | `200`       |
| `state-dor-sd` | South Dakota Department of Revenue                 | reference | _never_       | `200`       |
| `state-dor-tn` | Tennessee Department of Revenue                    | reference | _never_       | 🔴 `000ERR` |
| `state-dor-tx` | Texas Comptroller of Public Accounts               | reference | _never_       | `200`       |
| `state-dor-ut` | Utah State Tax Commission                          | reference | _never_       | `200`       |
| `state-dor-va` | Virginia Department of Taxation                    | reference | _never_       | `200`       |
| `state-dor-vt` | Vermont Department of Taxes                        | reference | _never_       | `200`       |
| `state-dor-wa` | Washington Department of Revenue                   | reference | _never_       | `200`       |
| `state-dor-wi` | Wisconsin Department of Revenue                    | reference | _never_       | `200`       |
| `state-dor-wv` | West Virginia Tax Division                         | reference | _never_       | `200`       |
| `state-dor-wy` | Wyoming Department of Revenue                      | reference | _never_       | `200`       |

</details>

<details><summary><strong>STATE_SNAP_AGENCY · SNAP administering agencies</strong> (51)</summary>

| id              | label                               | tier      | latest review | status      |
| --------------- | ----------------------------------- | --------- | ------------- | ----------- |
| `state-snap-ak` | AK DPA SNAP                         | reference | _never_       | `200`       |
| `state-snap-al` | AL DHR Food Assistance              | reference | _never_       | `200`       |
| `state-snap-ar` | AR DHS SNAP                         | reference | _never_       | `200`       |
| `state-snap-az` | AZ DES Nutrition Assistance         | reference | _never_       | `403`       |
| `state-snap-ca` | CalFresh (CA DSS)                   | reference | _never_       | `200`       |
| `state-snap-co` | CO CDHS SNAP                        | reference | _never_       | `200`       |
| `state-snap-ct` | CT DSS SNAP                         | reference | _never_       | 🔴 `404`    |
| `state-snap-dc` | DC DHS SNAP                         | reference | _never_       | 🔴 `404`    |
| `state-snap-de` | DE DHSS Food Benefits               | reference | _never_       | 🔴 `999`    |
| `state-snap-fl` | FL DCF Food Assistance              | reference | _never_       | 🔴 `404`    |
| `state-snap-ga` | GA DHS Food Stamps                  | reference | _never_       | 🔴 `404`    |
| `state-snap-hi` | HI DHS SNAP                         | reference | _never_       | 🔴 `404`    |
| `state-snap-ia` | IA HHS Food Assistance              | reference | _never_       | 🔴 `404`    |
| `state-snap-id` | ID DHW Food Stamps                  | reference | _never_       | 🔴 `404`    |
| `state-snap-il` | IL DHS SNAP                         | reference | _never_       | `200`       |
| `state-snap-in` | IN FSSA SNAP                        | reference | _never_       | 🔴 `404`    |
| `state-snap-ks` | KS DCF Food Assistance              | reference | _never_       | 🔴 `404`    |
| `state-snap-ky` | KY DCBS SNAP                        | reference | _never_       | 🔴 `404`    |
| `state-snap-la` | LA DCFS SNAP                        | reference | _never_       | `200`       |
| `state-snap-ma` | MA DTA SNAP                         | reference | _never_       | `200`       |
| `state-snap-md` | MD DHS Food Supplement              | reference | _never_       | `200`       |
| `state-snap-me` | ME DHHS Food Supplement             | reference | _never_       | `200`       |
| `state-snap-mi` | MI MDHHS Food Assistance            | reference | _never_       | `403`       |
| `state-snap-mn` | MN DHS SNAP                         | reference | _never_       | 🔴 `404`    |
| `state-snap-mo` | MO DSS Food Stamp Program           | reference | _never_       | 🔴 `404`    |
| `state-snap-ms` | MS DHS SNAP                         | reference | _never_       | `200`       |
| `state-snap-mt` | MT DPHHS SNAP                       | reference | _never_       | `200`       |
| `state-snap-nc` | NC DHHS Food and Nutrition Services | reference | _never_       | `200`       |
| `state-snap-nd` | ND HHS SNAP                         | reference | _never_       | `200`       |
| `state-snap-ne` | NE DHHS SNAP                        | reference | _never_       | 🔴 `404`    |
| `state-snap-nh` | NH DHHS Food Stamp                  | reference | _never_       | `403`       |
| `state-snap-nj` | NJ SNAP (DHS)                       | reference | _never_       | `200`       |
| `state-snap-nm` | NM HCA SNAP                         | reference | _never_       | `200`       |
| `state-snap-nv` | NV DWSS SNAP                        | reference | _never_       | 🔴 `404`    |
| `state-snap-ny` | NY OTDA SNAP                        | reference | _never_       | 🔴 `000ERR` |
| `state-snap-oh` | OH ODJFS Food Assistance            | reference | _never_       | `200`       |
| `state-snap-ok` | OK DHS SNAP                         | reference | _never_       | 🔴 `404`    |
| `state-snap-or` | OR ODHS SNAP                        | reference | _never_       | `200`       |
| `state-snap-pa` | PA DHS SNAP                         | reference | _never_       | `200`       |
| `state-snap-ri` | RI DHS SNAP                         | reference | _never_       | `200`       |
| `state-snap-sc` | SC DSS SNAP                         | reference | _never_       | 🔴 `404`    |
| `state-snap-sd` | SD DSS Food Stamps                  | reference | _never_       | 🔴 `404`    |
| `state-snap-tn` | TN DHS SNAP                         | reference | _never_       | `200`       |
| `state-snap-tx` | TX HHSC SNAP                        | reference | _never_       | `200`       |
| `state-snap-ut` | UT DWS Food Stamps                  | reference | _never_       | `200`       |
| `state-snap-va` | VA DSS SNAP                         | reference | _never_       | `200`       |
| `state-snap-vt` | 3SquaresVT (VT DCF)                 | reference | _never_       | `200`       |
| `state-snap-wa` | WA DSHS Basic Food                  | reference | _never_       | `200`       |
| `state-snap-wi` | FoodShare Wisconsin (DHS)           | reference | _never_       | `200`       |
| `state-snap-wv` | WV DHHR SNAP                        | reference | _never_       | 🔴 `404`    |
| `state-snap-wy` | WY DFS Food Stamps                  | reference | _never_       | 🔴 `404`    |

</details>

<details><summary><strong>STATE_MEDICAID_AGENCY · Medicaid administering agencies</strong> (51)</summary>

| id                  | label                                    | tier      | latest review | status      |
| ------------------- | ---------------------------------------- | --------- | ------------- | ----------- |
| `state-medicaid-ak` | Alaska DHSS Health Care Services         | reference | _never_       | `200`       |
| `state-medicaid-al` | Alabama Medicaid Agency                  | reference | _never_       | 🔴 `000ERR` |
| `state-medicaid-ar` | AR DHS Medical Services                  | reference | _never_       | `200`       |
| `state-medicaid-az` | AHCCCS (AZ Medicaid)                     | reference | _never_       | `200`       |
| `state-medicaid-ca` | Medi-Cal (CA DHCS)                       | reference | _never_       | `200`       |
| `state-medicaid-co` | CO HCPF (Health First Colorado)          | reference | _never_       | `200`       |
| `state-medicaid-ct` | HUSKY Health (CT DSS)                    | reference | _never_       | 🔴 `404`    |
| `state-medicaid-dc` | DC Department of Health Care Finance     | reference | _never_       | `200`       |
| `state-medicaid-de` | DE DMMA Medicaid                         | reference | _never_       | 🔴 `999`    |
| `state-medicaid-fl` | FL Agency for Health Care Administration | reference | _never_       | `200`       |
| `state-medicaid-ga` | GA Medicaid (Dept of Community Health)   | reference | _never_       | `200`       |
| `state-medicaid-hi` | Med-QUEST (HI DHS)                       | reference | _never_       | `200`       |
| `state-medicaid-ia` | Iowa Medicaid (Iowa HHS)                 | reference | _never_       | `200`       |
| `state-medicaid-id` | ID DHW Medicaid                          | reference | _never_       | `200`       |
| `state-medicaid-il` | IL HFS Medical Programs                  | reference | _never_       | `200`       |
| `state-medicaid-in` | IN FSSA Medicaid                         | reference | _never_       | `200`       |
| `state-medicaid-ks` | KanCare (KS Medicaid)                    | reference | _never_       | `403`       |
| `state-medicaid-ky` | KY Medicaid (DMS)                        | reference | _never_       | `200`       |
| `state-medicaid-la` | LA Medicaid                              | reference | _never_       | 🔴 `000ERR` |
| `state-medicaid-ma` | MassHealth                               | reference | _never_       | `200`       |
| `state-medicaid-md` | Maryland Medicaid                        | reference | _never_       | `200`       |
| `state-medicaid-me` | MaineCare                                | reference | _never_       | 🔴 `404`    |
| `state-medicaid-mi` | MI MDHHS Medicaid                        | reference | _never_       | `403`       |
| `state-medicaid-mn` | MN Health Care Programs (DHS)            | reference | _never_       | `200`       |
| `state-medicaid-mo` | MO HealthNet (DSS)                       | reference | _never_       | `200`       |
| `state-medicaid-ms` | MS Division of Medicaid                  | reference | _never_       | `200`       |
| `state-medicaid-mt` | MT Healthcare Programs (DPHHS)           | reference | _never_       | `200`       |
| `state-medicaid-nc` | NC Medicaid (NCDHHS)                     | reference | _never_       | `200`       |
| `state-medicaid-nd` | ND Medicaid                              | reference | _never_       | `200`       |
| `state-medicaid-ne` | NE DHHS Medicaid                         | reference | _never_       | 🔴 `404`    |
| `state-medicaid-nh` | NH Medicaid (DHHS)                       | reference | _never_       | `403`       |
| `state-medicaid-nj` | NJ FamilyCare                            | reference | _never_       | `200`       |
| `state-medicaid-nm` | NM HCA Medicaid                          | reference | _never_       | `200`       |
| `state-medicaid-nv` | NV DHCFP (Medicaid)                      | reference | _never_       | `200`       |
| `state-medicaid-ny` | NY Medicaid (DOH)                        | reference | _never_       | `200`       |
| `state-medicaid-oh` | Ohio Medicaid                            | reference | _never_       | `200`       |
| `state-medicaid-ok` | SoonerCare (OK HCA)                      | reference | _never_       | `200`       |
| `state-medicaid-or` | Oregon Health Plan                       | reference | _never_       | `200`       |
| `state-medicaid-pa` | PA DHS Medical Assistance                | reference | _never_       | `200`       |
| `state-medicaid-ri` | RI Medicaid (EOHHS)                      | reference | _never_       | 🔴 `404`    |
| `state-medicaid-sc` | Healthy Connections (SC DHHS)            | reference | _never_       | 🔴 `000ERR` |
| `state-medicaid-sd` | SD Medicaid                              | reference | _never_       | `200`       |
| `state-medicaid-tn` | TennCare                                 | reference | _never_       | `200`       |
| `state-medicaid-tx` | TX HHSC Medicaid & CHIP                  | reference | _never_       | `200`       |
| `state-medicaid-ut` | UT Medicaid                              | reference | _never_       | `200`       |
| `state-medicaid-va` | Cover Virginia / DMAS                    | reference | _never_       | `200`       |
| `state-medicaid-vt` | Green Mountain Care (VT)                 | reference | _never_       | `200`       |
| `state-medicaid-wa` | Apple Health (WA HCA)                    | reference | _never_       | `200`       |
| `state-medicaid-wi` | BadgerCare Plus (WI DHS)                 | reference | _never_       | `200`       |
| `state-medicaid-wv` | WV Medicaid (BMS)                        | reference | _never_       | `200`       |
| `state-medicaid-wy` | WY Medicaid                              | reference | _never_       | `200`       |

</details>

<details><summary><strong>STATE_CHIP_AGENCY · CHIP programs</strong> (51)</summary>

| id              | label                              | tier      | latest review | status      |
| --------------- | ---------------------------------- | --------- | ------------- | ----------- |
| `state-chip-ak` | Denali KidCare (AK CHIP)           | reference | _never_       | `200`       |
| `state-chip-al` | ALL Kids (AL CHIP)                 | reference | _never_       | 🔴 `000ERR` |
| `state-chip-ar` | ARKids First                       | reference | _never_       | `200`       |
| `state-chip-az` | KidsCare (AHCCCS)                  | reference | _never_       | `200`       |
| `state-chip-ca` | Medi-Cal for Kids                  | reference | _never_       | `200`       |
| `state-chip-co` | Child Health Plan Plus (CHP+)      | reference | _never_       | `200`       |
| `state-chip-ct` | HUSKY B (CT CHIP)                  | reference | _never_       | 🔴 `404`    |
| `state-chip-dc` | DC Healthy Families                | reference | _never_       | 🔴 `404`    |
| `state-chip-de` | Delaware Healthy Children Program  | reference | _never_       | 🔴 `999`    |
| `state-chip-fl` | Florida KidCare                    | reference | _never_       | `403`       |
| `state-chip-ga` | PeachCare for Kids                 | reference | _never_       | 🔴 `404`    |
| `state-chip-hi` | Med-QUEST (HI CHIP)                | reference | _never_       | `200`       |
| `state-chip-ia` | Hawki (IA CHIP)                    | reference | _never_       | 🔴 `404`    |
| `state-chip-id` | ID CHIP                            | reference | _never_       | `200`       |
| `state-chip-il` | All Kids (IL)                      | reference | _never_       | 🔴 `404`    |
| `state-chip-in` | Hoosier Healthwise                 | reference | _never_       | 🔴 `404`    |
| `state-chip-ks` | KanCare (KS CHIP)                  | reference | _never_       | `403`       |
| `state-chip-ky` | KCHIP                              | reference | _never_       | `200`       |
| `state-chip-la` | LaCHIP                             | reference | _never_       | `200`       |
| `state-chip-ma` | MassHealth (children)              | reference | _never_       | `200`       |
| `state-chip-md` | Maryland Children’s Health Program | reference | _never_       | `200`       |
| `state-chip-me` | CubCare (MaineCare)                | reference | _never_       | 🔴 `404`    |
| `state-chip-mi` | MIChild                            | reference | _never_       | `403`       |
| `state-chip-mn` | MinnesotaCare                      | reference | _never_       | `200`       |
| `state-chip-mo` | MO HealthNet for Kids              | reference | _never_       | 🔴 `404`    |
| `state-chip-ms` | MS CHIP                            | reference | _never_       | `200`       |
| `state-chip-mt` | Healthy Montana Kids               | reference | _never_       | 🔴 `404`    |
| `state-chip-nc` | NC Health Choice for Children      | reference | _never_       | 🔴 `404`    |
| `state-chip-nd` | Healthy Steps (ND CHIP)            | reference | _never_       | 🔴 `404`    |
| `state-chip-ne` | Kids Connection (NE)               | reference | _never_       | 🔴 `404`    |
| `state-chip-nh` | NH Healthy Kids                    | reference | _never_       | `403`       |
| `state-chip-nj` | NJ FamilyCare (kids)               | reference | _never_       | `200`       |
| `state-chip-nm` | NM Centennial Care (kids)          | reference | _never_       | `200`       |
| `state-chip-nv` | Nevada Check Up                    | reference | _never_       | 🔴 `404`    |
| `state-chip-ny` | Child Health Plus                  | reference | _never_       | `200`       |
| `state-chip-oh` | Ohio Medicaid for Children         | reference | _never_       | `200`       |
| `state-chip-ok` | SoonerCare (OK CHIP)               | reference | _never_       | `200`       |
| `state-chip-or` | Oregon Health Plan (kids)          | reference | _never_       | `200`       |
| `state-chip-pa` | PA CHIP                            | reference | _never_       | 🔴 `000ERR` |
| `state-chip-ri` | RIte Care (RI Medicaid for kids)   | reference | _never_       | 🔴 `404`    |
| `state-chip-sc` | Healthy Connections (SC, kids)     | reference | _never_       | 🔴 `000ERR` |
| `state-chip-sd` | SD CHIP                            | reference | _never_       | `200`       |
| `state-chip-tn` | CoverKids                          | reference | _never_       | 🔴 `000ERR` |
| `state-chip-tx` | Texas CHIP                         | reference | _never_       | 🔴 `404`    |
| `state-chip-ut` | UT CHIP                            | reference | _never_       | `200`       |
| `state-chip-va` | FAMIS (VA CHIP)                    | reference | _never_       | 🔴 `404`    |
| `state-chip-vt` | Dr. Dynasaur                       | reference | _never_       | `200`       |
| `state-chip-wa` | Apple Health for Kids              | reference | _never_       | 🔴 `404`    |
| `state-chip-wi` | BadgerCare Plus (WI, kids)         | reference | _never_       | `200`       |
| `state-chip-wv` | WVCHIP                             | reference | _never_       | `200`       |
| `state-chip-wy` | Kid Care CHIP                      | reference | _never_       | `200`       |

</details>
