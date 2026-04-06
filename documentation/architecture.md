# Architecture

This document describes the internal architecture of the v2 database application: how code is organized, how data flows from database to UI, and the conventions that hold it together.

## Project structure

```
src/
  components/       # React components, organized by domain
    ui/             # shadcn/ui primitives and shared UI components
    members/        # Member-specific components (filters, columns, detail sections)
    lessons/        # Lesson-specific components
    ...             # Other domain component folders
  db/               # Shared database layer
    schema.ts       # Drizzle ORM schema (all tables)
    mapper-utils.ts # Null-cleanup helpers: str(), num(), fullName()
    query-helpers.ts# Generic withSorting(), withPagination()
    constants.ts    # Domain constants (e.g. TBD_WYC_NUMBER)
  domains/          # Domain-specific logic, one folder per domain
    members/        # queries.ts, schema.ts, server-fns.ts, filter-types.ts, query-options.ts
    lessons/        # Same structure
    ratings/        # Same structure
    ...             # boat-types, officers, positions, quarters, etc.
  hooks/            # Shared React hooks (form context)
  integrations/     # External service integrations (TanStack Query setup)
  lib/              # Server-side utilities and cross-cutting logic
    auth/           # Authentication + authorization (session, middleware, password hashing)
    email.ts        # Email sending (Resend integration)
    env.ts          # Environment detection helper
    date-utils.ts   # Date parsing/formatting
    permissions.ts  # Privilege constants and helpers
    route-guards.ts # Route-level auth checks
  routes/           # TanStack Router file-based routes
```

### Domain folders

Each domain in `src/domains/` follows the same structure:

| File               | Purpose                                                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`        | Zod validation schemas, TypeScript types (Core + TableRow), mappers (Row to Core, Row to TableRow, form data to insert shape) |
| `queries.ts`       | `selectFields`, `baseQuery()`, `sortColumns`, domain-specific `withFilters()`                                                 |
| `server-fns.ts`    | TanStack Start server functions. Thin wiring between queries, sorting, pagination, and mappers                                |
| `filter-types.ts`  | TypeScript types for filter parameters                                                                                        |
| `query-options.ts` | TanStack Query option factories for client-side data fetching                                                                 |

Simpler domains (e.g. `boat-types`) may omit `queries.ts` and `filter-types.ts` if they don't need custom query logic.

## Type-driven data flow

Every domain uses a 3-layer type system. Null cleanup happens at the mapper boundary, not in SQL or components.

### The three type layers

1. **Row type** (`typeof table.$inferSelect`). Raw Drizzle output, full of `| null`. Never passed to components.
2. **Core type** (e.g. `Member`, `Lesson`). Hand-written, no nulls on string fields. Represents a single entity without joins. Used for mutations, forms, and domain logic.
3. **TableRow type** (e.g. `MemberTableRow`, `LessonTableRow`). Hand-written, no nulls. Includes resolved join fields (e.g. `category: string` from the `memcat` table, `instructor1Name` from a joined member). Carries both raw IDs (for edit forms) and display strings (for table columns). Used by table columns, cards, and display components.

### Mappers

Each domain's `schema.ts` contains mapper functions:

- **`toXxx(row)`** converts a Row to a Core type (e.g. `toMember()`)
- **`toXxxTableRow(row)`** converts a joined query result to a TableRow type (e.g. `toMemberTableRow()`)
- **`fromXxxInsert(data)`** converts form data to a DB insert shape (e.g. `fromMemberInsert()`)

All null cleanup is centralized in these mappers. Conventions:

| Pattern              | Meaning                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `str(value)`         | `null` → `''` for text fields                                    |
| `num(value)`         | `null` → `0` for numeric fields                                  |
| `?? '<Unknown>'`     | Fallback for categorical display values (type names, categories) |
| `(value ?? 0) !== 0` | tinyint → boolean                                                |

SQL does not use `COALESCE` and components do not use `?? '—'` fallback formatting. All null handling is centralized in the mapper layer.

### Query files

Each domain's `queries.ts` defines:

- **`selectFields`** is the `.select({...})` shape for joined queries. Selects raw columns with no SQL transforms.
- **`baseQuery()`** builds the SELECT + JOINs. Returns the nullable joined shape that mappers consume.
- **`sortColumns`** is a `Record<string, MySqlColumn>` mapping TanStack Table column IDs to Drizzle columns for `withSorting()`.
- **`withXxxFilters(qb, filters)`** is the domain-specific WHERE clause builder.

### Generic query helpers (`src/db/query-helpers.ts`)

Reusable across all domains:

- **`withSorting(qb, sorting, columnMap, defaultColumn)`** applies ORDER BY via `.$dynamic()`
- **`withPagination(qb, pageIndex, pageSize)`** applies LIMIT/OFFSET via `.$dynamic()`
- **`nameSearchCondition(firstCol, lastCol, name)`** builds LIKE conditions for name search

### Server functions (`src/domains/*/server-fns.ts`)

Server functions are thin wiring. They do not contain null handling, query logic, or inline SQL. Authorization checks (`requirePrivilege`, `requireAuth`, etc.) run at the top of each handler.

The general pattern:

```
baseQuery().$dynamic()
  -> withFilters()
  -> withSorting()
  -> withPagination()
  -> await query
  -> rawResults.map(toTableRow)
  -> return { data, totalCount }
```

#### Error handling

Server functions never forward raw error messages to the client. Fields like `error.message`, `error.code`, and `error.stack` can leak database schema and SQL fragments. Errors are logged server-side with `console.error`, and the client receives a static, generic message (e.g. `'Failed to create member'`).

## Write path

Data flows from the UI form to the database like this:

```
Form data (validated by Zod schema)
  -> z.infer<typeof Schema> type
  -> fromXxxInsert() mapper (form shape to DB insert shape)
  -> typeof table.$inferInsert type
  -> Drizzle INSERT/UPDATE
```

Zod schemas for writes (e.g. `CreateMemberSchema`, `MemberProfileUpdateSchema`) are defined in each domain's `schema.ts`. The `fromXxxInsert()` mapper handles type conversions like boolean to tinyint.

## Route data flow

### Search params and loader

- **`validateSearch`** applies defaults so downstream code never handles `undefined`. For example, `expireQtrMode` defaults to `'exactly'` in one place rather than scattered `|| 'exactly'` checks.
- **`loaderDeps`** derives state from search params (filters, sorting, pagination). Components consume this via `Route.useLoaderDeps()`, which is the single source of truth.
- **`navigate({ search: (prev) => ({ ...prev, ...changes }) })`** updates search params. Only specify what changes and spread the rest.

### Loader data fetching

The loader returns the main data promise directly, not wrapped in an object. This lets TanStack Router await it and keep the previous page visible during loading instead of flashing a loading state. Secondary data (reference tables like rating types, categories) is prefetched as fire-and-forget and consumed with `useQuery` (not `useSuspenseQuery`) in the component.

### Components consume clean types

Column definitions are simple accessors with no fallback formatting needed. Display components use truthiness checks on strings (empty string = falsy = don't render) and do not need null guards. Form modals receive the domain's TableRow or Core type and read fields directly.

## UI components

The project uses [shadcn/ui](https://ui.shadcn.com), which provides source-owned components in `src/components/ui/` built on Radix primitives and Tailwind CSS. Interactive UI uses shadcn components (`<Button>`, `<Input>`, `<Select>`, `<Modal>`, etc.) rather than raw HTML elements.

### Form fields

Form fields are in `src/components/ui/app-form-fields.tsx` and integrate with TanStack Form via `src/hooks/form.ts`. Available field components: `TextField`, `TextAreaField`, `NumberField`, `SelectField`, `BooleanSelectField`, `SubmitButton`. These use shadcn primitives internally.

### Styling

- **`cn()` from `src/lib/utils`** for conditional/merged class names.
- **Theme tokens** (`bg-primary`, `text-muted-foreground`, `border-input`, etc.) instead of hardcoded colors.

## Dates

Dates are `string` in YYYY-MM-DD format, not `Date` objects. `Date` does not survive JSON serialization across the TanStack Start server/client boundary. Drizzle schema uses `{ mode: 'string' }` for date columns. String comparison works for sorting and filtering YYYY-MM-DD values. If `Date` methods are needed in a component, use `parseCalendarDate()` from `date-utils.ts` at the point of use.

## Authentication and authorization

**Authentication** is session-based, implemented in `src/lib/auth/`. The `session.ts` file handles session creation and retrieval. Passwords are dual-hashed (legacy SHA1 + Argon2id) during the migration period. See `documentation/password-migration-plan.md` for the transition plan.

**Authorization** is privilege-based. The system is documented in `documentation/rbac.md`. Helper functions (`requireAuth`, `requirePrivilege`, `requireSelfOrPrivilege`) are in `src/lib/auth/auth-middleware.ts`. Route guards are in `src/lib/route-guards.ts`.

## Environment detection

- `isDevEnvironment()` from `src/lib/env.ts` is the single check for dev vs production. It checks both `import.meta.env.DEV` (Vite compile-time, true during `vite dev`) and `import.meta.env.VITE_APP_ENV === 'dev'` (runtime, true on the deployed dev Vercel project).
- Two Vercel projects exist: a production project and a dev project for testing.
- In dev, `sendEmail()` redirects all recipients to Resend's test address (`delivered@resend.dev`). Full email details are logged to the server console. The UI shows an `<EmailSimulatedNotice />` banner when emails are simulated.
