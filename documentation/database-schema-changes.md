# Database schema changes

## Overview

The Worker reads and writes Cloudflare D1 through the `DB` binding. Wrangler tracks applied SQL files in `d1_migrations`.

## Workflow

1. Edit the SQLite schema in `src/db/schema.ts` and run `npm run db:generate -- description` to create a migration.
2. Write the SQL in that file.
3. Run `npm run db:check` to apply every migration to an empty SQLite database and compare column names with Drizzle.
4. Run `npm run db:migrate:dev` to apply pending migrations to shared development D1 and verify the app locally.
5. Merge the PR to `main`. After the production build succeeds, Cloudflare Workers Builds applies pending migrations to production D1 before deploying the Worker. A migration failure stops deployment.

## Key files

| File               | Purpose                     |
| ------------------ | --------------------------- |
| `src/db/schema.ts` | Drizzle table definitions   |
| `migrations/d1/`   | Ordered D1 migration files  |
| `wrangler.jsonc`   | Worker and database binding |

## Migration from PlanetScale

Run `node --env-file=/private/path/source.env scripts/export-planetscale-d1.mjs /private/path/club.sql` with the source PostgreSQL connection in `DATABASE_URL`. The exporter reads a consistent snapshot, preserves record IDs and password hashes, checks foreign keys, and prints per-table counts. The SQL file contains private member data.

Apply the D1 migrations to an empty destination, then import the snapshot with `npx wrangler d1 execute DB --remote --file /private/path/club.sql`. Check counts against the export before pointing a Worker at the destination. For console access, open the database under **Storage & databases → D1 SQL database → Console** in the club account.
