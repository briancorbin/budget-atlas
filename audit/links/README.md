# Link audit

Reproducible audit of every external URL cited from the codebase — does it still load, and (more importantly) does the loaded page still cite the content we claim it cites?

## How it works

1. **`check.sh`** extracts every `http(s)://` URL from [`src/data/sources.ts`](../../src/data/sources.ts) — the citation registry — hits each with curl, and POSTs the run to the D1-backed audit API at `/api/audit/runs`. Other URLs in the codebase (font CDN preconnects, repo links, build artifacts) aren't checked: only declared citations are auditable, by design.
2. **`reviewed.tsv`** is the unified resolution log (see below). One row per `id · date · reviewer · kind · notes` event — keyed by stable source slug, not URL, so review history follows a citation across URL changes. `kind` is `human` (eyes-on-source) or `ai` (AI involved in proposing/extracting). **Rows are append-only**: existing rows can't be modified, removed, or reordered (CI enforces this via `scripts/check-reviewed-immutable.mjs`). If a past review needs correction, append a new row that supersedes it — don't edit history.
3. The **D1 backend** holds machine status history (every nightly run, every URL); `reviewed.tsv` holds human review state. The /sources page joins them at render time. Past runs are queryable via `/api/audit/latest`, `/api/audit/runs/:date`, `/api/audit/history?url=...`.

A `200 OK` from curl only tells us _something_ loaded. Only a human can tell us whether the loaded page still cites the document we built the model around. Both inputs matter.

## Any source change pairs with a `reviewed.tsv` row

The registry never changes silently. **Every state transition** on a source in `sources.ts` lands in the same PR as a paired row in `reviewed.tsv`:

- **Adding a new source** → row dated today proves a human verified it before adding.
- **Changing an existing URL** (page moved, new canonical home) → row proves the human re-opened the new URL and confirmed content unchanged.
- **Updating data** that depended on a source (because the document was revised) → row describes what was checked and what changed.
- **Removing a source** → row records the verification that the citation no longer backs the claim.
- **Affirmative periodic review** (no change, just verification) → row is the entire deliverable.

A source whose latest state-change isn't paired with a row gets flagged as overdue by the [staleness audit](../staleness/) immediately. The asymmetry is deliberate: it catches AI-proposed citations that were merged without manual verification, URL updates made without re-reading the destination, and any human edits where the verification step got skipped. Every category should be visible.

## Two streams in, one stream out

The audit has **two ways things enter the queue** — and **one way things leave it**:

**In:**

- `audit:link` — bot-created when the nightly job sees a non-success curl status (404, ERR, 999) on a registry URL.
- `audit:report` — human-filed via the [Report a problem](../../.github/ISSUE_TEMPLATE/source-report.yml) form on `/sources` when someone notices a broken link, drifted content, or other issue.

**Out:**

- A row appended to `reviewed.tsv`, accompanied by whatever code changes the resolution required, in a single PR with `Closes #N` to the originating issue.

**Reports** flag problems. **Affirmative "this is correct" reviews** are a different activity entirely — reserved for periodic sweeps by maintainers / trusted reviewers and entered directly to `reviewed.tsv` (no issue lifecycle). The community submission form deliberately doesn't offer a "this looks fine" outcome; that asymmetry is by design (the incentive structure for "report a problem" is honest; the structure for "validate as fine" invites trust laundering).

## `reviewed.tsv` is the unified resolution log

**Every resolved audit issue — `audit:link` or `audit:report` — writes exactly one row to `reviewed.tsv`.** The row's notes explain what was done. Code changes (URL update in `sources.ts`, data-file edit, removal) happen in the same PR, but `reviewed.tsv` is always the durable "this got handled" log.

Why one rule for all resolutions: it collapses the mental model. There's exactly one place to look for "what's been resolved lately." Whether the resolution was "validated as-is," "URL was moved and we updated it," "data needed correction," or "citation was retired," it shows up the same way.

Worked examples:

| Resolution                                | What happens                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Validated as-is**                       | Append row to `reviewed.tsv` with notes confirming the page still cites the claim. No other file changes.                                                                                                                                                                                                    |
| **URL moved, content unchanged**          | Edit `sources.ts` (URL string only) + append row to `reviewed.tsv` noting "URL was moved; content unchanged."                                                                                                                                                                                                |
| **Document revised, data needs updating** | Edit the data file with the new numbers + edit `sources.ts` if the citation date changes + append row noting what was updated.                                                                                                                                                                               |
| **Citation no longer backs the claim**    | Remove the entry from `sources.ts` (and any data point that depended on it) + append row noting "Citation no longer backs the claim; removed from registry." The historical row stays in `reviewed.tsv` as audit trail; it won't render on `/sources` since no source has that id anymore, which is correct. |

The PR that lands the resolution should `Closes #N` to auto-close the originating issue.

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

## Reviews record what kind of verification happened

The audit's value comes from honest accounting of how each citation got verified. The `kind` column on every review row makes that explicit:

- `human` — eyes-on-source, no AI assistance. Strongest evidence. You opened the URL yourself, read the destination, and confirmed the claim with your own eyes.
- `ai` — AI was involved in proposing, extracting, or refreshing the entry. Whatever human review followed (a glance, a careful read, none) is self-reported and unverifiable, so the kind doesn't try to subdivide.
- `verified-bot-blocked` — confirmation that a URL which curl reports as bot-blocked (typically status 999) loads in a real browser. **Lighter bar than `human`** — you only need to confirm the URL is reachable, not that the destination still cites the claim. **Suppresses that source from the broken-citation queue for 30 days** (deliberately tighter than the staleness cadence — bot-blocked URLs lose the nightly automated reachability check, so the human "this loads" verification is now the only liveness signal, and we compensate with a shorter re-verification rhythm). **Does NOT reset the staleness clock** — that still measures from your last full `human`/`ai` review. Use for legitimate sites with anti-bot defenses (LinkedIn, some state agency pages).

The audit's job is to make the level of human involvement **transparent**, not **absent**. AI assistance is allowed and useful, especially during active solo development — the column is the honest record. Don't launder AI work as `human`: if you weren't eyes-on-source, it's `ai`.

**Community-submitted reviews are `human`-only.** The `audit:report` issue template enforces this with explicit no-AI checkboxes — community channels are where bad-faith laundering hurts most, and we lean on the `human` discipline there to catch the failure mode where a page loads but no longer cites what we claim (the failure that AI summarization can _create_ by hallucinating support).

Maintainer rows can be either kind, marked honestly. Ten honest entries are worth more than a hundred laundered — the audit is only as good as the discipline that backs it.

## Recording a resolution

Whenever you resolve an audit issue (link or review) — append a row to `reviewed.tsv`:

```
id<TAB>YYYY-MM-DD<TAB>your-handle<TAB>kind<TAB>brief notes
```

`id` is the stable source slug from `src/data/sources.ts` — the outer key in `SOURCES` (e.g. `kff-employer-health-benefits`) or a synthesized `state-${kind}-${code}` for the per-state agency maps (e.g. `state-dor-ca`, `state-snap-tx`). Keying by id rather than URL means review history follows the source through URL changes — when an agency reorganizes a citation's URL, the prior reviews stay attached.

`kind` is `human` or `ai` (see definitions above). The earlier three-state vocabulary (`ai-assisted`, `ai-proposed`) still parses for backwards compatibility — both fold into `ai` at parse time. New rows should use `ai`.

Legacy rows in 4-column format (pre-`kind` schema) parse as `kind=human`.

Be honest in the notes — if the page moved but the content is the same, say so. If the document was superseded but the new one still backs the same claim, say so. If the citation was retired, say so. The notes are the audit trail.

The next audit run picks it up; the /sources page reflects the latest review on the relevant source row (or the row disappears, in the removal case).

## Schema migrations: the rotation pattern

When `reviewed.tsv` needs a structural change (a new column, a name change, padding legacy rows for tabular consistency), use a rotation rather than editing in place:

1. **Copy** the current `audit/links/reviewed.tsv` to `audit/links/archive/reviewed.<YYYY-MM-DD>.tsv`. The archive copy is verbatim — every byte preserved.
2. **Rewrite** `audit/links/reviewed.tsv` with all rows in the new schema.
3. **Verify** in CI: `scripts/check-reviewed-immutable.mjs` looks for every base row in the union of the live file plus `audit/links/archive/*.tsv`. As long as a row appears somewhere in that union, it counts as preserved.

The invariant being enforced is "no review row ever disappears from the audit trail" — _not_ "the live file is byte-for-byte append-only forever." That distinction matters: schema evolution would otherwise force a permanent mixed-format file (4-col legacy rows interleaved with 5-col current rows interleaved with 6-col future-schema rows) and break tooling that expects consistent shape.

The 2026-05-03 rotation is the worked example — four legacy 4-col rows got padded to 5-col, the pre-rotation file was archived. The check passed because the four original-shape rows are still reachable in `archive/reviewed.2026-05-03.tsv`.

A rotation is an intentional, recorded operation — it produces a new archive file, a rewritten live file, and a header note pointing at the archive. It can't be used to silently rewrite history because every "removed" row has to land somewhere in the archive set, and CI checks that.

## Automation

The audit runs nightly via [GitHub Actions](../../.github/workflows/audit-links.yml) (09:00 UTC) and can be triggered manually from the Actions tab. The nightly job:

1. Runs `check.sh` against the current `main` branch — probes URLs and POSTs the run to `/api/audit/runs`.
2. Maintains a single rolling [`audit:link`](https://github.com/TheBudgetAtlas/thebudgetatlas/issues?q=is%3Aopen+label%3Aaudit%3Alink) issue with the current broken-citation queue, mirroring the staleness audit pattern. The issue is pinned to the top of the issues list.

Run history is queryable from anywhere that can hit the API; the repo no longer carries machine-generated audit data.

Status codes flagged: `404`, `000`/`ERR`, and `999`. `200`/`3xx` live in `reviewed.tsv`; `403` is excluded (almost always bot-blocking that resolves under human eyes).

The rolling-issue model means resolutions don't need `Closes #N` — the next audit run sees the URL is no longer broken and drops it from the issue body automatically. Per the unified resolution log, every fix PR appends a row to `reviewed.tsv` describing what changed.

To run manually: `yarn audit:seed-issues` (or `--dry-run` to preview).

## At-a-glance status

The [/sources page](https://thebudgetatlas.com/sources) is the human-readable view of every cited source — joined live with the latest audit run from the API and the human-review log. One row per source, with current curl status, who added it, when, and any human-review history. Sort order surfaces broken and overdue items first.

## Backend (D1)

Run history lives in a Cloudflare D1 database (`budget-atlas-audit`) bound to the site's worker. The schema is in [`worker/schema.sql`](../../worker/schema.sql); the worker entry point in [`worker/index.ts`](../../worker/index.ts) exposes:

- `POST /api/audit/runs` — upsert a run (bearer auth, `AUDIT_WRITE_TOKEN`).
- `GET  /api/audit/latest` — most-recent run as JSON.
- `GET  /api/audit/runs/:date` — specific run.
- `GET  /api/audit/history?url=…` — last 30 statuses for a URL.

The audit pipeline is fully API-backed — the nightly job POSTs runs, the /sources page fetches `/api/audit/latest`, the rolling broken-citation issue is seeded from `/api/audit/latest` + `/api/audit/history`. No machine-generated audit data lives in the repo. `reviewed.tsv` stays as the only file under version control because it's authored content (git history is meaningful).

**One-time bootstrap** (only relevant for setting up a fresh D1 instance, e.g. moving providers or recreating from scratch):

```sh
wrangler d1 create budget-atlas-audit
wrangler d1 execute budget-atlas-audit --remote --file=worker/schema.sql
# If old TSVs exist somewhere (e.g. an artifact), backfill-d1.mjs reads
# from a `results/` directory and POSTs each run.
AUDIT_WRITE_TOKEN=<token> node audit/links/backfill-d1.mjs
```

### Local backend

For backend changes (worker code, schema, API contract), run a local Worker against a local D1 so production stays untouched:

```sh
# 1. Apply the schema to local D1 (one-time, or after schema edits)
yarn dev:worker:seed

# 2. (Recommended) snapshot production D1 into local for realistic data
yarn db:sync

# 3. Start the local Worker on :8787 with local D1
yarn dev:worker

# 4. In another terminal, point the Vite dev server's /api proxy at the
#    local Worker instead of production
AUDIT_PROXY_TARGET=http://localhost:8787 yarn start
```

`yarn start` without `AUDIT_PROXY_TARGET` proxies to production — fine for UI-only work. The local Worker accepts any `AUDIT_WRITE_TOKEN` for writes (no secret is set unless you `wrangler secret put` against the local env), so `local-dev` is conventional but anything works.

State persists under `.wrangler/state/` (gitignored) between runs of `yarn dev:worker`, so you don't lose your local data when restarting.

## Contributing a fix

1. Pick an open issue (`audit:link` from the nightly bot, or `audit:report` from a community submission).
2. Open the URL yourself. Read the destination. Decide what the right outcome is.
3. Apply the code change if any (`sources.ts` edit for URL changes / removals; data-file edit for value corrections).
4. **Append a row to `reviewed.tsv`** describing the resolution — this is non-optional, even for "validated as-is."
5. Open a PR with `Closes #N` in the description. Commit message should distinguish _URL moved_ (cosmetic) from _citation was substantively wrong_ (epistemic). The HUD Handbook 4350.3 fix in commit [`342056b`](https://github.com/TheBudgetAtlas/thebudgetatlas/commit/342056b) is a worked example of the latter — wrong URL _and_ wrong date.

## Known patterns to watch for

- **The `date` field that lies.** Citations entered from semantic memory often have the year the citation was _entered_, not the year the document was _published_. Cross-check against the document's actual revision date.
- **Deep PDF links rot fastest.** Prefer the canonical landing page; the agency is more likely to maintain that URL than a `/sites/dfiles/...` deep link.
- **Original > reference.** When a reference source (operational handbook) cites an original source (federal register notice, statute, agency rule publication), prefer the original. It's more durable and more rigorous.
- **Continuously-updated regulations beat dated handbooks.** If the eCFR has the same rule as a 2013 handbook, cite the eCFR — it has version history baked in.
