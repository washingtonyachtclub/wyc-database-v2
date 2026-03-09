# WYC Database v2 — Claude Instructions

## Type-driven data flow

This codebase uses a 3-layer type system with null cleanup at the mapper boundary. Every domain (members, lessons) follows this pattern.

### The three type layers (`src/db/types.ts`)

1. **Row type** (e.g., `MemberRow`, `LessonRow`) — `typeof table.$inferSelect`. Raw Drizzle output, full of `| null`. Never passed to components.
2. **Core type** (e.g., `Member`, `Lesson`) — Hand-written, no nulls. Represents a single entity without joins. Used for mutations, forms, and domain logic.
3. **TableRow type** (e.g., `MemberTableRow`, `LessonTableRow`) — Hand-written, no nulls. Includes resolved join fields (e.g., `type: string` from `classType.text`, `instructor1Name` from joined member table). Carries both raw IDs (for edit forms) and display strings. Used by table columns, cards, and display components.

### Mappers (`src/db/mappers.ts`)

- `toMember()`, `toLesson()` — Row → Core type
- `toMemberTableRow()`, `toLessonTableRow()` — joined query result → TableRow type
- All null cleanup happens here. Conventions:
  - `str()` → `''` for text fields
  - `num()` → `0` for numeric fields
  - `?? '<Unknown>'` for categorical display values (type names, etc.)
  - `?? TBD_WYC_NUMBER` for instructor FKs (WYCNumber 1 is the "TBD" placeholder member, defined in `src/db/constants.ts`)
  - `display !== 0` → `boolean` for tinyint flags
- No COALESCE in SQL. No `|| '—'` in components. Null handling is centralized in mappers.

### Query files (`src/db/member-queries.ts`, `src/db/lesson-queries.ts`)

- `selectFields` — the `.select({...})` shape for joined queries. Selects raw columns; no SQL transforms.
- `baseQuery()` — SELECT + JOINs. Returns the nullable joined shape that mappers consume.
- `sortColumns` — `Record<string, MySqlColumn>` mapping column IDs to Drizzle columns for `withSorting()`.
- Domain-specific filters (e.g., `withMemberFilters()`).

### Generic query helpers (`src/db/query-helpers.ts`)

- `withSorting(qb, sorting, columnMap, defaultColumn)` — applies ORDER BY via `.$dynamic()`
- `withPagination(qb, pageIndex, pageSize)` — applies LIMIT/OFFSET via `.$dynamic()`
- Reusable across all domains.

### Server functions (`src/lib/*-server-fns.ts`)

Thin wiring layer. Pattern:
```
baseQuery().$dynamic()
  → withFilters() → withSorting() → withPagination()
  → await query
  → raw.map(toTableRow)
  → return { data, totalCount }
```
No null handling, no query logic, no SQL inline. Just wiring.

### Components consume clean types

- Column definitions are simple accessors — no fallback formatting.
- Cards and display components use truthiness checks on strings (empty string = falsy = don't render). No null guards.
- Form modals receive `TableRow | null` and read fields directly (e.g., `lesson.typeId` instead of reverse-looking-up from a display string).

### Dates

- Use `string` (YYYY-MM-DD) for plain dates, not `Date`. `Date` objects don't survive JSON serialization across the TanStack Start server/client boundary.
- Drizzle schema uses `{ mode: 'string' }` for date columns.
- String comparison works for sorting/filtering YYYY-MM-DD values.
- If you need `Date` methods in a component, use `parseCalendarDate()` from `date-utils.ts` at the point of use.

## Route data flow pattern

- Use `Route.useLoaderDeps()` in components to consume derived state (filters, sorting, pagination) rather than re-deriving it from `Route.useSearch()`. `loaderDeps` is the single source of truth for any transformations on raw search params. The component should only use `useSearch()` for values it passes through directly (e.g., to UI controls).
- Use the function form of `navigate({ search: (prev) => ({ ...prev, ...changes }) })` to update search params. Only specify what changes — spread the rest.
- Apply defaults for search params in `validateSearch` so downstream code never has to handle `undefined` fallbacks (e.g., `expireQtrMode` defaults to `'exactly'` in `validateSearch`, not scattered `|| 'exactly'` checks).
