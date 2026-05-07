#!/usr/bin/env bash
# Snapshot the production D1 database into local D1 for offline iteration.
#
# Useful when:
#   - You want realistic data for a local Worker without re-running the
#     nightly audit against your machine.
#   - You're testing a schema migration and need a representative dataset.
#   - You're debugging a UI that depends on a specific run's results.
#
# What it does:
#   1. Exports the remote (production) D1 to a SQL dump.
#   2. Drops the local audit_runs / audit_results tables (and the dump's
#      CREATE TABLE statements rebuild them with the prod schema).
#   3. Applies the dump to local D1.
#   4. Cleans up the temp file.
#
# Usage:
#   yarn db:sync                  # preferred — wraps with op run automatically
#   op run --env-file=.env.audit -- ./audit/links/sync-d1-from-prod.sh
#
# Requires CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID to be set in
# the environment. The yarn entry point pulls both from .env.audit via
# the 1Password CLI; running the script directly without those env vars
# will fail at the wrangler call below.
#
# OAuth tokens from `wrangler login` won't work — the /export endpoint
# rejects them. Create an API token at
# https://dash.cloudflare.com/profile/api-tokens with the
# "Edit Cloudflare Workers" template.

set -euo pipefail

DB=budget-atlas-audit
DUMP="$(mktemp -t budget-atlas-d1-prod.XXXXXX).sql"
trap 'rm -f "$DUMP"' EXIT INT TERM

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ] || [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  echo "✘ CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must both be set." >&2
  echo "   Run via 'yarn db:sync' (which loads them from .env.audit)," >&2
  echo "   or wrap manually with: op run --env-file=.env.audit -- $0" >&2
  exit 1
fi

echo "→ Exporting remote $DB to $DUMP..."
wrangler d1 export "$DB" --remote --output="$DUMP"

echo ""
echo "→ Wiping local $DB tables..."
wrangler d1 execute "$DB" --local \
  --command="DROP TABLE IF EXISTS audit_results; DROP TABLE IF EXISTS audit_runs;"

echo ""
echo "→ Applying dump to local $DB..."
wrangler d1 execute "$DB" --local --file="$DUMP"

echo ""
echo "✨ Local D1 now mirrors production."
echo "   Start the local Worker with:  yarn dev:worker"
