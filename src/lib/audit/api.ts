/**
 * Audit API contract — types + fetch.
 *
 * The Worker stood up in the audit-backend PRs (see worker/index.ts) is the
 * sole network surface this module describes. Every shape here mirrors
 * what the Worker returns; if the API grows, this is the file that grows
 * first, and the store layer above adapts.
 *
 * Kept deliberately thin: types + a single fetch function. No caching,
 * no React, no module-level state. The reactive layer lives in store.ts;
 * the domain layer lives in status.ts; UI lives one directory up. That
 * separation is what made the original sourceStatus.tsx feel cramped
 * once a real network call entered the picture.
 */

export interface AuditResult {
  url: string;
  status: string;
  final_url: string | null;
  /**
   * True iff `status` is in BROKEN_STATUS_CODES AND the URL has at least
   * one non-broken status across the trailing flap window (last 3 dated
   * runs ending at this run's date). Mirrors the suppression rule in
   * audit/links/seed-issues.mjs so the /sources page agrees with the
   * rolling broken-citation issue on which URLs are still flapping.
   *
   * Older Worker deployments may omit this field; callers should treat
   * `undefined` as `false` (no flap signal).
   */
  intermittent?: boolean;
}

export interface AuditLatestResponse {
  run_date: string;
  created_at: number;
  results: AuditResult[];
}

/**
 * Fetch the most-recent audit run from the public API. No auth — reads
 * are open since the data backs the public /sources page.
 *
 * Throws on non-2xx so callers can decide between failing loudly and
 * degrading silently (the store layer chose the latter; tests + scripts
 * may want different behaviour).
 */
export async function fetchLatestAudit(): Promise<AuditLatestResponse> {
  const res = await fetch('/api/audit/latest');
  if (!res.ok) throw new Error(`/api/audit/latest: HTTP ${res.status}`);
  return (await res.json()) as AuditLatestResponse;
}
