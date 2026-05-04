# Cities.ts vs BLS CEX 2023-2024 — verification report

**Date:** 2026-05-03  
**Reviewer:** Claude (AI), values pulled from raw BLS xlsx + spot-checked  
**Source:** [BLS Consumer Expenditure Survey, Geographic Tables, 2-year average 2023-2024](https://www.bls.gov/cex/tables/geographic/mean.htm)  
**Files referenced:** `cu-msa-{midwest,northeast,south,west}-2-year-average-2023-2024.xlsx`

## Scope

Compared `groceries`, `utilities`, `carCost`, `healthFamily` in `src/data/cities.ts` against per-CU annual values from the CEX MSA tables for the 11 curated cities that have a direct MSA match: nyc, sf, la, bos, sea, dc, mia, chi, den, atl, phx.

`transit`, `childcareInfant`, `childcarePreschool`, `healthSingle`, `rent1`, `rent3` are not covered here — CEX doesn't break them out cleanly. Separate verification needed against MTA / Care.com / KFF / Zillow.

Cities **not** in CEX MSA tables (aus, nash, cmh, pit, bham, jxn, rural\_\*) need a different sourcing path — likely the regional/division CEX files combined with state-level adjustments.

## Comparison (current model values vs CEX-derived)

| slug | MSA           | groc cur | groc CEX |    Δ | util cur | util CEX |    Δ | car cur | car CEX |    Δ | hcareF cur | hc CEX |     Δ |
| ---- | ------------- | -------: | -------: | ---: | -------: | -------: | ---: | ------: | ------: | ---: | ---------: | -----: | ----: |
| nyc  | New York      |     $510 |     $390 | +31% |     $220 |     $411 | -47% |  $1,100 |    $796 | +38% |     $1,500 |   $504 | +198% |
| sf   | San Francisco |     $540 |     $532 |  +2% |     $180 |     $390 | -54% |  $1,050 |  $1,250 | -16% |     $1,500 |   $576 | +160% |
| la   | Los Angeles   |     $480 |     $341 | +41% |     $170 |     $410 | -59% |  $1,000 |  $1,092 |  -8% |     $1,400 |   $492 | +184% |
| bos  | Boston        |     $500 |     $536 |  -7% |     $200 |     $431 | -54% |  $1,000 |  $1,028 |  -3% |     $1,400 |   $622 | +125% |
| sea  | Seattle       |     $470 |     $474 |  -1% |     $170 |     $397 | -57% |    $950 |  $1,191 | -20% |     $1,400 |   $562 | +149% |
| dc   | Washington DC |     $470 |     $448 |  +5% |     $190 |     $422 | -55% |    $980 |  $1,218 | -20% |     $1,400 |   $690 | +103% |
| mia  | Miami         |     $460 |     $257 | +79% |     $200 |     $318 | -37% |    $980 |    $894 | +10% |     $1,450 |   $372 | +290% |
| chi  | Chicago       |     $420 |     $407 |  +3% |     $180 |     $380 | -53% |    $900 |    $936 |  -4% |     $1,300 |   $593 | +119% |
| den  | Denver        |     $440 |     $396 | +11% |     $160 |     $392 | -59% |    $920 |  $1,261 | -27% |     $1,300 |   $634 | +105% |
| atl  | Atlanta       |     $400 |     $332 | +20% |     $170 |     $407 | -58% |    $900 |  $1,057 | -15% |     $1,280 |   $521 | +146% |
| phx  | Phoenix       |     $420 |     $340 | +23% |     $200 |     $430 | -54% |    $900 |  $1,365 | -34% |     $1,280 |   $589 | +117% |

**Conventions used to derive CEX targets:**

- **groceries** (per-person monthly; `lib/budget.ts` multiplies by `householdSize`): `food_total / 12 / people` — uses food-total (food at home + food away) since the field colloquially captures both.
- **utilities** (per-CU monthly): `Utilities, fuels, and public services / 12` — but see structural note below.
- **carCost** (per-CU monthly): `(vehicle_purchase + gasoline + other_vehicle) / 12` — excludes public transport since cities.ts has a separate `transit` field.
- **healthFamily** (per-CU monthly, applied when `adults===2 || kids>0`): `Healthcare / 12`.

## Findings by field

### Groceries — moderate drift, clean mapping

11/11 cities within ±80%; 7/11 within ±25%. The biggest outliers are Miami (+79%) and LA (+41%). The model values track CEX direction reasonably (NYC > Chi > Atl > rural). **This is the cleanest single update if you want one.**

**Structural caveat:** `lib/budget.ts` multiplies `groceries × householdSize` linearly, which ignores economies of scale (a 4-person family doesn't actually buy 4× a solo's groceries). CEX shows ~1.6× scaling from 1-person to 4-person CUs, not 4×. **See issue #128.**

### Utilities — universal -50% to -60% drift, but definitional mismatch

BLS "Utilities, fuels, and public services" **includes telephone services and water** alongside electric/gas. `cities.ts` has a separate `phoneInternet` field (~$130/mo in `lib/budget.ts`). Subtract ~$130/mo phone from the CEX target and you get:

- NYC: $411 - $130 = $281 (current $220) → -22% drift
- SF: $390 - $130 = $260 (current $180) → -31% drift
- Avg residual: ~-30% even after the subtraction.

Likely a real underestimate, but the right calibration depends on resolving the **utilities scope question**. **See issue #129.**

### Car costs — mixed direction, mostly reasonable

Drift varies in sign (NYC +38%, Phoenix -34%). Sample includes 0-vehicle households (NYC), so direct comparison overstates per-vehicle cost. Within tolerance for an editorial model. **Skip update unless paired with vehicle-ownership-rate adjustment.**

### Healthcare — 2-3× over, definitional mismatch

CEX "Healthcare" is **out-of-pocket spending + employee premium share + Medicare premiums + supplements**, averaged across all CUs (employed, retired, uninsured). `cities.ts` `healthFamily` appears to model the **full employer-sponsored family premium**, which KFF 2024 puts at ~$25,572/yr ($2,131/mo all-in) or ~$6,296/yr employee contribution ($525/mo).

CEX won't resolve this — it answers a different question. The right source is KFF Employer Health Benefits Survey, already cited. **Need to clarify what `healthFamily` means in the model. See issue #130.**

## Recommended direction: capture more, don't just calibrate

User direction (2026-05-03): _"capture as much actual information in our model as possible, so if there is additional data here let's add it in."_

The drift findings above suggest the right move isn't tweaking single fields toward CEX averages — it's **expanding the schema** to hold the BLS line items the data actually publishes, then deriving today's higher-level fields from them.

### Proposed schema expansion (per city, per CU monthly unless noted)

Replacing the four current fields with finer-grained line items pulled directly from CEX:

| current field                   | proposed expansion                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `groceries` (per-person)        | `foodAtHome` (per-CU) + `foodAway` (per-CU); model derives per-CU vs per-person via household-size equivalence      |
| `utilities` (per-CU, narrow)    | `utilitiesElectricGas` + `utilitiesWaterPublic` (BLS "Water and other public services" minus phone)                 |
| `carCost` (per-CU, all-vehicle) | `vehiclePurchase` + `gasoline` + `vehicleOther` (CEX direct lines)                                                  |
| `healthFamily` / `healthSingle` | `healthcarePremiumFamily` / `healthcarePremiumSingle` (KFF) + `healthcareOOP` (CEX) — total = premium contrib + OOP |
| _(new)_                         | `apparelServices` (CEX "Apparel and services")                                                                      |
| _(new)_                         | `entertainment` (CEX "Entertainment")                                                                               |
| _(new)_                         | `personalCare` (CEX "Personal care products and services")                                                          |
| _(new)_                         | `education` (CEX "Education" — distinct from childcare; tuition + supplies)                                         |
| _(new, from BLS detail)_        | `householdOperations` + `housekeepingSupplies` + `furnishings` (currently rolled into "personalEssentials")         |

Each new field gets a CEX citation per city where MSA data exists, and falls back to regional/division CEX for cities without an MSA cut.

### Geographic coverage — all four CEX levels

Per-cell sourcing should fall back through 4 granularities:

1. **MSA** (~22 metros, `cu-msa-*` files) — most specific.
2. **State** (51) — built from regional CEX + state COL adjustments (BEA RPP / BLS Regional Price Parities).
3. **Division/sub-region** (9, `cu-division` file) — New England, Mid-Atlantic, East North Central, West North Central, South Atlantic, East South Central, West South Central, Mountain, Pacific.
4. **Region** (4, `cu-region` file) — Northeast, Midwest, South, West. The floor; every city falls back here.

Cities without an MSA cut (aus, nash, cmh, pit, bham, jxn, rural\_\*) inherit from state, then division, then region.

### Required follow-on changes

1. `src/types.ts` — extend `CityInfo` and add `StateInfo` / `DivisionInfo` / `RegionInfo` shapes (additive, can land incrementally).
2. `src/lib/budget.ts` — derive existing budget categories from finer-grained inputs; replace `personalEssentials = 120 × householdSize × lifestyle` with explicit apparel + entertainment + personal-care + household-operations summed. Implement city > state > division > region fallback.
3. `src/data/cities.ts` (and new `regions.ts` / `divisions.ts`) — populate new fields at each level from CEX data.
4. `src/data/sources.ts` — citations are already covered by `bls-cex` / `bls-cex-regional`; add `bls-cex-division` if needed.
5. `src/components/Notes.tsx` and bracket-walkthrough — surface the new line items + the granularity each value was sourced at (MSA / state / division / region).

### Roadmap

Tracked as roadmap entry #131 — "Expand cost-of-living schema with full BLS CEX line items," separate from this verification PR.

## Per-field findings (revised)

| field        | finding                                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| groceries    | split into `foodAtHome` + `foodAway`; fix economy-of-scale scaling (issue #128)                                          |
| utilities    | split into electric+gas vs water+public services; settle phone/internet boundary (issue #129)                            |
| carCost      | split into purchase + gas + other-vehicle; differs by region in BLS                                                      |
| healthFamily | split into premium contribution (KFF) + OOP (CEX); current value conflates the two (issue #130)                          |
| _(new)_      | apparel, entertainment, personal care, education, household operations — all currently absent or rolled into "lifestyle" |

## Out of scope (for this PR)

- Cities not in CEX MSA tables (aus, nash, cmh, pit, bham, jxn, rural\_\*)
- `STATE_DEFAULTS` block in `cities.ts` (lines ~399+) — needs separate pass against CEX regional/division files
- Childcare values (need Care.com / Child Care Aware verification)
- Rent values (need RentCafe / Zillow verification)
- Single healthcare premium (`healthSingle`) — paired with `healthFamily` decision
- Local tax rates
