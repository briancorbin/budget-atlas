# BLS Consumer Expenditure Survey — local mirrors

Local copies of BLS CEX xlsx tables consumed by [`src/data/cex.ts`](../../../src/data/cex.ts) to populate the line-item cost-of-living schema (issue [#131](https://github.com/TheBudgetAtlas/thebudgetatlas/issues/131)).

## Why mirror these in the repo?

- **Reproducibility.** Anyone can re-extract any cell of the schema deterministically without depending on `bls.gov` being reachable. The audit pipeline already logs BLS as `verified-bot-blocked` for our scrapers — a local mirror sidesteps that entirely for data-fill PRs.
- **Cross-referencing the audit trail.** When a `reviewed.tsv` row says "extracted Mean values from Table 1800," the literal Table 1800 xlsx is two clicks away in the same repo at the same commit.
- **Vintage pinning.** The mirror's filename encodes the publication vintage (2024 single-year vs. 2023-2024 two-year average). When BLS publishes a newer vintage, the schema bump is a separate PR that adds a new file and updates the consumer — old mirror stays for diff comparisons.

## Source of truth

The canonical source is still BLS itself: <https://www.bls.gov/cex/tables.htm>. These mirrors are convenience copies of the public xlsx files BLS publishes there. If a mirror disagrees with what's currently on bls.gov for the same vintage, BLS wins — file an issue and update the mirror.

## Layout

```
audit/data-sources/bls-cex/
├── 2023-2024/   — Two-year averages. BLS publishes geographic detail
│                  (region/division/MSA) only as 2-year averages because
│                  single-year MSA samples are too thin. The latest
│                  vintage is always one year behind the income tables.
└── 2024/        — Single-year tables. Demographic and income cuts.
                   Publishes annually.
```

### `2023-2024/` (geographic, 2-year-average)

- `cu-region-2-year-average-2023-2024.xlsx` — Table 1800. 4 Census regions × all line items. Consumed by `REGION_ALLCU_SPENDING`.
- `cu-division-2-year-average-2023-2024.xlsx` — Table 2700. 9 Census divisions × all line items. Consumed by `DIVISION_ALLCU_SPENDING`.
- `cu-msa-{northeast,midwest,south,west}-2-year-average-2023-2024.xlsx` — Tables 3501–3504. Per-MSA spending. Not yet wired (city-axis schema work pending).
- `cu-population-area-size-2-year-average-2023-2024.xlsx` — Table 1900. CU spending by metro/non-metro and population size. Reference only — not currently consumed by the model.

### `2024/` (single-year)

- `cu-region-1-year-average-2024.xlsx` — Geographic single-year reference. Less reliable for region-level cuts than the 2-year-average; kept for cross-checking.
- `cu-income-before-taxes-2024.xlsx` — Table 1101 top-line: spending shape by mean income before taxes. Companion to the quintile/decile cuts.
- `cu-income-quintiles-before-taxes-2024.xlsx` — **The income axis.** 5 quintiles × all line items. Consumed by `NATIONAL_QUINTILE_SPENDING` and `QUINTILE_THRESHOLDS_2024`.
- `cu-income-deciles-before-taxes-2024.xlsx` — Same data as quintiles, but split into 10 deciles. Higher-resolution alternative for future work.
- `cu-size-2024.xlsx` — Spending by household size (1-person CU, 2-person CU, etc.). Calibration reference for the `householdSize` scaling decision in [issue #128](https://github.com/TheBudgetAtlas/thebudgetatlas/issues/128).
- `cu-composition-2024.xlsx` — Spending by household composition (single, couple, single-parent, married-with-children, etc.). Cross-check for the model's filing-status logic.
- `cu-earners-2024.xlsx` — Spending by number of earners in the CU.
- `cu-housing-tenure-2024.xlsx` — Spending by tenure (homeowner with mortgage / homeowner without / renter). Will inform the homeownership feature ([roadmap #13](../../../src/data/roadmap.ts)).
- `cu-education-highest-2024.xlsx` — Spending by highest education attained.
- `cu-area-type-2024.xlsx` — Metropolitan vs. non-metropolitan single-year split.
- `cu-population-area-size-2024.xlsx` — Population-bucketed single-year split.
- `reference-person-age-{ranges,splits,generation}-2024.xlsx` — Spending by age of the reference person, three different cuts.
- `reference-person-race-2024.xlsx` — Spending by race of the reference person.
- `reference-person-latino-2024.xlsx` — Spending by Hispanic-or-Latino origin of the reference person.
- `reference-person-occupation-2024.xlsx` — Spending by occupation of the reference person.

## Reading these files

`openpyxl` works directly on the xlsx:

```python
import openpyxl
wb = openpyxl.load_workbook(
    "audit/data-sources/bls-cex/2024/cu-income-quintiles-before-taxes-2024.xlsx",
    data_only=True,
)
ws = wb[wb.sheetnames[0]]   # always one sheet, named like "Table 1101"
# Row 1 = title; row 3 = column headers; rows 4+ = data
# Spending categories appear as a label row followed by Mean / SE / RSE rows.
```

The geographic tables (Tables 1800 / 2700) and the income tables (Table 1101) all share the same shape: `[Item, ...columns of values]` with `Mean`/`SE`/`RSE` triplets under each category label. See `src/data/cex.ts` for examples of the extraction pattern.

## Vintage policy

When BLS publishes a newer vintage, the workflow is:

1. Drop the new xlsx into the appropriate directory alongside the older one (don't overwrite).
2. Open a follow-up PR that updates the consumer in `src/data/cex.ts` to read from the new vintage.
3. Update the source citation's `date` field in `src/data/sources.ts` and add a paired `audit/links/reviewed.tsv` row noting the vintage refresh.
4. Old vintage stays in the mirror for diff comparison; remove only after a full release cycle of the new vintage being load-bearing.
