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

### Form fields + TanStack Form

Form fields are in `src/components/ui/app-form-fields.tsx` and are registered with TanStack Form via `src/hooks/form.ts`. They use `useFieldContext`/`useFormContext` internally. Components: `TextField`, `TextAreaField`, `NumberField`, `SelectField`, `BooleanSelectField`, `SubmitButton`. These all use shadcn primitives internally — don't bypass them with raw HTML in form modals.

### Available shadcn primitives

`button.tsx`, `input.tsx`, `textarea.tsx`, `label.tsx`, `select.tsx`, `dialog.tsx`, `table.tsx`, `popover.tsx`, `command.tsx` — all in `src/components/ui/`.

### Adding new shadcn components

The project has a zod v3/v4 peer dep conflict (`.npmrc` has `legacy-peer-deps=true`). If `npx shadcn@latest add <component>` fails on network or dep issues, create the component file manually in `src/components/ui/` following the shadcn source patterns. Required deps: `@radix-ui/react-*` (install with `npm install --legacy-peer-deps`).

## Route data flow pattern

- Use `Route.useLoaderDeps()` in components to consume derived state (filters, sorting, pagination) rather than re-deriving it from `Route.useSearch()`. `loaderDeps` is the single source of truth for any transformations on raw search params. The component should only use `useSearch()` for values it passes through directly (e.g., to UI controls).
- Use the function form of `navigate({ search: (prev) => ({ ...prev, ...changes }) })` to update search params. Only specify what changes — spread the rest.
- Apply defaults for search params in `validateSearch` so downstream code never has to handle `undefined` fallbacks (e.g., `expireQtrMode` defaults to `'exactly'` in `validateSearch`, not scattered `|| 'exactly'` checks).
- **Loader must return the main data promise directly** — not wrapped in an object. When a loader returns `{ data: Promise, ref: Promise }`, the loader itself resolves instantly (sync object), so the component mounts before data arrives and `useSuspenseQuery` suspends → full page flash. Instead, return `context.queryClient.ensureQueryData(mainQuery)` directly so the Router awaits it and keeps the old page visible during loading. Prefetch secondary data (rating types, categories) as fire-and-forget in the loader; consume them with `useQuery` (not `useSuspenseQuery`) in the component.
