# Lesson visibility and calendar

## Overview

Every saved lesson is published. The public lesson list includes a lesson while
any session ends on today's date in Seattle or later. Timed sessions that ended
earlier today stay listed until midnight. All-day sessions include their end date.
A course remains listed until its final session's day ends.

Member signups and waitlist joins close at the first session's start time in
Seattle. For all-day sessions, signups close at midnight at the beginning of the
first day. The public list and signup page show “Signups closed” afterward. The
server enforces this deadline even for an already open signup page.

The lesson's `expire` quarter controls membership eligibility and quarter-based
administrative lists, independently of public visibility.

## Capacity

A lesson size of `0` means unlimited enrollment. Every signup is enrolled, and
unlimited lessons have no waitlist. Signup and reminder emails omit waitlist
language, and roster and signup views show the enrolled count without a capacity.

Create and edit forms expose an “Unlimited” checkbox beside the capacity input. Limited lessons require
a positive whole-number size. Existing positive sizes remain capacity limits.

## Calendar sync

Google Calendar includes individual sessions starting on or after July 21, 2026,
regardless of the current quarter or session age. Sessions before that boundary
are excluded even when later sessions of the same course qualify.

Creating or editing a lesson updates eligible calendar events. Historical events
remain as time passes. Explicitly deleting a lesson or removing a session deletes
its event; moving a session from the supported date range to before July 21 also
removes its event. Cancellation uses explicit deletion, which also removes signup
records when the whole lesson is deleted.

“Sync calendar” repairs all eligible lessons, one request per lesson. It reports
failed lessons and can be repeated. Event IDs use the stable session ID, so repeat
syncs update the same events. Calendar failures are logged without failing lesson
saves. Failed deletion of an event whose database session is already removed
requires manual calendar cleanup.

## Migration review and restoration

The physical `lessons.display` column is retained as legacy data for the rollout
audit. App queries, forms, signups, and reminders do not use it. No schema migration
is needed. New lessons inherit the column's database default; the audit's hidden
upcoming list is meaningful for records created before rollout.

Before deploying, preview production data and review hidden upcoming lessons.
Delete unwanted drafts using the existing lesson controls, or confirm that they
should become public and receive normal reminders. Review all restoration entries,
including those without signups. An unwanted saved lesson must be corrected or
explicitly deleted in the database; otherwise subsequent syncs will include it.

After review and deployment, use **Sync calendar** on the production Lessons page.
The browser sends one authenticated request per lesson to the production server,
which reads its database and uses its configured Google service account and
calendar. Keep the page open until it reports completion. Retrying uses the same
event IDs. Calendar sync does not send lesson emails or alter database rows.

## Key files

| File                                | Purpose                                       |
| ----------------------------------- | --------------------------------------------- |
| `src/domains/lessons/visibility.ts` | Signup cutoff and calendar start date         |
| `src/domains/lessons/server-fns.ts` | Public listing, enrollment, and mutation sync |
| `src/domains/lessons/calendar.ts`   | Calendar selection and event details          |
| `src/lib/gcal.ts`                   | Google Calendar requests and stable event IDs |
