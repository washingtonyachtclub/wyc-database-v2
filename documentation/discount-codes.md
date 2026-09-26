# Discount Codes

## Overview

Database-privileged users manage discount codes on `/discount-codes`. Codes can apply
to new memberships, renewals, or both. A code reduces the Square order total and always leaves
a positive card payment. Dues exemptions use their separate approval workflows.

## Administration

A discount code has a name, audience, discount, active date range, and optional redemption limit.
All fields except the code itself can be edited. A redemption limit cannot be reduced below the
number of completed redemptions. Percentage discounts use whole percentages from 1 through 99.
Fixed discounts are stored in cents. Start and end dates are inclusive Pacific calendar dates.

The management page separates codes usable today from inactive codes. Disabled codes can be
enabled. Expired codes must have their end date extended before they can be enabled, and codes at
their redemption limit require a higher or removed limit. Scheduled codes remain inactive until
their start date.

Disabling or editing a discount code prevents stale checkout quotes by incrementing its revision. A
checkout quoted against an older revision must apply the code again before payment. Redemption limits
count completed payment redemptions without reserving capacity for concurrent checkouts.

## Checkout

The client sends only the code and quoted revision. The server reloads the discount code, checks its
audience, active dates, revision, and redemption count, and reads the base price from the Square
catalog. The Square order contains the catalog membership variation and an order-level percentage
or fixed-amount discount. The returned Square total is the amount charged.

Codes stack with the existing student or nonstudent base tier. Only one discount code applies to a
checkout. A code can be used for multiple renewal transactions, and every completed transaction
counts as one redemption.

## Audit records

`membership_discount_codes` stores discount code configuration.
`membership_discount_code_redemptions` links a discount code to its completed membership payment and snapshots the code, revision, discount terms,
catalog subtotal, applied discount, and final amount.

## Key Files

| File                                                                 | Purpose                                     |
| -------------------------------------------------------------------- | ------------------------------------------- |
| `src/routes/discount-codes.tsx`                                      | Discount code management                    |
| `src/components/membership-discount-codes/DiscountCodeField.tsx`     | Shared code entry and quote UI              |
| `src/components/membership-discount-codes/DiscountCodeFormModal.tsx` | Discount code create and edit form          |
| `src/domains/membership-discount-codes/server-fns.ts`                | Validation, administration, and redemptions |
| `src/domains/membership-payments/square-payment.ts`                  | Square order discount application           |
| `src/domains/membership-applications/server-fns.ts`                  | New-member discounted payment coordination  |
| `src/domains/renewals/server-fns.ts`                                 | Renewal discounted payment coordination     |
| `src/db/schema.ts`                                                   | Discount code and redemption tables         |
