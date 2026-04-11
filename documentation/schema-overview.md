# Database Schema Overview

The database has 33 tables defined in `src/db/schema.ts`. Of these, **16 are actively used in v2** and **17 are legacy-only** (carried over from the Perl/PHP system, defined in schema but never imported in v2 code).

---

## Key Tables (Column Details)

### `WYCDatabase` — Member Records

Primary table. One row per member, keyed by WYC number.

| Column            | Type         | Description                                                                      |
| ----------------- | ------------ | -------------------------------------------------------------------------------- |
| `WYCNumber`       | int PK       | Unique member ID                                                                 |
| `First`           | char(50)     | First name                                                                       |
| `Last`            | char(50)     | Last name                                                                        |
| `Email`           | char(50)     | Email address                                                                    |
| `StreetAddress`   | char(100)    | Street address                                                                   |
| `City`            | char(50)     | City                                                                             |
| `State`           | char(20)     | State                                                                            |
| `ZipCode`         | char(10)     | ZIP code                                                                         |
| `Phone1`          | char(50)     | Primary phone                                                                    |
| `Phone2`          | char(50)     | Secondary phone                                                                  |
| `Category`        | int FK       | Membership category (`memcat._index`)                                            |
| `ExpireQtr`       | int FK       | Membership expiration quarter (`quarters._index`). Active if `>= currentQuarter` |
| `StudentID`       | int          | Student ID number                                                                |
| `JoinDate`        | timestamp    | Auto-populated on insert                                                         |
| `out_to_sea`      | tinyint(1)   | Blocks boat checkout even if membership is active                                |
| `password`        | char(50)     | Legacy password hash                                                             |
| `password_argon2` | varchar(255) | Modern Argon2id password hash                                                    |
| `image_name`      | char(50)     | Profile image filename                                                           |

### `lessons` — Lesson/Class Offerings

One row per lesson offered.

| Column         | Type        | Description                                                             |
| -------------- | ----------- | ----------------------------------------------------------------------- |
| `_index`       | int PK      | Lesson ID                                                               |
| `type`         | int FK      | Lesson type (`class_type._index`)                                       |
| `subtype`      | varchar(80) | Additional type info                                                    |
| `day`          | varchar(80) | Day of week                                                             |
| `time`         | varchar(80) | Time of day                                                             |
| `dates`        | text        | Human-readable date listing                                             |
| `CalendarDate` | date        | Sortable date (YYYY-MM-DD string)                                       |
| `instructor1`  | int FK      | Primary instructor (`WYCDatabase.WYCNumber`)                            |
| `instructor2`  | int FK      | Secondary instructor (`WYCDatabase.WYCNumber`)                          |
| `comments`     | blob        | Lesson notes (stored as blob, read as UTF-8 string)                     |
| `size`         | int         | Enrollment cap                                                          |
| `expire`       | int FK      | Last quarter shown (`quarters._index`). See [quarters doc](quarters.md) |
| `display`      | tinyint     | Visibility flag                                                         |

### `ratings` — Rating Type Definitions

Defines all certifications a member can earn. Organized by boat class and skill level.

| Column   | Type        | Description                                                 |
| -------- | ----------- | ----------------------------------------------------------- |
| `_index` | int PK      | Rating ID                                                   |
| `text`   | char(50)    | Display name (e.g., "SH Skipper")                           |
| `type`   | varchar(10) | Boat class: `SH`, `DH`, `KB`, `Cat`, `SB`, `written`, `rig` |
| `degree` | int         | Skill level: 0=Crew, 1=Novice, 2=Intermediate, 3=Skipper    |

Progression per boat class: Crew → Novice → Intermediate → Skipper. Written tests are tracked separately with `type='written'`.

### `wyc_ratings` — Member Rating Awards

Tracks which members earned which ratings.

| Column     | Type         | Description                        |
| ---------- | ------------ | ---------------------------------- |
| `_index`   | int PK       | Record ID                          |
| `member`   | int FK       | `WYCDatabase.WYCNumber`            |
| `rating`   | int FK       | `ratings._index`                   |
| `date`     | date         | Date awarded (YYYY-MM-DD string)   |
| `examiner` | int FK       | Examiner's `WYCDatabase.WYCNumber` |
| `comments` | varchar(255) | Optional notes                     |

A member can hold multiple ratings and can earn the same rating more than once (re-certification).

---

## All Tables by Domain

### Members (v2-active)

| Table            | Purpose                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `WYCDatabase`    | Primary member records                                                |
| `memcat`         | Membership category lookup (Student, Faculty, Alumni, Honorary)       |
| `quarters`       | Quarter index → display text mapping. See [quarters doc](quarters.md) |
| `lesson_quarter` | Single-row config: current active quarter                             |

### Lessons (v2-active)

| Table        | Purpose                                |
| ------------ | -------------------------------------- |
| `lessons`    | Lesson/class offerings                 |
| `class_type` | Lesson type lookup (e.g., "Laser 101") |
| `signups`    | Student → lesson enrollments           |

### Ratings (v2-active)

| Table         | Purpose                 |
| ------------- | ----------------------- |
| `ratings`     | Rating type definitions |
| `wyc_ratings` | Member rating awards    |

### Officers / RBAC (v2-active)

See [RBAC docs](rbac.md) for detailed coverage.

| Table          | Purpose                       |
| -------------- | ----------------------------- |
| `officers`     | Member → position assignments |
| `positions`    | Position definitions          |
| `pos_type`     | Position type categories      |
| `pos_priv_map` | Position → privilege mapping  |
| `privs`        | Privilege code definitions    |

### Boats (v2-active)

| Table        | Purpose                              |
| ------------ | ------------------------------------ |
| `boat_types` | Boat type definitions (fleet, count) |
| `checkouts`  | Boat checkout records                |

### Legacy-Only Tables

These are defined in `schema.ts` but not imported or queried in v2 code. They exist because the v2 schema was generated from the production database.

| Table              | Domain   | Purpose                                                 |
| ------------------ | -------- | ------------------------------------------------------- |
| `options`          | Config   | Key-value config store (costs, status flags)            |
| `recip`            | Config   | Reciprocal sailing club directory                       |
| `sessions`         | Auth     | Legacy session tracking (v2 uses cookie-based sessions) |
| `calendaradmin`    | Calendar | Calendar admin ACL                                      |
| `calendarboats`    | Calendar | Old boat reservation boats                              |
| `calendarcomment`  | Calendar | Calendar event comments                                 |
| `calendarconfig`   | Calendar | IP whitelist for calendar                               |
| `calendartable`    | Calendar | Old keelboat reservation system                         |
| `keelboat_pricing` | Keelboat | Rental pricing tiers                                    |
| `snc`              | SNC      | Saturday Night Crew signups                             |
| `snc_food`         | SNC      | SNC menu items                                          |
| `snc_work`         | SNC      | SNC volunteer duty types                                |
| `crew`             | Boats    | Checkout crew member records                            |
| `guests`           | Boats    | Guest crew on checkouts                                 |
| `noyes`            | Lookup   | Yes/No boolean lookup                                   |
| `priority_types`   | Misc     | Unused priority classification                          |
| `wyc_wind`         | Misc     | Historical wind data                                    |

---

## Schema Conventions

- **Primary keys** are `_index` (auto-increment int) on most tables. Exception: `WYCDatabase` uses `WYCNumber`.
- **Foreign keys** are stored as plain `int` columns — no database-level FK constraints. Referential integrity is enforced in application code.
- **Lookup tables** (`memcat`, `class_type`, `noyes`, `pos_type`, `ratings`, `privs`) follow a common pattern: `_index` PK + `text` display column.
- **Dates** use `{ mode: 'string' }` in Drizzle, stored as `YYYY-MM-DD` strings (not `Date` objects) to survive JSON serialization across the TanStack Start boundary.
- **Booleans** are `tinyint(1)` — `0`/`1` in the database, converted to `boolean` in TypeScript mappers.
- **Blob columns** (e.g., `lessons.comments`) use a custom Drizzle type that reads as UTF-8 strings.
