# Database schema changes

## Overview

The Worker reads and writes Cloudflare D1 through the `DB` binding. Wrangler tracks applied SQL files in `d1_migrations`.

## Workflow

1. Edit the SQLite schema in `src/db/schema.ts` and run `npm run db:generate -- description` to create a migration.
2. Write the SQL in that file and include revision triggers for new tables used by atomic writes.
3. Run `npm run db:check` to apply every migration to an empty SQLite database and compare column names with Drizzle.
4. Run `npm run db:migrate:local` and verify the application locally. Apply the same SQL to the hosted development database with `npm run db:migrate:dev`.

## Key files

| File               | Purpose                     |
| ------------------ | --------------------------- |
| `src/db/schema.ts` | Drizzle table definitions   |
| `migrations/d1/`   | Ordered D1 migration files  |
| `wrangler.jsonc`   | Worker and database binding |
