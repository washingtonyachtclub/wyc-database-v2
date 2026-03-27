# RBAC System

## Overview

The WYC database controls access through a **position-to-privilege mapping**. Members are assigned to organizational positions (e.g., Commodore, Ratings Examiner) via the `officers` table, and each position is mapped to one or more privileges via `pos_priv_map`. At login, the system walks this chain to determine what the user can do.

```
WYCDatabase (member)
    |
officers (member -> position, active flag)
    |
positions (role definition)
    |
pos_priv_map (position -> privilege)
    |
privs (privilege code: db, rtgs, etc.)
```

A member can hold multiple positions simultaneously (multiple `officers` rows), and each position can grant multiple privileges. The union of all privileges from all active positions becomes the user's privilege set.

---

## Database Tables

### `officers`

Links members to positions. One row per member-position assignment.

| Column     | Type       | Description                               |
|------------|------------|-------------------------------------------|
| `_index`   | int PK     | Row ID                                    |
| `member`   | int FK     | `WYCDatabase.WYCNumber` of the member     |
| `position` | int FK     | `positions._index` of the assigned position |
| `active`   | tinyint(1) | 1 = active, 0 = inactive (soft delete)    |

The `active` flag is a soft delete. Inactive records are kept for historical purposes but are excluded from all privilege resolution. When someone leaves a position, their row is set to `active = 0` rather than deleted.

### `positions`

Defines all organizational roles.

| Column           | Type        | Description                          |
|------------------|-------------|--------------------------------------|
| `_index`         | int PK      | Position ID                          |
| `name`           | varchar(50) | Display name (e.g., "Commodore")     |
| `sortorder`      | int         | Display ordering                     |
| `is_dues_exempt` | tinyint(1)  | Whether this position exempts from dues |
| `type`           | int FK      | `pos_type._index` (Corporate, Committee, Chief, Other) |
| `bookmark`       | varchar(50) | Short code reference                 |
| `job_desc`       | varchar(50) | Link to job description PDF          |

Position types group roles into categories: Type 1 (Corporate Leadership), Type 2 (Committee Roles), Type 3 (Chiefs), Type 4 (Other).

### `pos_priv_map`

Many-to-many mapping between positions and privileges.

| Column     | Type   | Description          |
|------------|--------|----------------------|
| `_index`   | int PK | Row ID               |
| `position` | int FK | `positions._index`   |
| `priv`     | int FK | `privs._index`       |

### `privs`

Defines the system's privilege codes.

| Column   | Type     | Description     |
|----------|----------|-----------------|
| `_index` | int PK   | Privilege ID    |
| `name`   | char(10) | Short code name |

---

## Privileges

The `privs` table contains 6 privilege codes. Only **`db` and `rtgs`** are used in v2.

| ID | Code    | Purpose                                    | v2 Status       |
|----|---------|--------------------------------------------|-----------------|
| 1  | `db`    | Member/lesson data management              | **Active**      |
| 2  | `snc`   | Saturday Night Crew                        | Legacy only     |
| 3  | `rtgs`  | Ratings assignments and tracking           | **Active**      |
| 4  | `wp`    | Work party attendance                      | Legacy only     |
| 5  | `check` | Boat checkout authorization                | Legacy only     |
| 6  | `kb`    | Keelboat reservations                      | Legacy only     |

The legacy privileges (`snc`, `wp`, `check`, `kb`) still exist in the `privs` table and are still mapped to positions via `pos_priv_map`. They originate from the Perl/PHP v1 system. The v2 `loadUserPrivileges()` function explicitly filters them out — it only keeps rows where `name === 'db' || name === 'rtgs'`.

---

## Positions That Grant `db` or `rtgs`

These are the positions whose `pos_priv_map` entries include `db` and/or `rtgs`. Positions that only have legacy privileges are omitted.

### Corporate Leadership (Type 1)

| ID   | Position         | `db` | `rtgs` |
|------|------------------|------|--------|
| 1000 | Commodore        | x    |        |
| 1010 | Vice Commodore   | x    |        |
| 1020 | Rear Commodore   | x    |        |

### Committee Roles (Type 2)

| ID   | Position             | `db` | `rtgs` |
|------|----------------------|------|--------|
| 2000 | Head Fleet Captain   | x    |        |
| 2160 | Program Director     | x    |        |
| 2220 | Purser               | x    |        |
| 2240 | Ratings Examiner     | x    | x      |
| 2250 | Computer Consultant  | x    | x      |
| 2260 | Webmaster            | x    | x      |

### Chiefs (Type 3)

| ID   | Position                | `db` | `rtgs` |
|------|-------------------------|------|--------|
| 3000 | Chief (general)         |      | x      |
| 3010 | Catamaran Chief         |      | x      |
| 3020 | Keelboat Chief          |      | x      |
| 3030 | Sailboard Chief         |      | x      |
| 3040 | Whaler Chief            |      | x      |
| 3050 | E-Scow Chief            |      | x      |
| 3060 | Sailboard Captain Chief |      | x      |

### Other (Type 4)

| ID   | Position   | `db` | `rtgs` |
|------|------------|------|--------|
| 4010 | RTGS Entry |      | x      |
| 4020 | Coder      | x    | x      |

The **Coder** position is the superuser/admin role — it has all 6 privileges in the database (including the legacy ones), which means it always has `db` and `rtgs` in v2.

---

## Dynamic Ratings Privilege

The `rtgs` privilege has a second grant path beyond the position chain: **current-quarter instructors automatically receive `rtgs`**.

At login, after resolving position-based privileges, the system checks the `lessons` table:

```sql
SELECT count(*) FROM lessons
WHERE (instructor1 = :wycNumber OR instructor2 = :wycNumber)
  AND expire >= :currentQuarter
```

If the user is `instructor1` or `instructor2` for any lesson in the current quarter (determined by the `lesson_quarter` table), and they don't already have `rtgs` from a position, it's added to their privilege set.

This means any active instructor can access ratings pages to manage their students' progress, even if they don't hold a position that explicitly grants `rtgs`.

The current quarter value comes from `lesson_quarter` (a single-row config table, `index = 1`).

---

## How Privileges Are Loaded

Privileges are resolved once at login by `loadUserPrivileges()` in `auth-server-fns.ts`:

1. **Position-based query**: `SELECT DISTINCT privs.name` from the `officers -> pos_priv_map -> privs` join chain, filtered to `officers.active = 1` and the logged-in member. Results are filtered to only `'db'` and `'rtgs'`.

2. **Dynamic instructor check**: Query the `lessons` table for current-quarter instructor assignments. If found and `rtgs` isn't already in the set, add it.

3. **Session storage**: The resulting `Privilege[]` array (e.g., `['db']`, `['rtgs']`, `['db', 'rtgs']`, or `[]`) is stored in the encrypted HTTP-only session cookie alongside the user info.

Privileges are **not refreshed mid-session**. If someone is added to or removed from a position, or becomes an instructor, they need to log out and back in for the change to take effect.

---

## Authorization Layers

Access control is enforced at three layers. All three use the same `hasPrivilege()` function and OR logic.

### 1. Route-Level Guards

**Files**: `permissions.ts`, `route-guards.ts`

The `routePermissions` object in `permissions.ts` is the single source of truth mapping routes to required privileges:

```typescript
export const routePermissions = {
  '/': [],                         // authenticated only
  '/members': ['db'],
  '/lessons': ['db'],
  '/my-lessons': [],               // authenticated only
  '/ratings': ['rtgs'],
  '/officers': ['db'],
  '/membership-processing': ['db'],
  // ...
}
```

Each route's `beforeLoad` hook calls `requirePrivilegeForRoute()`, which:
- Redirects to `/login` if not authenticated
- Redirects to `/forbidden` if the user lacks the required privilege
- Redirects to `/forbidden` if the route isn't in the registry (**fail-closed** — unlisted routes are denied by default)

### 2. Server Function Guards

**File**: `auth-middleware.ts`

Server functions apply their own privilege checks independently of route guards. This is the enforcement layer — even if someone bypasses the client-side route guard, the server function will reject the request.

| Function | Purpose |
|----------|---------|
| `requireAuth()` | Requires an authenticated session. Returns user ID or throws. |
| `requirePrivilege(...required)` | Requires any one of the listed privileges (OR logic). Returns user ID or throws. |
| `requireSelfOrPrivilege(targetWycNumber, ...required)` | Allows access if the user is viewing their own data (WYC number matches), OR if they have a required privilege. Used for profile pages. |
| `requireInstructorOrPrivilege(lessonIndex, ...required)` | Allows access if the user is instructor1/instructor2 of the given lesson, OR if they have a required privilege. Checks the `lessons` table for instructor status. Used for lesson detail/edit operations. |
| `sessionHasPrivilege(...required)` | Non-throwing boolean check. Used for conditional logic within server functions. |
| `optionalAuth()` | Returns user ID or null. Does not throw. |

### 3. Sidebar Visibility

**File**: `Sidebar.tsx`

The sidebar filters navigation items using the same `routePermissions` map and `hasPrivilege()` function. Users only see links to pages they can access. This keeps the UI consistent with the actual access control — if you can see the link, you can access the page.

---

## OR-Only Logic

All privilege checks use **OR logic**: when a route or function requires `['db', 'rtgs']`, the user needs **any one** of them, not both. There is no AND logic anywhere in the system.

```typescript
// From permissions.ts
export function hasPrivilege(
  userPrivileges: readonly Privilege[],
  required: readonly Privilege[],
): boolean {
  if (required.length === 0) return true        // no privilege needed
  return required.some((p) => userPrivileges.includes(p))  // OR
}
```

An empty required array (`[]`) means "any authenticated user" — no specific privilege needed.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | Drizzle schema for `officers`, `positions`, `posPrivMap`, `privs` tables |
| `src/lib/permissions.ts` | `Privilege` type, `routePermissions` registry, `hasPrivilege()` |
| `src/lib/auth-middleware.ts` | Server-side privilege check functions |
| `src/lib/auth-server-fns.ts` | `loadUserPrivileges()`, login/logout, dev impersonation tools |
| `src/lib/route-guards.ts` | `requirePrivilegeForRoute()` for route `beforeLoad` hooks |
| `src/lib/session.ts` | Session type definition and cookie configuration |
| `src/lib/auth-query-options.ts` | React Query hooks for current user/privileges |
| `src/components/Sidebar.tsx` | Privilege-filtered navigation |
