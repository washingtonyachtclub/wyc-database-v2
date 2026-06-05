# Membership Processing

How new members get into the database.

## Overview

Members sign up through a WPForms form on the WordPress site. An authorized user then processes those submissions through the `/membership-processing` route in the v2 app. This page creates new members. Existing members renew themselves through [membership renewals](membership-renewals.md).

## How it works

The membership processing page accepts CSV row data exported from WPForms. Each row is parsed against a known header format that includes name, email, address, phone, UW status, and membership duration (the quarter the member is paying for). Columns are matched by name, so any extra form fields are ignored.

### Processing a single member

1. Paste one CSV row into the input field.
2. The page resolves the membership category from UW status, calculates the expiration quarter from the membership duration, and creates the member via the `createMember` server function. A welcome email is sent with their generated passphrase.

### Batch processing

Multiple CSV rows can be pasted at once. The page splits them into individual items and processes them one at a time. Rows that have already been processed (tracked by WPForms entry ID in the `processed_form_entries` table) are automatically filtered out.

### Duplicate detection

The page checks each submission for existing members with a matching name or email. Matches are displayed with their WYC number, match method (name, email, or both), and active/expired status, so the user can decide whether to proceed or direct the person to renew through [membership renewals](membership-renewals.md) instead.

### Error handling

The page handles missing required columns and invalid field values, such as an unrecognized UW status or a membership duration that does not match a quarter in the database.

## Quarter resolution

Expiration quarters are resolved dynamically by matching the membership duration text (e.g. "Fall 2026") against the `quarters` table in the database. There is no hardcoded quarter mapping in the v2 app.

## Key files

| File                                   | Purpose                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `src/routes/membership-processing.tsx` | The membership processing page (parsing, UI, batch logic) |
| `src/domains/members/server-fns.ts`    | `createMember` server function                            |
| `src/lib/email-templates.ts`           | Welcome email template                                    |
| `src/db/membership-utils.ts`           | `isMembershipActive()` helper (duplicate active/expired)  |
