#!/usr/bin/env bash
# Audit external links cited from the codebase.
#
# Extracts every http(s) URL from src/data/sources.ts and hits each with
# curl. Writes a dated TSV to `results/` with columns:
#
#   status, url, final_url
#
# Curl tells us if a link loads; only a human can tell us whether the loaded
# page still cites what we claim. The human-review log lives separately in
# `reviewed.tsv`, keyed by source id (a stable slug) rather than URL — so
# review history follows a citation across URL changes. Both inputs are
# joined downstream by generate-status.mjs and the React /sources page.
#
# Usage:
#   ./audit/links/check.sh
#   yarn check-links
#
# Requires: bash, curl, grep, xargs, awk.

set -euo pipefail

ROOT="$(git rev-parse --show-toplevel)"
DATE="$(date -u +%Y-%m-%d)"
DIR="$ROOT/audit/links"
OUTDIR="$DIR/results"
OUT="$OUTDIR/$DATE.tsv"
REVIEWS="$DIR/reviewed.tsv"
mkdir -p "$OUTDIR"

# UA tradeoff documented honestly: the identifying audit UA gets refused
# by some state-agency sites (false-positive 000ERR / 403 / 999), while
# browser-spoofing UAs get refused by some federal sites (medicaid.gov,
# dhs.state.mn.us reject them on TLS handshake). No single UA wins for
# everyone, so we keep the honest audit identity and accept that a
# handful of state agencies will produce false-positive failures —
# those get caught and resolved with kind=human reviewed.tsv rows
# noting "verified live in browser" rather than fought over via UA games.
UA="Mozilla/5.0 (compatible; BudgetAtlas-link-audit; +https://github.com/TheBudgetAtlas/thebudgetatlas)"

URLS_FILE=$(mktemp)
RAW_FILE=$(mktemp)
trap 'rm -f "$URLS_FILE" "$RAW_FILE"' EXIT

echo "→ Extracting URLs from src/data/sources.ts (the citation registry)..."
# Only check the citation registry. Non-citation URLs in the codebase (font CDN
# preconnects, repo references, build artifacts, settings files, etc.) are
# deliberately excluded by sourcing this from one place rather than greping
# the whole tree. See src/data/sources.ts for the registry rationale.
grep -Eo 'https?://[^ )"`'"'"'<>]+' "$ROOT/src/data/sources.ts" \
  | sort -u > "$URLS_FILE"

COUNT=$(wc -l < "$URLS_FILE" | tr -d ' ')
echo "→ Found $COUNT unique URLs. Checking (curl, 20s timeout, 20× parallel)..."

check_one() {
  local url="$1"
  local status final
  status=$(curl -L -s -o /dev/null -w "%{http_code}" -m 20 -A "$UA" "$url" 2>/dev/null || echo "ERR")
  final=$(curl -L -s -o /dev/null -w "%{url_effective}" -m 20 -A "$UA" "$url" 2>/dev/null || echo "")
  # Each line is well under PIPE_BUF, so concurrent appends are atomic.
  printf '%s\t%s\t%s\n' "$status" "$url" "$final" >> "$RAW_FILE"
}

# Run with bounded concurrency. xargs -P on macOS chokes on long arg lists,
# so spawn jobs directly and wait every N to keep ~N in flight.
: > "$RAW_FILE"
N=20
running=0
while IFS= read -r url; do
  [ -z "$url" ] && continue
  check_one "$url" &
  running=$((running + 1))
  if [ "$running" -ge "$N" ]; then
    wait
    running=0
  fi
done < "$URLS_FILE"
wait

# Sort the raw curl output deterministically by URL so identical runs produce
# byte-identical TSVs and git diffs only show real changes (parallel curl
# writes finish in non-deterministic order otherwise).
LC_ALL=C sort -t$'\t' -k2,2 -o "$RAW_FILE" "$RAW_FILE"

{
  printf 'status\turl\tfinal_url\n'
  cat "$RAW_FILE"
} > "$OUT"

echo ""
echo "→ Status distribution:"
awk -F'\t' 'NR>1 {print $1}' "$OUT" | sort | uniq -c | sort -rn
echo ""
REVIEWED=$(grep -cv -E '^(#|id\t|$)' "$REVIEWS" 2>/dev/null || echo 0)
echo "→ Human-reviewed entries in reviewed.tsv: $REVIEWED"
echo ""
echo "→ Hard 404s:"
awk -F'\t' 'NR>1 && $1=="404" {print "  "$2}' "$OUT" || true
echo ""
echo "→ Regenerating audit/links/status.md..."
node "$DIR/generate-status.mjs"

# Stable-filename copy of the latest run, used by the React /sources page so
# the built bundle imports only one TSV instead of every dated one. Always
# overwritten; dated files in results/ remain as the per-day audit history.
cp "$OUT" "$DIR/results/latest.tsv"

# Dual-write to the D1-backed audit API. Best-effort during the backend
# stand-up phase: a failed POST shouldn't block the rest of the audit
# pipeline (PR creation, issue seeding) since the in-repo TSVs remain
# the source of truth until PR B switches the site to read from the API.
if [ -n "${AUDIT_WRITE_TOKEN:-}" ]; then
  echo ""
  echo "→ Posting run to audit API..."
  if AUDIT_WRITE_TOKEN="$AUDIT_WRITE_TOKEN" \
       API_BASE="${AUDIT_API_BASE:-https://thebudgetatlas.com}" \
       node "$DIR/post-run.mjs" "$OUT" "$DATE"; then
    echo "  ok"
  else
    echo "  WARN: post-run failed; in-repo TSV remains source of truth"
  fi
fi

echo ""
echo "→ Results: $OUT"
echo ""
echo "Status code interpretation:"
echo "  200       — loaded; verify the destination still cites the claimed content"
echo "  3xx       — followed a redirect; final URL recorded in column 3"
echo "  403/999   — bot-blocked by the server; usually fine in a real browser"
echo "  404       — page is gone; needs a replacement citation or removal"
echo "  000/ERR   — DNS/TLS/timeout; needs a manual browser check"
echo ""
echo "To record a manual review, add a row to audit/links/reviewed.tsv."
