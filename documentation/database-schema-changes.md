# Database Schema Changes

## Overview

`src/db/schema.ts` defines the PostgreSQL schema. Production deployments apply pending migrations before building. Each Vercel project uses `MIGRATION_DATABASE_URL` for migrations and `DATABASE_URL` for the application. The URLs target the same database branch with separate roles. Preview deployments only build the app.

## Workflow

1. Edit the schema and run `npm run db:generate -- --name=description`.
2. Review the SQL and apply locally with `npm run db:migrate:dev` (uses `.env.local`).
3. Run `npm run db:check` and `npm run typecheck`. Commit the schema and migration together.
4. Merge the reviewed migration. Production Vercel deployments run `npm run db:migrate` and stop if it fails. If the app build fails after the migration succeeds, the schema change remains applied.

Never edit applied migrations. Back up before destructive changes.

## Key Files

| File                       | Purpose                            |
| -------------------------- | ---------------------------------- |
| `src/db/schema.ts`         | Tables and constraints             |
| `drizzle-postgres/`        | Active migrations and snapshots    |
| `drizzle/`                 | Archived MySQL migrations          |
| `drizzle.config.ts`        | Dialect, paths, and connection     |
| `scripts/vercel-build.mjs` | Production migration and app build |
