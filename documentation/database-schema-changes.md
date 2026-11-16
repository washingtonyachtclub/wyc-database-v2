# Database Schema Changes

## Overview

`src/db/schema.ts` defines the PostgreSQL schema. `drizzle-postgres/` contains the generated SQL and snapshots. Each database records applied migrations in its own Drizzle journal.

`DATABASE_URL` selects the destination. Vercel builds only compile the application; migrations run explicitly before deployment. A build does not modify either database.

## Schema workflow

1. Edit `src/db/schema.ts` and generate the migration with `npm run db:generate -- --name=description`.
2. Review the generated SQL, particularly destructive statements, defaults, and constraints.
3. Apply to local development with `npm run db:migrate:dev` (reads `.env.local`).
4. Run `npm run db:check`, `npm run typecheck`, and the existing checks. Commit the schema and generated migration together.
5. Apply reviewed migrations to the intended database with `npm run db:migrate`, then deploy compatible application code.

When another schema change lands first, rebase and regenerate only unapplied migrations. Never rewrite an applied migration. Back up before destructive changes. The MySQL-to-Postgres transition requires the coordinated [migration workflow](postgres-migration.md).

## Legacy system

`drizzle/` preserves the MySQL migration history. It is not used by the PostgreSQL configuration. An existing MySQL journal cannot serve as the PostgreSQL baseline.

## Key Files

| File                        | Purpose                                |
| --------------------------- | -------------------------------------- |
| `src/db/schema.ts`          | PostgreSQL tables and constraints      |
| `drizzle-postgres/`         | PostgreSQL migrations and snapshots    |
| `drizzle.config.ts`         | Dialect, paths, and destination URL    |
| `scripts/check-drizzle.mjs` | Schema and migration consistency check |
| `scripts/vercel-build.mjs`  | Build without database writes          |
