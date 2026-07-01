# Membership Renewals

How existing members renew their own membership, and how dues exemptions are requested and approved.

## Overview

Logged-in members renew on the `/renew-membership` page by paying with a card. New member signup runs on WordPress and the `/membership-processing` route (see [membership processing](membership-processing.md)); only renewals for existing members are handled here.

A renewal advances `WYCDatabase.ExpireQtr`, the quarter a member is paid through (see [quarters](quarters.md)). The session user is the member: `requireAuth()` returns their WYCNumber, so no admin privilege is involved and the server already knows who is paying.

The same page also hosts the dues-exemption request flow for officers, instructors, and honorary members, who renew without payment subject to approval.

## Renewal flow

1. The page shows current status from `getRenewalStatus`: the quarter the member is paid through and whether they are active.
2. The member picks a tier (Student or Non-Student) and duration (Quarterly or Annual). The tier is an honor-system toggle, not read from the member's category.
3. The live price for the selected combination is fetched from Square via `getRenewalPrice`. Prices are never stored locally.
4. The Square Web Payments SDK card form renders inline. On submit it tokenizes the card client-side into a single-use source id.
5. `payAndRenew` charges the card and, only on a completed payment, advances `ExpireQtr`, logs the renewal, and emails confirmation.

Both toggles also show the resulting expiry quarter for each duration so the member can compare outcomes before paying.

## Quarter math

All renewal math anchors to `RENEWAL_QUARTER`, a hand-maintained constant in `compute-renewal.ts`. It is the quarter an expired member renews into. `computeRenewal(expireQtr, duration)` rewards early renewal and never removes paid time:

- **Active** (`expireQtr >= RENEWAL_QUARTER`): stack the new period on remaining time. Quarterly adds 1, annual adds 4.
- **Expired** (`expireQtr < RENEWAL_QUARTER`): start fresh. Quarterly lands on `RENEWAL_QUARTER`, annual on `RENEWAL_QUARTER + 3`.

A pre-pay cap (`MAX_QUARTERS_AHEAD = 4`) blocks any renewal that would push `ExpireQtr` more than four quarters past `RENEWAL_QUARTER`, so members cannot bank many quarters ahead of a dues increase. A standard annual renewal from `RENEWAL_QUARTER` lands exactly at the cap.

### The `RENEWAL_QUARTER` constant

`RENEWAL_QUARTER` is normally equal to the current quarter (`lesson_quarter.quarter`). It is a separate constant, not read live, so it can be advanced **early**: in the couple of weeks before a quarter ends, bump it to the next quarter so members can renew into the upcoming quarter before the rollover happens. Anchoring renewals directly to `lesson_quarter.quarter` would remove that early window, and would also let an operational edit of that field silently reprice and re-date every member's renewal.

**When to bump it:** raise `RENEWAL_QUARTER` to the next quarter index (in `compute-renewal.ts`) about two weeks before the current quarter's end date. `QuarterMaintenanceBanner` shows a dedicated reminder to `db`-privileged users, separate from the in-app quarter-data warnings because bumping the constant is a code change. It appears in two cases: **due soon**, within 14 days of the current quarter's end date while `RENEWAL_QUARTER` still equals the current quarter; and **stale**, if the current quarter has already rolled past `RENEWAL_QUARTER`. Bumping the constant clears it.

## Square integration

Pricing has a single source of truth: the Square catalog item, the same item the WordPress flow sells.

```
{tier, duration}  ->  Square catalog variation id   (catalog.ts config)
CreateOrder(variation, qty 1)   ->  Square computes the total from the catalog
CreatePayment(sourceId, orderId, total)  ->  status COMPLETED (synchronous)
```

The amount charged comes from `order.totalMoney`, never from the client. The client only sends tier, duration, and the card token.

**Confirmation.** `ExpireQtr` is updated only after `CreatePayment` returns `COMPLETED`, inside the same server function. The charge and the post-payment database write are separate try blocks: if the charge fails, nothing changes and the member sees a safe decline reason; if the database write fails after a completed charge, the member is told their payment went through and not to pay again. There is no webhook, since the embedded card form returns the final status synchronously.

**Idempotency.** Every order and payment passes an idempotency key (`renew-o/{wyc}/{targetQtr}` and `renew-p/{wyc}/{targetQtr}`) so a double-click cannot double-charge.

**Receipts.** The member's email is passed to Square as `buyer_email_address` for Square's automatic receipt, and a separate renewal confirmation email is sent via `sendEmail` (dev-simulated like all other mail; see [email OTP login](email-otp-login.md)).

**Error handling.** Card decline reasons are surfaced in a friendly form so the member knows their card failed. All other Square and database errors are logged server-side and returned as generic messages.

## Ledger table: `membership_payments`

One row per granted dues event, paid or exempt. The table is the record of when members renew, for how long, and the Square ids and amount behind each paid renewal.

| Column              | Type      | Notes                                    |
| ------------------- | --------- | ---------------------------------------- |
| `_index`            | int PK    |                                          |
| `wyc_number`        | int       | FK to `WYCDatabase.WYCNumber`            |
| `square_payment_id` | varchar   | null for exempt renewals                 |
| `square_order_id`   | varchar   | null for exempt renewals                 |
| `amount_cents`      | int       | from the Square order total (audit only) |
| `currency`          | char(3)   | "USD"                                    |
| `tier`              | varchar   | "student" / "nonstudent" / "exempt"      |
| `duration`          | varchar   | "quarterly" / "annual"                   |
| `prev_expire_qtr`   | int       | ExpireQtr before the renewal             |
| `new_expire_qtr`    | int       | ExpireQtr after the renewal              |
| `status`            | varchar   | "COMPLETED" / "EXEMPT"                   |
| `created_at`        | timestamp | default CURRENT_TIMESTAMP                |

Exempt renewals use null Square ids, `amount_cents = 0`, `tier = 'exempt'`, and `status = 'EXEMPT'`.

## Dues exemption

Officers, instructors who will teach that quarter, and honorary members renew without paying. Eligibility is honor-system and verified by a human approver, not auto-detected. Each exemption grants one quarter only, using the same baseline as a quarterly renewal.

### Member side

On the renewal page, a separate Request Dues Exempt action submits `requestDuesExemption`. It freezes the target quarter at request time, enforces one open request per member, and records a `pending` row. The renewal status reflects the pending request across reloads.

### Approval side

Active holders of Commodore (1000), Vice Commodore (1010), or Webmaster (2260) positions can reach `/approve-exemptions`. The screen lists pending requests with requester name, requested quarter, current expiry, and request date.

- `approveExemptionRequest`: if the member is already covered through the frozen target quarter, the grant is a no-op (no `ExpireQtr` change, no ledger row); otherwise it advances `ExpireQtr` and writes the EXEMPT ledger row. Either way the request is marked approved, linked to the ledger row, and the member receives the renewal confirmation email (only when a quarter was actually granted).
- `denyExemptionRequest`: marks the request denied. No reason is captured, and a denied member may request again.

### Request table: `dues_exemption_requests`

Kept separate from the ledger so denials, which grant nothing, never appear there.

| Column                 | Type           | Notes                                            |
| ---------------------- | -------------- | ------------------------------------------------ |
| `_index`               | int PK         |                                                  |
| `wyc_number`           | int            | requester FK to `WYCDatabase.WYCNumber`          |
| `requested_expire_qtr` | int            | target quarter, frozen at request time           |
| `status`               | varchar        | `pending` / `approved` / `denied`                |
| `payment_id`           | int null       | FK to the EXEMPT ledger row, set on a real grant |
| `decided_by`           | int null       | approver's WYCNumber                             |
| `decided_at`           | timestamp null |                                                  |
| `created_at`           | timestamp      | default CURRENT_TIMESTAMP                        |

## Configuration

Square runs against Sandbox in dev and Production in prod, selected by `isDevEnvironment()`. The same choice picks the catalog variation ids in `catalog.ts` (sandbox and production ids differ). Variation ids are config, not secrets.

| Env var                      | Sandbox (dev)        | Production       |
| ---------------------------- | -------------------- | ---------------- |
| `VITE_SQUARE_APPLICATION_ID` | `sandbox-sq0idb-...` | `sq0idp-...`     |
| `SQUARE_ACCESS_TOKEN` secret | sandbox `EAAA...`    | production token |
| `SQUARE_LOCATION_ID`         | sandbox `L...`       | `5EEW5V3XR4SJW`  |
| `VITE_SQUARE_LOCATION_ID`    | sandbox `L...`       | `5EEW5V3XR4SJW`  |

`SQUARE_ACCESS_TOKEN` is server-only and must never reach client code. Sandbox values go in `.env.local` and the dev Vercel project; production values go in the main Vercel project. `VITE_APP_ENV` is unset in production, which is what makes `isDevEnvironment()` false and flips both the SDK and the card form to Production. Sandbox test cards are documented at https://developer.squareup.com/docs/devtools/sandbox/payments.

## Key files

| File                                           | Purpose                                                     |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `src/routes/renew-membership.tsx`              | Renewal page: toggles, live price, card form, success view  |
| `src/routes/approve-exemptions.tsx`            | Approver screen for pending exemption requests              |
| `src/components/renewals/SquareCardForm.tsx`   | Loads the Web Payments SDK and mounts the card iframe       |
| `src/domains/renewals/server-fns.ts`           | `getRenewalStatus`, `getRenewalPrice`, `payAndRenew`        |
| `src/domains/renewals/exemption-server-fns.ts` | Request, list, approve, and deny exemption server functions |
| `src/domains/renewals/compute-renewal.ts`      | `computeRenewal` quarter math and the pre-pay cap           |
| `src/domains/renewals/catalog.ts`              | tier x duration to Square variation id (sandbox vs prod)    |
| `src/lib/square.ts`                            | Server-only Square SDK client                               |
| `src/db/schema.ts`                             | `membershipPayments` and `duesExemptionRequests` tables     |
