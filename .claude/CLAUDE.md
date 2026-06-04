# WYC Database v2 — Claude Instructions

## Code comments

Keep comments concise and write them only when the code can't speak for itself (a non-obvious decision, a constraint, a gotcha). Don't narrate what the code already says. Never reference transient artifacts — planning docs, `CLAUDE.md`, chat decisions, "mirrors X" — since those drift; explain the reason inline instead.

## Writing documentation (`documentation/`)

Docs in `documentation/` describe how the system works **right now**, declaratively. They are not changelogs or migration notes.

- **Describe the current state, not the change.** Never reference what something replaced, what it used to do, or how it differs from before ("previously X", "now also Y", "replacing the legacy Z", "this is the first record of..."). State what is, not what changed. (A dedicated "Legacy system" or "Migration" section is the only exception, when the history itself is the subject.)
- **Be concise.** No unnecessary words, no restating the obvious, much shorter than any plan it came from. No em dashes in prose.
- **No transient artifacts.** Don't reference planning docs, chat decisions, or TODOs.
- **Verify against the code, not the plan.** Implementations drift from their plans; document what the code actually does.
- Follow the structure of existing docs (e.g. `membership-processing.md`): an Overview, "How it works" sections, and a Key Files table. Use relative links to sibling docs.

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

### Error handling in server functions

- **Never forward `error.message`, `error.code`, `error.stack`, or `error.toString()` to the client.** These can leak database schema, SQL fragments, and internal details.
- Always `console.error` the full error server-side for debugging.
- Return or throw a static, generic message: `throw new Error('Failed to create member')`, not `throw new Error(`Failed: ${error.message}`)`.
- For known MySQL error codes (e.g., `ER_DATA_TOO_LONG`), use a human-friendly message without interpolating the raw error: `'Data too long for one or more fields'`, not `'Data too long: ${error.message}'`.

### Components consume clean types

- Column definitions are simple accessors — no fallback formatting.
- Cards and display components use truthiness checks on strings (empty string = falsy = don't render). No null guards.
- Form modals receive `TableRow | null` and read fields directly (e.g., `lesson.typeId` instead of reverse-looking-up from a display string).

### Dates

- Use `string` (YYYY-MM-DD) for plain dates, not `Date`. `Date` objects don't survive JSON serialization across the TanStack Start server/client boundary.
- Drizzle schema uses `{ mode: 'string' }` for date columns.
- String comparison works for sorting/filtering YYYY-MM-DD values.
- If you need `Date` methods in a component, use `parseCalendarDate()` from `date-utils.ts` at the point of use.

## UI components (shadcn/ui)

This project uses [shadcn/ui](https://ui.shadcn.com) — source-owned components in `src/components/ui/` built on Radix primitives + Tailwind CSS.

### Rules

- **Never use raw HTML elements** for interactive UI. Use the shadcn equivalents:
  - `<input>` → `<Input>` from `@/components/ui/input`
  - `<button>` → `<Button>` from `@/components/ui/button`
  - `<textarea>` → `<Textarea>` from `@/components/ui/textarea`
  - `<label>` → `<Label>` from `@/components/ui/label`
  - `<select>` → `<Select>` + `<SelectTrigger>` + `<SelectContent>` + `<SelectItem>` from `@/components/ui/select` (Radix-based, uses `onValueChange(value: string)` not `e.target.value`)
  - `<table>` → use `<DataTable table={table} />` from `@/components/ui/DataTable` for TanStack Table instances
  - Modal/dialog → `<Modal>` from `@/components/ui/Modal` (wraps shadcn Dialog)
  - Searchable dropdown → `<MemberCombobox>` from `@/components/ui/MemberCombobox` (wraps shadcn Popover + Command)
- **Exception**: Native `<select>` is acceptable for filter controls that need conditional active-state styling (e.g., `FilterControls.tsx`). Use the shared `selectClass` constant for consistent styling.
- **Use `cn()` from `@/lib/utils`** for conditional/merged class names.
- **Use theme tokens** (`bg-primary`, `text-muted-foreground`, `border-input`, etc.) — never hardcode colors like `bg-indigo-600` or `text-gray-900`.
- **Check `src/components/ui/` before writing any new UI component.** If a component already exists that's close but not quite right, extend it (e.g., add a prop) rather than duplicating it inline. If you're about to write something that looks reusable — a copy box, a labeled container, a confirmation pattern — flag it and ask whether it should live in `src/components/ui/` instead of inline in a route.

### Form fields + TanStack Form

Form fields are in `src/components/ui/app-form-fields.tsx` and are registered with TanStack Form via `src/hooks/form.ts`. They use `useFieldContext`/`useFormContext` internally. Components: `TextField`, `TextAreaField`, `NumberField`, `SelectField`, `BooleanSelectField`, `SubmitButton`. These all use shadcn primitives internally — don't bypass them with raw HTML in form modals.

### Available shadcn primitives

`button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `select.tsx`, `dialog.tsx`, `table.tsx`, `popover.tsx`, `command.tsx` — all in `src/components/ui/`.

### Adding new shadcn components

The project has a zod v3/v4 peer dep conflict (`.npmrc` has `legacy-peer-deps=true`). If `npx shadcn@latest add <component>` fails on network or dep issues, create the component file manually in `src/components/ui/` following the shadcn source patterns. Required deps: `@radix-ui/react-*` (install with `npm install --legacy-peer-deps`).

## Environment detection

- `VITE_APP_ENV` is set to `"dev"` in `.env.dev`. It is **not set** in production Vercel env files — absence means production.
- Two Vercel projects: a **main** (production) project and a **dev** project for testing/messing around.
- Use `isDevEnvironment()` from `src/lib/env.ts` for all dev-vs-prod checks. Never inline `import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'dev'` — use the helper.
- The helper checks both `import.meta.env.DEV` (Vite compile-time, true during `vite dev`) and `import.meta.env.VITE_APP_ENV === 'dev'` (runtime, true on the deployed dev Vercel project).
- Works in both client components and server functions (Vite processes both bundles).

### Dev email simulation (`src/lib/email.ts`)

- In dev, `sendEmail()` redirects all recipients to `delivered@resend.dev` (Resend's test address — API succeeds, no real delivery).
- Full email details (original recipient, subject, body, idempotency key) are logged to the server console.
- `sendEmail()` returns `{ id, simulated }`. Callers pass `emailSimulated` to the UI alongside `emailSent`.
- UI shows `<EmailSimulatedNotice />` (`src/components/ui/EmailSimulatedNotice.tsx`) when `emailSimulated` is true.
- `emailSent` stays `true` when simulated (the API call succeeded). The red "email failed" fallback only appears on genuine API errors.

## Route data flow pattern

- Use `Route.useLoaderDeps()` in components to consume derived state (filters, sorting, pagination) rather than re-deriving it from `Route.useSearch()`. `loaderDeps` is the single source of truth for any transformations on raw search params. The component should only use `useSearch()` for values it passes through directly (e.g., to UI controls).
- Use the function form of `navigate({ search: (prev) => ({ ...prev, ...changes }) })` to update search params. Only specify what changes — spread the rest.
- **Always pass `resetScroll: false`** on in-page search param updates (pagination, sorting, filters). Without it, TanStack Router's scroll restoration scrolls the page to the top on every `navigate()`. Only omit it for actual route changes (navigating to a different page).
- Apply defaults for search params in `validateSearch` so downstream code never has to handle `undefined` fallbacks (e.g., `expireQtrMode` defaults to `'exactly'` in `validateSearch`, not scattered `|| 'exactly'` checks).
- **Loader must return the main data promise directly** — not wrapped in an object. When a loader returns `{ data: Promise, ref: Promise }`, the loader itself resolves instantly (sync object), so the component mounts before data arrives and `useSuspenseQuery` suspends → full page flash. Instead, return `context.queryClient.ensureQueryData(mainQuery)` directly so the Router awaits it and keeps the old page visible during loading. Prefetch secondary data (rating types, categories) as fire-and-forget in the loader; consume them with `useQuery` (not `useSuspenseQuery`) in the component.
