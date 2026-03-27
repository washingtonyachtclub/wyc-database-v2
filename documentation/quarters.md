# Quarter System

## Overview

Quarters are the universal time unit in the WYC database. They control:

- **Membership status** — a member is active if their `ExpireQtr >= currentQuarter`
- **Lesson visibility** — lessons with `expire >= currentQuarter` are shown
- **Instructor privileges** — teaching a current-quarter lesson grants the `rtgs` privilege (see [RBAC docs](rbac.md))

Quarters are stored as **integer indices**, not formatted strings. The `quarters` table maps each index to display text.

---

## Tables

### `quarters`

Lookup table mapping integer indices to human-readable quarter names.

| Column    | Type     | Description                              |
|-----------|----------|------------------------------------------|
| `_index`  | int PK   | Sequential quarter index                 |
| `text`    | char(50) | Month + year display (e.g., "Dec 2024")  |
| `school`  | char(50) | Academic term (e.g., "Fall 2024")        |
| `endDate` | date     | Quarter end date (may be NULL for future) |

**Index pattern:**
- Indices 1-2 are special (Unknown, Honorary)
- Index 3 = Summer 1999 (first real quarter)
- Increments by 1 each quarter in a repeating cycle: **Summer, Fall, Winter, Spring**

Example:

```
_index  text          school          endDate
103     Sept 2024     Summer 2024     2024-09-30
104     Dec 2024      Fall 2024       2025-01-01
105     March 2025    Winter 2025     2025-04-02
106     June 2025     Spring 2025     NULL
```

### `lesson_quarter`

Single-row configuration table that stores which quarter is "current."

| Column    | Type   | Description                                    |
|-----------|--------|------------------------------------------------|
| `_index`  | int PK | Always 1                                       |
| `quarter` | int    | Current quarter index (FK to `quarters._index`) |

This value is **manually updated** — there is no automatic rollover. In the legacy system, the Vice Commodore updates it via the Lesson Control Panel. If set incorrectly, membership validation, lesson visibility, and instructor privilege grants will all be wrong.

---

## How Quarters Are Used

### Member Expiration

The `WYCDatabase.ExpireQtr` column stores the quarter index through which a member's membership is paid.

```
ExpireQtr >= currentQuarter  →  active member
ExpireQtr <  currentQuarter  →  expired member
```

This comparison drives membership validation across the app: page access, boat checkout eligibility, and the membership processing page.

### Lesson Expiration

The `lessons.expire` column stores the last quarter a lesson should be visible.

```
expire >= currentQuarter  →  lesson is shown
expire >  currentQuarter  →  lesson is for a future quarter
expire == currentQuarter  →  lesson is current quarter
expire <  currentQuarter  →  lesson is hidden
```

### Instructor Privilege Grant

At login, the system checks if the user is `instructor1` or `instructor2` for any lesson where `expire >= currentQuarter`. If so, they receive the `rtgs` privilege for that session. See [RBAC docs](rbac.md#dynamic-ratings-privilege) for details.

---

## Display Values

Code never displays raw quarter indices to users. When displaying quarters, the system joins to `quarters` to get:

- `quarters.text` — compact format like "Dec 2024" (used in tables, dropdowns)
- `quarters.school` — academic format like "Fall 2024" (used in some contexts)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/db/schema.ts` | `quarters` and `lessonQuarter` table definitions |
| `src/lib/lessons-server-fns.ts` | `getCurrentQuarter()` server function |
| `src/lib/auth-server-fns.ts` | Quarter check in `loadUserPrivileges()` for instructor grant |
