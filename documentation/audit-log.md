# Database Audit Log

## Overview

`audit_log` records application database writes for 30 days. The shared database client captures
operations automatically, including writes inside transactions and raw SQL executed through that
client. There is no audit UI.

## Capture

Each entry contains the operation start time in UTC, request ID, acting and effective WYC numbers,
source, action, transaction ID, operation, table, execution outcome, affected-row count, insert ID,
and sanitized query details. One executed statement produces one entry, including bulk writes and
statements that affect zero rows. Failed writes retain an error code without the error message.

Request middleware reads the encrypted session once. Dev impersonation retains both the real and
effective identities. Unauthenticated requests use an anonymous identity. The authenticated daily
job uses a system identity. Calls outside request context use an unknown identity unless the caller
sets one with `withAuditContext()`.

Reads and connection settings are excluded. Audit persistence and retention use a private pool and
are not audited recursively. The CI database-access check rejects direct driver imports outside the
database infrastructure and access to Drizzle's raw `$client` in application code. Streaming
`.iterator()` is unsupported because Drizzle uses the raw callback driver for it; CI rejects that
API and the wrapped client blocks access to its underlying driver. Drizzle `.prepare().execute()`
is supported.

## Query details

SQL literals and unknown identifiers are replaced with placeholders. Parameter values are retained
only when a simple insert value, equality, or `IN` predicate can be associated with a known schema
column. Complex or unrecognized expressions are redacted conservatively.

Password, secret, token, hash, signature, code, key, session, credential, and student-ID columns are
redacted. JSON columns are omitted. Other short scalar values, including member contact fields, may
be retained. Values longer than 160 characters are omitted; entries contain at most 32 parameters,
3,000 statement characters, and 8 KiB of JSON details. Larger queries retain operation metadata and
mark the details as truncated. These records describe executed writes, not complete row snapshots.

## Transactions and failures

Audit entries use a separate connection and are awaited. Acquiring a connection and executing a query
share a 500 ms time budget. The audit pool has two connections and at most 32 queued requests.
Timed-out connections are discarded. A failure is logged server-side and suppresses audit attempts for 60 seconds in
that process. Business results and errors are preserved even when auditing fails. Entries skipped
during an outage or overload are not retried or backfilled.

`succeeded` means the SQL statement completed. It does not establish that a surrounding transaction
committed. `BEGIN`, `COMMIT`, `ROLLBACK`, and savepoint operations share the transaction ID with
their writes; a failed commit or missing terminal event leaves the transaction outcome uncertain.
An audit entry survives rollback because it is stored independently. MyISAM tables do not roll
back, so a rollback event does not mean all recorded changes were undone.

Direct database access, migration scripts, and other applications are outside this log. The table
does not provide tamper resistance or guaranteed recovery. See [Database Schema Changes](database-schema-changes.md)
for migration behavior.

## Retention

The daily task removes entries older than `AUDIT_RETENTION_DAYS` (30) using the timestamp index.
Cleanup deletes up to ten batches of 1,000 rows per run. The daily schedule means records can remain
for roughly one extra day; outages or a large backlog can extend that period. Dry runs do not delete
entries. Cleanup failures are included in the daily task report and do not prevent its other work.

## Key Files

| File                                 | Purpose                                             |
| ------------------------------------ | --------------------------------------------------- |
| `src/db/schema.ts`                   | Audit table and retention index                     |
| `src/db/index.ts`                    | Shared audited database client                      |
| `src/db/audit-client.ts`             | Statement execution and transaction capture         |
| `src/db/audit-query.ts`              | Query classification, redaction, and payload limits |
| `src/db/audit-store.ts`              | Independent writes, failure handling, and cleanup   |
| `src/db/audit-context.ts`            | Request and system attribution                      |
| `src/start.ts`                       | Global request middleware registration              |
| `src/lib/audit-request.ts`           | Session identity capture                            |
| `src/routes/api.cron.daily-tasks.ts` | Scheduled retention                                 |
| `scripts/check-db-access.mjs`        | CI check for driver bypasses                        |
