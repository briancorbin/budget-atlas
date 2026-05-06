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
#   ./audit/links/sync-d1-from-prod.sh
#   yarn db:sync
#
# Requires: wrangler logged in (wrangler login) with access to the
# budget-atlas-audit D1 database in your Cloudflare account.

set -euo pipefail

DB=budget-atlas-audit
DUMP="$(mktemp -t budget-atlas-d1-prod.XXXXXX).sql"
trap 'rm -f "$DUMP"' EXIT INT TERM

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
