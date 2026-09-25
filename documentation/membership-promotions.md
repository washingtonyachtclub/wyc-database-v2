# Membership Promotions

## Overview

Database-privileged users manage discount codes on `/membership-promotions`. Promotions can apply
to new memberships, renewals, or both. A promotion reduces the Square order total and always leaves
a positive card payment. Dues exemptions use their separate approval workflows.

## Campaigns

A campaign has an immutable code and optional redemption limit. Its name, audience, discount, and
active date range can be edited. Percentage discounts use whole percentages from 1 through 99.
Fixed discounts are stored in cents. Start and end dates are inclusive Pacific calendar dates.

Disabling a campaign prevents new quotes and payments. Editing or disabling increments its revision.
A checkout quoted against an older revision must apply the code again before payment. Redemption
limits count completed payment redemptions without reserving capacity for concurrent checkouts.

## Checkout

The client sends only the code and quoted revision. The server reloads the campaign, checks its
audience, active dates, revision, and redemption count, and reads the base price from the Square
catalog. The Square order contains the catalog membership variation and an order-level percentage
or fixed-amount discount. The returned Square total is the amount charged.

Codes stack with the existing student or nonstudent base tier. Only one promotion applies to a
checkout. A code can be used for multiple renewal transactions, and every completed transaction
counts as one redemption.

## Audit records

`membership_promotions` stores campaign configuration. `membership_promotion_redemptions` links a
campaign to its completed membership payment and snapshots the code, revision, discount terms,
catalog subtotal, applied discount, and final amount.

## Key Files

| File                                                          | Purpose                                     |
| ------------------------------------------------------------- | ------------------------------------------- |
| `src/routes/membership-promotions.tsx`                        | Campaign management                         |
| `src/components/membership-promotions/PromotionCodeField.tsx` | Shared code entry and quote UI              |
| `src/components/membership-promotions/PromotionFormModal.tsx` | Campaign create and edit form               |
| `src/domains/membership-promotions/server-fns.ts`             | Validation, administration, and redemptions |
| `src/domains/membership-payments/square-payment.ts`           | Square order discount application           |
| `src/domains/membership-applications/server-fns.ts`           | New-member discounted payment coordination  |
| `src/domains/renewals/server-fns.ts`                          | Renewal discounted payment coordination     |
| `src/db/schema.ts`                                            | Campaign and redemption tables              |
