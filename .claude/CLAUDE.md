# WYC Database v2 — Claude Instructions

## Route data flow pattern

- Use `Route.useLoaderDeps()` in components to consume derived state (filters, sorting, pagination) rather than re-deriving it from `Route.useSearch()`. `loaderDeps` is the single source of truth for any transformations on raw search params. The component should only use `useSearch()` for values it passes through directly (e.g., to UI controls).
- Use the function form of `navigate({ search: (prev) => ({ ...prev, ...changes }) })` to update search params. Only specify what changes — spread the rest.
- Apply defaults for search params in `validateSearch` so downstream code never has to handle `undefined` fallbacks (e.g., `expireQtrMode` defaults to `'exactly'` in `validateSearch`, not scattered `|| 'exactly'` checks).
