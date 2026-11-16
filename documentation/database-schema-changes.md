# Database Schema Changes

## Overview

`src/db/schema.ts` defines the PostgreSQL schema. Migrations run explicitly against `DATABASE_URL`; Vercel builds do not modify the database.

## Workflow

1. Edit the schema and run `npm run db:generate -- --name=description`.
2. Review the SQL and apply locally with `npm run db:migrate:dev` (uses `.env.local`).
3. Run `npm run db:check` and `npm run typecheck`. Commit the schema and migration together.
4. Apply reviewed migrations with `npm run db:migrate` before deploying compatible code.

Never edit applied migrations. Back up before destructive changes.

## Key Files

| File                | Purpose                         |
| ------------------- | ------------------------------- |
| `src/db/schema.ts`  | Tables and constraints          |
| `drizzle-postgres/` | Active migrations and snapshots |
| `drizzle/`          | Archived MySQL migrations       |
| `drizzle.config.ts` | Dialect, paths, and connection  |
