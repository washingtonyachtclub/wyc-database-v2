# Database Audit Log

## Overview

The audit log provides a short history for investigating unexpected application changes, queried
directly in the database. It is not an event source or a recovery mechanism. Thirty-day retention
and bounded details keep storage proportional to recent activity.

## Design decisions

- Capture happens at the shared database client so new mutation handlers inherit it without explicit
  logging calls. Database triggers are avoided to keep this behavior in application code.
- Availability takes priority over complete history. Audit failures must not fail business writes;
  entries missed during failures are accepted and are not backfilled.
- Audit writes use a separate connection so failed or rolled-back operations can still be
  investigated. A successful statement does not prove its transaction committed. Some business
  tables use MyISAM, whose writes cannot be rolled back.
- Details are limited and redacted to avoid duplicating secrets and large records. Short contact
  values may remain, so database access also grants access to that history.

## Coverage limits

Direct SQL, migrations, and other applications bypass capture. The log is not tamper-resistant.
Daily cleanup makes 30 days an approximate retention window; missed runs can extend it.

## Key Files

| File                     | Purpose                   |
| ------------------------ | ------------------------- |
| `src/db/audit-client.ts` | Central capture boundary  |
| `src/db/audit-query.ts`  | Redaction policy          |
| `src/db/audit-store.ts`  | Persistence and retention |
