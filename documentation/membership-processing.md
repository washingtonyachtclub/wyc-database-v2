# Membership Processing

How new members get into the database and how existing members get renewed.

## Overview

Members sign up through a WPForms form on the WordPress site. An authorized user then processes those submissions through the `/membership-processing` route in the v2 app. This page handles both new member creation and renewals for returning members.

## How it works

The membership processing page accepts CSV row data exported from WPForms. Each row is parsed against a known header format that includes name, email, address, phone, UW status, membership duration (quarterly or annual), membership status (new, renewing, or rejoining), and WYC number (for returning members).

### Processing a single member

1. Paste one CSV row into the input field.
2. The page parses the row and determines whether the person is a new member or a returning member based on the "membership status" field and WYC number.
3. For **new members**, the page resolves the membership category from UW status, calculates the expiration quarter from the selected membership duration, and creates the member via the `createMember` server function. A welcome email is sent with their generated passphrase.
4. For **returning members**, the page looks up their WYC number in the database, verifies the name matches, and renews their membership via the `renewMember` server function. A renewal confirmation email is sent.

### Batch processing

Multiple CSV rows can be pasted at once. The page splits them into individual items and processes them one at a time. Rows that have already been processed (tracked by WPForms entry ID in the `processed_form_entries` table) are automatically filtered out.

### Duplicate detection

When processing a new member, the page checks for existing members with matching name or email. If duplicates are found, they are displayed with their WYC number, match method (name, email, or both), and active/expired status so the user can decide whether to proceed or treat it as a renewal.

### Error handling

The page handles several error cases: column count mismatches, missing WYC numbers for returning members, WYC numbers not found in the database, name mismatches between the form and database, and invalid field values. For missing WYC numbers, the page shows potential duplicate matches so the user can supply the correct number.

## Quarter resolution

Expiration quarters are resolved dynamically by matching the membership duration text (e.g. "Fall 2026") against the `quarters` table in the database. There is no hardcoded quarter mapping in the v2 app.

## Key files

| File                                   | Purpose                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `src/routes/membership-processing.tsx` | The membership processing page (parsing, UI, batch logic) |
| `src/domains/members/server-fns.ts`    | `createMember` and `renewMember` server functions         |
| `src/lib/email-templates.ts`           | Welcome and renewal email templates                       |
| `src/db/membership-utils.ts`           | `isMembershipActive()` helper                             |
