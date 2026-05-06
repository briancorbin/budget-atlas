# Link audit — findings

Triage view of currently-actionable links. Live machine status comes from the [audit API](https://thebudgetatlas.com/api/audit/latest) (and is rendered at [/sources](https://thebudgetatlas.com/sources)); this doc is the human-curated triage layer on top.

## Status snapshot — 2026-05-02

| Status              |   Count | Action                                                          |
| ------------------- | ------: | --------------------------------------------------------------- |
| `200` (loaded)      |     157 | Spot-check for content drift; mark `reviewed.tsv` when verified |
| `404` (gone)        |      43 | **Replace or remove.** Highest priority.                        |
| `403` (bot-blocked) |      17 | Manual browser check; almost always fine                        |
| `000` / `ERR`       |       5 | DNS/TLS/timeout — manual check                                  |
| `999` (anti-bot)    |       3 | Manual browser check                                            |
| **Total**           | **225** |                                                                 |
| Manually reviewed   |       1 | HUD Handbook 4350.3 (resolved 2026-05-02)                       |

The audit runs nightly via [GitHub Actions](https://github.com/TheBudgetAtlas/thebudgetatlas/actions/workflows/audit-links.yml) and auto-creates issues with the [`audit:link`](https://github.com/TheBudgetAtlas/thebudgetatlas/issues?q=is%3Aopen+label%3Aaudit%3Alink) label for any newly broken citation. Pick one up by commenting on the issue and PRing a fix.

## Resolved

- ✅ **HUD Handbook 4350.3** — was 404 at `/sites/dfiles/OCHCO/documents/4350.3.pdf`. Replaced with the canonical HUDCLIPS landing page. Also fixed the `date` field (was `'2023'`, the year someone entered the citation; corrected to `'2013-11'`, the document's actual revision date — Change 4 REV-1). See commit [`342056b`](https://github.com/TheBudgetAtlas/thebudgetatlas/commit/342056b) and `reviewed.tsv` row.

## Open — hard 404s

These are unambiguously broken. Each needs a replacement citation, removal of the data point, or substitution with an equivalent authoritative source. To pick one up: see the contribution flow in [`README.md`](./README.md).

The full current list of 404s is the easiest thing to query from the audit API:

```bash
curl -s https://thebudgetatlas.com/api/audit/latest \
  | jq -r '.results[] | select(.status == "404") | .url'
```

Most are state-agency Medicaid / SNAP / CHIP / tax authority pages that have been moved in agency reorgs. State-by-state, they typically follow predictable patterns (e.g. `dhss.alaska.gov` migrating to `health.alaska.gov`), so they go quickly once you find the new domain root.

## Open — needs human review (currently-200 links)

233 total URLs minus 1 manually reviewed (HUD) = **232 still need a human eyeball pass**. A `200` from curl is necessary but not sufficient — the HUD case proved a "looked fine to curl" link can still be wrong. Reviewing them in batches over time is fine; the goal is steady increase in the manually-reviewed count, not a single heroic sweep.

When reviewing in bulk, work file-by-file and category-by-category — e.g. "all federal IRS sources" or "all Massachusetts state agency links" — so you can build context and move quickly through similar ones.
