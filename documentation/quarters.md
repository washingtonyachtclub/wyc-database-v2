# Quarter System

## Overview

Quarters are the universal time unit in the WYC database. They control:

- **Membership status** — a member is active if their `ExpireQtr >= currentQuarter`
- **Lesson membership eligibility** — membership must cover the quarter containing the final session day
- **Instructor privileges** — teaching a current or future-quarter lesson grants the `rtgs` privilege

Quarters are stored as **integer indices**, not formatted strings. The `quarters` table maps each index to display text.

---

## Tables

### `quarters`

Lookup table mapping integer indices to human-readable quarter names.

| Column    | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `_index`  | int PK   | Sequential quarter index                  |
| `text`    | char(50) | Month + year display (e.g., "Dec 2024")   |
| `school`  | char(50) | Academic term (e.g., "Fall 2024")         |
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

Single-row configuration for the current quarter and the renewal quarter.

| Column            | Type   | Description                               |
| ----------------- | ------ | ----------------------------------------- |
| `_index`          | int PK | Always 1                                  |
| `quarter`         | int    | Current quarter index                     |
| `renewal_quarter` | int    | Renewal quarter (FK to `quarters._index`) |

Users with the `db` privilege set each value independently on **Set Current Quarter**. The current quarter determines membership status. The renewal quarter determines the starting quarter for new memberships and renewals. See [membership renewals](membership-renewals.md).

---

## How Quarters Are Used

### Member Expiration

The `WYCDatabase.ExpireQtr` column stores the quarter index through which a member's membership is paid.

```
ExpireQtr >= currentQuarter  →  active member
ExpireQtr <  currentQuarter  →  expired member
```

This comparison drives membership validation across the app, including page access and boat checkout eligibility.

### Lesson Expiration

The last session's end date determines the membership quarter required for signup and the quarter used in administrative lists. The previous quarter's end date is exclusive and the assigned quarter's end date is inclusive. Historical lessons without session rows use their recorded calendar date.

Creating or updating a lesson requires an unambiguous quarter. A session ending on a recorded quarter end belongs to that quarter. Changes to quarter dates take effect for new signups and leave existing enrollments in place. New signups close if the quarter cannot be determined. Public visibility depends on session dates in Seattle. See [lesson visibility and calendar](lesson-calendar.md).

### Instructor Privilege Grant

Users assigned as `instructor1` or `instructor2` for a lesson whose final session falls in the current quarter or later receive the `rtgs` privilege.

---

## Display Values

Code never displays raw quarter indices to users. When displaying quarters, the system joins to `quarters` to get:

- `quarters.text` — compact format like "Dec 2024" (used in tables, dropdowns)
- `quarters.school` — academic format like "Fall 2024" (used in some contexts)

---

## Key Files

| File                            | Purpose                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| `src/db/schema.ts`              | `quarters` and `lessonQuarter` table definitions             |
| `src/lib/lessons-server-fns.ts` | `getCurrentQuarter()` server function                        |
| `src/lib/auth/identity.ts`      | Quarter check in `loadUserPrivileges()` for instructor grant |
