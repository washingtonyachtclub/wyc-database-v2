# PostgreSQL Migration

## Overview

The application uses Drizzle with `pg` on Vercel. The PostgreSQL baseline preserves table names, member numbers, record IDs, numeric flags, and existing foreign keys. Search uses case-insensitive `ILIKE`; PostgreSQL sorting and equality follow the destination locale and are not identical to MySQL's accent-insensitive collations.

The deployment target is a PlanetScale single-node PostgreSQL database billed through Cloudflare, with 30-day managed recovery. Provisioning, retention configuration, credentials, and production deployment are separate operational steps. Local development needs only PostgreSQL; no paid development database or recurring R2 exports are required.

## Local development

Create a disposable local PostgreSQL database, put its URL in `.env.local`, and set `VITE_APP_ENV=dev`. Copy the remaining required settings from `.env.example`. Run `npm run db:migrate:dev` and `npm run dev`. Use sandbox payment credentials and development service settings when exercising integrations.

The connection pool has five connections per process, uses UTC, and requires a `postgresql://` or `postgres://` URL. Hosted connections must use the provider's TLS-enabled URL. Vercel can create multiple processes, so the provider's pooled endpoint should be used and connection limits monitored.

## Data conversion

- Plain dates remain `YYYY-MM-DD` strings. The known zero dates in `lessons.CalendarDate`, `wyc_ratings.date`, and `checkouts.ExpectedReturn` become SQL `NULL`; their domain value is an empty string and displayed value is `Unknown`.
- Undated ratings remain active, including ratings normally subject to expiry. Their expiry is displayed as unknown. Dated ratings retain the existing expiry calculation.
- MySQL timestamps export in UTC. Wall-clock datetime columns, including Pacific calendar and checkout times, retain their stored values. PostgreSQL columns use timestamp without time zone; the application supplies the relevant clock explicitly.
- Legacy text blobs decode as UTF-8. Lesson comments containing legacy Windows-1252 bytes use that encoding as a fallback, counted in the import report. Invalid UTF-8 in any other blob aborts the import. Flags remain numeric; JSON values retain their structure.
- Identity sequences restart above the greatest imported ID. The importer retains duplicate rows in tables without primary keys and does not copy the MySQL migration journal.

## Export and import

`scripts/export-mysql.py` runs on the MySQL host with Python 3 and the `mysql` client. Credentials come from the client's existing defaults file. It performs only reads and emits JSON Lines on stdout. Keep the export outside the repository, in a directory accessible only to its owner, because it contains personal data, password hashes, and authentication records.

For a local rehearsal, run from the checkout:

```sh
mkdir -p /private/tmp/wyc-postgres-rehearsal &&
chmod 700 /private/tmp/wyc-postgres-rehearsal &&
umask 077 &&
ssh dreamhost 'python3 - --rehearsal' < scripts/export-mysql.py > /private/tmp/wyc-postgres-rehearsal/source.jsonl
```

A rehearsal export is not a consistent production snapshot because writers remain active and the source includes MyISAM tables. The importer restricts rehearsal exports to localhost. It permits only the known pre-calendar columns to be absent: boat `active`, reservation `reservationType`, `createdByWYCNumber`, and `title`. It fills the same defaults as the calendar migration and marks boats 4 and 7 inactive only when `active` is missing.

After applying the baseline to an empty local database, import with an explicitly selected destination:

```sh
DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/wyc_development' CONFIRM_DATABASE=wyc_development npm run db:import:mysql -- /private/tmp/wyc-postgres-rehearsal/source.jsonl
```

The importer verifies complete file framing, table and column inventories, row counts, foreign keys, and per-table hashes of normalized contents. It locks empty destination tables, inserts in foreign-key order, and commits only after every table passes. Failures roll back rows and sequence changes. A nonempty destination is rejected; do not truncate a live database to retry. Reports contain table counts, hashes, and zero-date conversion counts, with no row contents.

The hashes compare semantic JSON and numeric values, and retain row multiplicity. They are conversion checks rather than byte-for-byte MySQL backup checks.

## Production cutover

1. Land and deploy the calendar schema changes first. Regenerate this baseline if any other schema changes land. Review application queries and import results against the final source schema.
2. Provision the selected PostgreSQL database through Cloudflare, select the region, enable 30-day recovery, and verify the displayed cost and restore controls. Apply the reviewed PostgreSQL baseline to its empty database.
3. Prepare the Vercel deployment and PostgreSQL secrets without making it live. Keep MySQL credentials for rollback. Do not point a live MySQL deployment at PostgreSQL or deploy the PostgreSQL application with MySQL credentials.
4. Enter maintenance mode and stop every MySQL writer, including legacy applications, cron jobs, webhooks, and scripts. Drain in-flight work. Capture a final independent MySQL backup.
5. Export with `--writes-paused` instead of `--rehearsal`. This flag is an operator assertion; the exporter cannot stop or detect all writers. Keep writers paused throughout export and cutover. Production imports require the complete matching schema.
6. Import into the empty hosted database with `CONFIRM_DATABASE` set to its exact name. Save the verification report privately. Check record counts, IDs, authentication, date display, memberships, ratings, reservations, payments, and waiver references.
7. Activate the PostgreSQL Vercel deployment and its PostgreSQL URL together. Check login, reads, and controlled writes before reopening traffic and enabling background work. Verify managed recovery is enabled and establish a restore rehearsal.
8. Keep MySQL frozen for the agreed rollback window. Before PostgreSQL accepts writes, rollback can restore the old deployment and URL. After new writes, pause traffic and reconcile those writes before rollback; switching the URL alone would lose data.

No dual-write or gradual database transition is implemented. The exact maintenance window, other writers, external integration smoke checks, and hosted recovery rehearsal must be settled before executing cutover.

## Concurrency

Calendar mutations use PostgreSQL transactions and table locks so overlapping reservations serialize, including empty ranges. Failed multi-table changes roll back. Member-number allocation uses a transaction-scoped advisory lock. Renewal completion locks the renewal and member, then rereads associated records before updating membership.

## Key Files

| File                       | Purpose                               |
| -------------------------- | ------------------------------------- |
| `src/db/index.ts`          | Connection pool and dialect guard     |
| `src/db/schema.ts`         | PostgreSQL schema                     |
| `drizzle-postgres/`        | Empty-database baseline               |
| `scripts/export-mysql.py`  | Read-only export on the MySQL host    |
| `scripts/import-mysql.ts`  | Transactional import and verification |
| `src/lib/rating-expiry.ts` | Undated-rating policy                 |
| `src/lib/date-utils.ts`    | Unknown-date display                  |
| `scripts/vercel-build.mjs` | Build without migration side effects  |
