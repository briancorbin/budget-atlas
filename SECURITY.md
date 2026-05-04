# Security Policy

The Budget Atlas is a static, no-backend, no-account web app. Most classes
of vulnerability that affect typical web services don't apply here — there's
no server-side code, no database, no authentication, no PII collection.
That said, supply-chain issues, build-pipeline tampering, third-party
script leaks, and similar concerns are still in scope, and we want to hear
about them.

## How to report a vulnerability

Please **do not open a public GitHub issue** for security reports. Use one
of these private channels instead:

- **Email:** `security@thebudgetatlas.com`
- **GitHub Security Advisory (preferred):**
  [github.com/TheBudgetAtlas/thebudgetatlas/security/advisories/new](https://github.com/TheBudgetAtlas/thebudgetatlas/security/advisories/new)

When reporting, include:

- A clear description of the issue and its potential impact.
- Steps to reproduce (URL, request, page state, browser if relevant).
- Any proof-of-concept payload or screenshot, if applicable.
- Whether you'd like to be credited publicly when the issue is resolved.

## What's in scope

- The deployed site at `thebudgetatlas.com` and any subdomains we operate.
- The build and deploy pipeline (Cloudflare Workers, GitHub Actions if any).
- The contents of this repository, including dependency supply chain.
- Any leak of user data — even though we collect almost none, an unintended
  exfiltration path is still a vulnerability.
- Cross-site scripting in pages we render (citation popovers, form inputs,
  dynamic content from `src/data/`).
- Third-party scripts that load on the page beyond the documented
  Cloudflare Web Analytics beacon.

## What's not in scope

- Issues that require a malicious browser extension to exploit.
- Phishing, social engineering, or attacks on third-party services we
  link to but don't operate.
- Reports about the _content_ of the site (tax math, citation accuracy,
  cost-of-living estimates) — those go through the normal issue tracker.
- Outdated dependency versions without a demonstrated exploitable issue.
- Missing security headers without a demonstrated exploit path. (We do
  care about defense-in-depth and welcome suggestions, but those are
  hardening tasks, not vulnerabilities.)

## Response expectations

- We aim to acknowledge a report within 72 hours (often much faster).
- This is a single-maintainer project; complex investigations may take
  longer. We'll keep you updated.
- Once the issue is patched, we'll coordinate a disclosure timeline with
  you. Default is public disclosure once a fix is deployed, with credit
  to you (if desired).
- There is **no bug bounty** — this is a public-good project funded out
  of pocket. We can offer thanks, public credit in release notes, and a
  prompt fix.

## Hall of fame

Researchers and reporters who've responsibly disclosed issues will be
listed here once we have any to acknowledge.

## Thanks

Thanks for taking the time to make the site safer for the people who use
it.
