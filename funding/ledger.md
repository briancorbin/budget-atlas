# Funding ledger

Public, append-only record of every dollar in and out of The Budget Atlas. Updated as expenses are incurred and donations are received — no batching, no rounding, no "miscellaneous." If it can't be cited to a receipt, it doesn't go in the ledger.

This file is the ground truth. The eventual [funding transparency dashboard](https://github.com/TheBudgetAtlas/thebudgetatlas/issues) (roadmap #21) will render from it.

## Principles

- **Every penny.** Recurring infrastructure ($0 free tiers included), one-time purchases, donations in, grants out. If money or a money-equivalent moved, it's logged.
- **Receipts retained and public.** Every line item links to its source receipt in a [public Google Drive folder](https://drive.google.com/drive/folders/1o2v9qGYvITBPA-V7RfSQ7OmeZyylfqTC?usp=drive_link) (anyone with the link, viewer access). Once Open Collective is approved, receipts will additionally live on each public expense page there.
- **Pre-fiscal-sponsor expenses tracked too.** Items currently paid out of pocket by the maintainer (Brian Corbin) are flagged `Reimbursable: Y` and may be submitted to the fiscal sponsor (Open Collective / OSC, application pending) for reimbursement out of donated funds once approved. Items flagged `Reimbursable: N` are personal contributions and will not be reclaimed.
- **No retroactive edits.** Mistakes are corrected by appending a correction row, not by rewriting history. Git log is part of the audit trail.

## Categories

- **Infrastructure** — hosting, CDN, DNS, domain registration, build minutes
- **Tooling** — paid developer tooling required to ship the project (org-tier accounts, paid APIs used in development)
- **Branding** — design assets, fonts (if ever paid), illustrations
- **Operations** — fiscal sponsor fees, payment processing fees, banking
- **Research** — data sources or subscriptions used to verify cited values
- **Donations in** — incoming gifts (will populate once OSC is approved)
- **Grants out** — pass-through gifts to other 501(c)(3) charities

## Expenses

| Date       | Vendor     | Description                                              | Category       | Amount (USD) | Reimbursable | Receipt                                                                                          |
| ---------- | ---------- | -------------------------------------------------------- | -------------- | -----------: | :----------: | ------------------------------------------------------------------------------------------------ |
| 2026-05-02 | GitHub     | `TheBudgetAtlas` org — Team plan, month 1                | Tooling        |        $4.00 |      Y       | [Drive](https://drive.google.com/drive/folders/1o2v9qGYvITBPA-V7RfSQ7OmeZyylfqTC?usp=drive_link) |
| 2026-05-02 | Cloudflare | `thebudgetatlas.com` domain registration (1 yr, at-cost) | Infrastructure |       $10.46 |      Y       | [Drive](https://drive.google.com/drive/folders/1o2v9qGYvITBPA-V7RfSQ7OmeZyylfqTC?usp=drive_link) |

_Recurring monthly costs (GitHub org, etc.) get a new row each billing cycle so the ledger reads as a true cash-flow record, not a forecast._

## Donations in

_None yet. Will populate once Open Collective fiscal sponsorship is approved and the Collective is live._

| Date | Source | Amount (USD) | Notes |
| ---- | ------ | -----------: | ----- |

## Grants out

_None yet. Once the Collective accumulates funds, intended use is regranting to aligned 501(c)(3) charities and reimbursing project infrastructure costs._

| Date | Recipient | Amount (USD) | Purpose |
| ---- | --------- | -----------: | ------- |

## Running totals

_Will be auto-computed by the funding dashboard. Manually reconciled here at month-end:_

- **Inflows to date:** $0.00
- **Outflows to date (paid from project funds):** $0.00
- **Outflows to date (paid personally, reimbursable):** $14.46
- **Outflows to date (paid personally, non-reimbursable):** $0.00

Last reconciled: _2026-05-02 (initial)_
