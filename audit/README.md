# Audit

Public, reproducible audits of the project's epistemic infrastructure — the citations, links, and data sources we lean on to claim the model says anything true.

This is the same transparency stance as the [funding ledger](../funding/ledger.md), applied to provenance instead of dollars: anyone can re-run an audit, see exactly what's broken or stale, and contribute a fix.

## Audits

- **[Link audit](./links/)** — Are the URLs cited from the codebase still alive, and do they still point at the document they claim to? (Nightly bot + community reports.)
- **[Staleness audit](./staleness/)** — Has any human eye verified each citation recently enough? (Weekly bot, tier-specific thresholds.)

## Why we audit

Every numeric value in the model has to trace to a source ([CLAUDE.md](../CLAUDE.md), [`feedback_data_citations.md`](https://github.com/TheBudgetAtlas/thebudgetatlas) — _"never ship 'round numbers I made up'"_). That discipline only works if the citations themselves stay honest:

- **Links rot.** Agencies reorganize, PDFs move, content gets revised. A `200 OK` from a stale URL feels like rigor but isn't.
- **Citations entered from memory look identical to citations entered from the source** — until someone audits them. The only way to catch a "I knew this document existed and filled in the year I'm citing it in" mistake is to actually open the document. (See the [HUD Handbook 4350.3 fix](https://github.com/TheBudgetAtlas/thebudgetatlas/commit/342056b) for a worked example.)
- **Public-good projects compound.** A model people trust to ground claims about taxes and household budgets has to earn that trust on every line of data, not just the ones that were correct on the day they were written.

## Contributing a fix

1. Run the audit (instructions in each sub-directory).
2. Pick a finding. Verify it yourself — open the URL, read the document, confirm what we cite is what's there.
3. Open a PR with the fix, including a one-line note in the commit message about _what changed_ (URL moved? document superseded? citation was substantively wrong?).

Bias toward primary sources over secondary, canonical landing pages over deep-link PDFs, and honest dates over impressive-looking ones.
