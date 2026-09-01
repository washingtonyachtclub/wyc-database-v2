# Membership Renewals

## Overview

Logged-in members renew on `/renew-membership` by paying with a card or requesting a dues exemption. Both paths create a renewal workflow. Membership expiry and category are updated only after the workflow has its required funding decision and a signed member waiver.

New member signup is handled separately by WordPress and `/membership-processing`. See [membership processing](membership-processing.md).

## Renewal lifecycle

`membership_renewals` is the parent record for a renewal. An open renewal has neither `completed_at` nor `closed_at`.

```
renewal created
    -> funding requirement completed + member waiver stored
    -> membership expiry and category updated
    -> renewal completed
```

Paid renewals complete funding before the waiver. Exemption renewals store the waiver before approval completes funding. `reconcileRenewal` completes either workflow once both requirements are present. Completion activates the renewal questionnaire, advances `WYCDatabase.ExpireQtr` without removing paid time, synchronizes `WYCDatabase.Category` with the submitted UW status, and sends the membership-renewed email.

The renewal page resumes an open workflow after a reload. It shows the waiver when one is still required and shows the exemption status while an exemption decision is pending.

## Paid renewal flow

1. The member selects Student, Alumni, Employee/Retiree, or Public and completes the renewal questionnaire.
2. UW status determines the price tier. Student uses the student tier; every other status uses the non-student tier.
3. The member chooses quarterly or annual membership. The page fetches the matching live price from Square.
4. The Square Web Payments SDK tokenizes the card into a single-use source ID.
5. `payAndRenew` creates a Square order from the configured catalog variation and charges the order total.
6. A completed charge creates `membership_renewals`, `membership_payments`, and `renewal_questionnaire` rows in one database transaction. The questionnaire remains pending.
7. The member receives the `Complete your WYC renewal` email and signs the member waiver.
8. Storing the waiver completes the renewal and sends the `WYC Membership Renewed` email.

The amount charged comes from `order.totalMoney`. The client never supplies a price or price tier.

## Member waiver

The renewal page gets the member's name and email from `WYCDatabase`. The member confirms the adult acknowledgement and draws a signature.

The server creates a versioned PDF, uploads it to the waiver R2 bucket, and inserts a `member_waivers` row containing the workflow link, signer identity, submitted values, signing time, R2 object key, PDF hash, size, and content type. Production objects use `waivers/v1/member/{year}/{acceptanceId}.pdf`. Development objects use `mock/member/{acceptanceId}.pdf`.

Each member waiver links to exactly one workflow through either `renewal_id` or `application_id`. Renewal waivers use `renewal_id`. A unique index permits only one waiver per renewal.

## Quarter math

All renewal math anchors to `RENEWAL_QUARTER`, a hand-maintained constant in `compute-renewal.ts`. It is the quarter an expired member renews into. `computeRenewal(expireQtr, duration)` rewards early renewal and never removes paid time:

- Active membership (`expireQtr >= RENEWAL_QUARTER`) stacks the new period on remaining time. Quarterly adds one quarter and annual adds four.
- Expired membership (`expireQtr < RENEWAL_QUARTER`) starts fresh. Quarterly lands on `RENEWAL_QUARTER` and annual lands on `RENEWAL_QUARTER + 3`.

`MAX_QUARTERS_AHEAD = 4` prevents a renewal from moving expiry more than four quarters past `RENEWAL_QUARTER`.

### Maintaining `RENEWAL_QUARTER`

`RENEWAL_QUARTER` normally equals the current lesson quarter. It can be advanced shortly before a quarter ends so members can renew into the upcoming quarter. `QuarterMaintenanceBanner` reminds `db`-privileged users when the constant is due to advance or is stale.

## Square integration

The Square catalog is the pricing source of truth. `catalog.ts` maps each tier and duration to a catalog variation ID for the active environment.

```
{tier, duration} -> catalog variation
CreateOrder(variation, quantity 1) -> order total
CreatePayment(sourceId, orderId, order total) -> completed payment
```

Orders use `renew-o/{wycNumber}/{targetExpireQtr}` as their idempotency key. Payments use a key containing the member, target quarter, and a hash of the single-use card source ID. Reusing the same source ID deduplicates the payment request. A newly tokenized card produces a new payment key.

Recognized card errors receive a friendly decline message. Definite non-card failures are logged and return a generic retry message. A timeout, connection failure, Square server error, or uncertain payment status after `CreatePayment` tells the member not to retry if they received a receipt or see a charge. The log includes the member, amount, target quarter, and Square order ID for manual reconciliation. Successful workflows store the Square payment ID and order ID. If Square confirms the charge but the database write fails, those IDs are logged and the member is told to contact the club and not pay again.

The member's email is passed to Square for its receipt. WYC separately sends the waiver-required and renewal-completed emails.

## Dues exemptions

Officers, instructors who will teach during the quarter, and honorary members can request one dues-exempt quarter. Eligibility is verified by an approver.

Submitting a request creates an open `membership_renewals` row, a pending `dues_exemption_requests` row, and a pending questionnaire row in one transaction. The target quarter is frozen when the request is submitted. The member receives an email directing them to sign the waiver.

The member can cancel a pending request. Cancellation closes the renewal and voids the questionnaire. Denial performs the same workflow cleanup and records the approver.

Users with the `db` privilege use the Dues exemptions category of `/membership-approvals`.
Approval requires a stored member waiver. It creates an `EXEMPT`
membership ledger row, marks the request approved, and reconciles the renewal in one transaction.
The ledger records the decision even when the member is already covered through the requested
quarter. Expiry never moves backward.

## Data model

### `membership_renewals`

The parent workflow record. It stores the member, funding source, tier, duration, previous and target expiry quarters, completion time, closure time, and creation time.

### `membership_payments`

One funding ledger row per renewal. Paid rows contain the Square payment ID, order ID, amount, and currency with status `COMPLETED`. Exempt rows contain null Square IDs, zero amount, tier `exempt`, and status `EXEMPT`. `renewal_id` is unique.

### `renewal_questionnaire`

Stores UW status and the Plus One response for the renewal. It is pending while the workflow is open, active after completion, and void after a denied or cancelled exemption.

### `member_waivers`

Stores the durable acceptance record and R2 PDF metadata. `renewal_id` and `application_id` are independently unique, and exactly one must be present.

### `dues_exemption_requests`

Stores pending, approved, denied, and cancelled exemption decisions. It links the member, renewal, questionnaire, approver decision, and `EXEMPT` ledger row.

## Configuration

Square uses Sandbox in development and Production in production, selected by `isDevEnvironment()`. Catalog variation IDs differ by environment.

| Environment variable         | Development      | Production          |
| ---------------------------- | ---------------- | ------------------- |
| `VITE_SQUARE_APPLICATION_ID` | Sandbox app ID   | Production app ID   |
| `SQUARE_ACCESS_TOKEN`        | Sandbox token    | Production token    |
| `SQUARE_LOCATION_ID`         | Sandbox location | Production location |
| `VITE_SQUARE_LOCATION_ID`    | Sandbox location | Production location |

`SQUARE_ACCESS_TOKEN` is server-only. `VITE_APP_ENV` is set to `dev` for the development project and is absent in production.

## Key files

| File                                              | Purpose                                                                 |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/routes/renew-membership.tsx`                 | Renewal questionnaire, payment form, workflow status, and member waiver |
| `src/routes/membership-approvals.tsx`             | New-member and dues-exemption review                                    |
| `src/components/renewals/SquareCardForm.tsx`      | Square Web Payments SDK card form                                       |
| `src/domains/renewals/server-fns.ts`              | Renewal status, live pricing, payment, and paid workflow creation       |
| `src/domains/renewals/exemption-server-fns.ts`    | Exemption request, cancellation, review, approval, and denial           |
| `src/domains/renewals/renewal-coordinator.ts`     | Shared workflow completion and completion email                         |
| `src/domains/renewals/compute-renewal.ts`         | Quarter math and prepay cap                                             |
| `src/domains/renewals/catalog.ts`                 | Square catalog variation configuration                                  |
| `src/domains/waivers/member-waiver-server-fns.ts` | Member waiver storage and renewal reconciliation                        |
| `src/domains/waivers/member-waiver-pdf.ts`        | Executed member waiver PDF generation                                   |
| `src/lib/square.ts`                               | Server-only Square SDK client                                           |
| `src/db/schema.ts`                                | Renewal, payment, questionnaire, exemption, and waiver tables           |
