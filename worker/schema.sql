-- Schema for the link-audit backend (D1).
--
-- One row per (run_date, url): the curl status from the nightly audit,
-- plus the resolved final URL after redirects.
--
-- audit_runs is a thin metadata table — its primary purpose is recording
-- *when* a run completed, so the worker can answer "what's the latest
-- run" without scanning audit_results. Keying on run_date (YYYY-MM-DD)
-- keeps the table self-describing and lets the action POST idempotently
-- — re-running a given date overwrites instead of duplicating.
--
-- The (url, run_date DESC) index serves the flap-suppression query in
-- seed-issues.mjs ("last N statuses for this URL"). Composite PK on
-- (run_date, url) means inserts are deterministic and ON CONFLICT works
-- without ambiguity.

CREATE TABLE IF NOT EXISTS audit_runs (
  run_date   TEXT PRIMARY KEY,                      -- YYYY-MM-DD
  created_at INTEGER NOT NULL DEFAULT (unixepoch()) -- epoch seconds
);

CREATE TABLE IF NOT EXISTS audit_results (
  run_date  TEXT NOT NULL REFERENCES audit_runs(run_date) ON DELETE CASCADE,
  url       TEXT NOT NULL,
  status    TEXT NOT NULL,
  final_url TEXT,
  PRIMARY KEY (run_date, url)
);

CREATE INDEX IF NOT EXISTS idx_audit_results_url_date
  ON audit_results(url, run_date DESC);
