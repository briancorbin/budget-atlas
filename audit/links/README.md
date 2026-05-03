# Link audit

Reproducible audit of every external URL cited from the codebase — does it still load, and (more importantly) does the loaded page still cite the content we claim it cites?

## How it works

1. **`check.sh`** extracts every `http(s)://` URL from [`src/data/sources.ts`](../../src/data/sources.ts) — the citation registry — hits each with curl, and writes a dated TSV to `results/`. Other URLs in the codebase (font CDN preconnects, repo links, build artifacts) aren't checked: only declared citations are auditable, by design.
2. **`reviewed.tsv`** is a hand-maintained log of human reviews — one row per URL where a person has actually opened the link and confirmed the destination still cites what we claim. The script joins these into the output.
3. **`results/<date>.tsv`** captures the union: machine status (does it load?) + human review state (did someone verify the content?).

A `200 OK` from curl only tells us _something_ loaded. Only a human can tell us whether the loaded page still cites the document we built the model around. Both columns matter.

## Running the audit

```bash
yarn check-links
# or directly:
./audit/links/check.sh
```

Requires bash + curl + grep + xargs + awk. Takes ~1 minute over all ~230 URLs at 20-way parallelism.

## Status code interpretation

| Code          | Meaning             | Action                                                                            |
| ------------- | ------------------- | --------------------------------------------------------------------------------- |
| `200`         | Loaded              | Verify the destination still cites the claimed content (human review)             |
| `3xx`         | Followed a redirect | Final URL recorded in column 3 — usually fine, sometimes signals a moved citation |
| `403` / `999` | Bot-blocked         | Usually fine in a real browser; manual check                                      |
| `404`         | Page is gone        | Replace the citation or remove the data point                                     |
| `000` / `ERR` | DNS/TLS/timeout     | Manual browser check; might be a transient outage or a domain that's gone         |

## Reviews must be 100% human

This is the load-bearing rule of the audit. **No AI assistance.** The whole point of human review is to catch the failure mode where a page loads but no longer cites what we claim — exactly the failure that automated checking can't detect (and that AI summarization can _create_ by hallucinating support that isn't there).

You must:

- Open the URL yourself in a browser.
- Read enough of the destination to verify the claim with your own eyes.
- Write the notes in your own words, based on what you actually saw.

Reviews that look AI-generated will be rejected. The submission form has a checkbox confirming this; treat it seriously. Ten honest human reviews are worth more than a hundred laundered through a chatbot — the audit is only as good as the discipline that backs it.

## Recording a manual review

When you've opened a URL and confirmed the cited content is still there:

```
url<TAB>YYYY-MM-DD<TAB>your-handle<TAB>brief notes
```

Append a row to `reviewed.tsv`. The next audit run will pick it up.

Be honest in the notes — if the page moved but the content is the same, say so. If the document was superseded but the new one still backs the same claim, say so. The notes are the audit trail.

## Automation

The audit runs nightly via [GitHub Actions](../../.github/workflows/audit-links.yml) (09:00 UTC) and can be triggered manually from the Actions tab. The nightly job:

1. Runs `check.sh` against the current `main` branch.
2. Compares the resulting failures against open issues labeled [`audit:link`](https://github.com/TheBudgetAtlas/thebudgetatlas/issues?q=is%3Aopen+label%3Aaudit%3Alink).
3. Creates a new issue per newly-broken URL (deduped by URL in body). Hard cap of 50 issues per run as a safety valve.
4. Uploads the dated TSV as a workflow artifact (90-day retention).

Issues track `404`, `000`/`ERR`, and `999` outcomes. `200`/`3xx` aren't issued — they live in `reviewed.tsv` instead. `403` is excluded too (almost always bot-blocking that resolves under human eyes).

To seed issues manually from a local audit run: `yarn audit:seed-issues` (or `--dry-run` to preview).

## At-a-glance status

[`status.md`](./status.md) is the human-readable view of every cited source — auto-generated each audit run. One row per source, with current curl status, who added it, when, and any human-review history. Sort order is broken-first so the things needing attention surface immediately.

## Contributing a fix

1. Run the audit. Pick a finding from `results/<latest>.tsv`.
2. Open the URL yourself. Read the destination. Decide what's actually broken.
3. If a replacement URL exists for the same document, update both the data file and the README in lockstep (citations are mirrored — see [CLAUDE.md](../../CLAUDE.md) on the citation discipline).
4. Add a row to `reviewed.tsv` with your review notes.
5. Open a PR. Commit message should distinguish _URL moved_ (cosmetic) from _citation was substantively wrong_ (epistemic). The HUD Handbook 4350.3 fix in commit [`342056b`](https://github.com/TheBudgetAtlas/thebudgetatlas/commit/342056b) is a worked example of the latter — wrong URL _and_ wrong date.

## Known patterns to watch for

- **The `date` field that lies.** Citations entered from semantic memory often have the year the citation was _entered_, not the year the document was _published_. Cross-check against the document's actual revision date.
- **Deep PDF links rot fastest.** Prefer the canonical landing page; the agency is more likely to maintain that URL than a `/sites/dfiles/...` deep link.
- **Primary > secondary.** When a secondary source (operational handbook) cites a primary source (federal register notice, statute), prefer the primary. It's more durable and more rigorous.
- **Continuously-updated regulations beat dated handbooks.** If the eCFR has the same rule as a 2013 handbook, cite the eCFR — it has version history baked in.
