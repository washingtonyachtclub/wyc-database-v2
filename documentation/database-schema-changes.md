# Database Schema Changes

## The basic idea

`src/db/schema.ts` describes the database structure we want.

The folders in `drizzle/` contain the SQL needed to make that structure real. Drizzle records which
migrations each database has already run.

`DATABASE_URL` selects the database a command uses. Editing `schema.ts` or merging a pull request
does not run SQL.

## Commands

| Command                                     | What it does                                                    |
| ------------------------------------------- | --------------------------------------------------------------- |
| `npm run db:generate -- --name=description` | Creates a SQL migration from changes in `schema.ts`             |
| `npm run db:migrate:dev`                    | Runs new migrations on development                              |
| `npm run db:migrate`                        | Runs new migrations on the database in `DATABASE_URL`           |
| `npm run db:check`                          | Checks that `schema.ts` and the migration files agree           |
| `npm run db:diff:dev`                       | Compares development with `schema.ts` without changing anything |

`db:baseline` is a one-time setup command for a database that existed before this migration system.
It is not part of normal schema changes.

## Making a schema change

1. Update your branch from `main`.
2. Edit `src/db/schema.ts`.
3. Generate the migration:

   ```bash
   npm run db:generate -- --name=add_example_column
   ```

4. Read the generated `migration.sql`. Pay special attention to `DROP`, `RENAME`, type changes, and
   `NOT NULL`.
5. Apply it to development:

   ```bash
   npm run db:migrate:dev
   ```

6. Confirm development matches:

   ```bash
   npm run db:diff:dev
   ```

   The expected result is `No changes detected`.

7. Test the app and commit both `schema.ts` and the new `drizzle/` folder.
8. Open and merge the pull request. CI runs `db:check`.
9. Vercel runs new migrations and then builds the application.

Vercel runs migrations only for production deployments. Preview deployments only build the
application. Both Vercel projects use this process, so each project migrates the database in its own
`DATABASE_URL`.

If a migration or build fails, Vercel does not make that deployment live. A successful migration is
still recorded even if the later application build fails.

## Collaboration

Every schema pull request includes its generated migration.

When another schema change lands first, rebase onto `main`, run `db:check`, and regenerate only your
unmerged migration if Drizzle reports a conflict.

Do not edit a migration that has already run in production. Make another migration to correct it.

## Safety

Make a database backup before a migration that removes data, renames columns, narrows a type, or
adds a strict constraint.

MySQL can keep earlier schema statements when a later statement fails. Inspect the database before
retrying a failed migration.

## Key files

| File                       | Purpose                               |
| -------------------------- | ------------------------------------- |
| `src/db/schema.ts`         | Intended database structure           |
| `drizzle/`                 | Generated SQL migrations              |
| `drizzle.config.ts`        | Drizzle paths and database connection |
| `.github/workflows/ci.yml` | Pull request checks                   |
| `vercel.json`              | Vercel build command                  |
| `scripts/vercel-build.mjs` | Production migration and app build    |
