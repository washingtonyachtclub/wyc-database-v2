# Argon2 Password Migration Plan

## Overview

Migrate password hashing from MySQL's double-SHA1 (`*` prefix format) to Argon2id while keeping the old Perl/PHP system functional during the transition. Both systems share the same MySQL database.

**Current state:**

- Old system (Perl/PHP): reads/writes `password` column using `CONCAT('*', UPPER(SHA1(UNHEX(SHA1(?)))))`
- New system (TanStack Start): reads `password` column using equivalent Node.js crypto in `src/lib/auth.ts`
- Both verify against the same `password CHAR(50)` column

**End state:**

- New system authenticates via Argon2id (`password_argon2` column)
- Old system continues to work unchanged against `password` column
- Users are transparently upgraded to Argon2id on login

---

## Phase 1: Add the `password_bcrypt` column

**Goal:** Schema change only. No behavior change. Both systems unaffected.

### 1.1 — Add the column to the live database

Run this in phpMyAdmin (SQL tab) or any MySQL client:

```sql
ALTER TABLE WYCDatabase
  ADD COLUMN password_argon2 VARCHAR(255) DEFAULT NULL
  AFTER password;
```

**Why `VARCHAR(255)`:** Argon2id hashes are variable length (typically ~95-100 characters, e.g., `$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$...`). `VARCHAR(255)` gives comfortable headroom.

**Why `DEFAULT NULL`:** Members who haven't been upgraded yet will have `NULL` in this column. This is the signal that the old hash should be used for verification.

**Why this is safe for the old system:**

- `WYCDB.pm` uses `SELECT WYCDatabase.*` — the new column appears in the result hash but Perl code only accesses known keys (`$ui_hash{Pw}`, `$ui_hash{Name}`, etc.). Unknown keys are ignored.
- Password verification in `Session.pm` reads `$ui_hash{Pw}` (aliased from `password`) — it doesn't know about `password_argon2`.
- Password updates in `MyPw.pm` and `NeedPW.pm` do `UPDATE ... SET password=...` — explicit column, won't touch the new column.
- `FormUtil.pm` dynamically builds HTML table headers from column names, so `password_argon2` will show up in admin views that use that utility. Cosmetic only, not breaking.

**Rollback:** `ALTER TABLE WYCDatabase DROP COLUMN password_argon2;`

### 1.2 — Add the column to the Drizzle schema

In `src/db/schema.ts`, add to the `wycDatabase` table definition:

```ts
export const wycDatabase = mysqlTable(
  'WYCDatabase',
  {
    // ... existing columns ...
    password: char({ length: 50 }),
    passwordArgon2: varchar('password_argon2', { length: 255 }), // <-- new
    outToSea: tinyint('out_to_sea').default(0),
    // ... rest of columns ...
  },
  // ... constraints ...
)
```

**Notes:**

- No `.default()` or `.notNull()` — the column is nullable, and NULL means "not yet upgraded."
- The explicit column name `'password_argon2'` maps the camelCase JS name to the snake_case DB column.
- `varchar` instead of `char` because Argon2id hashes are variable length.
- This does NOT push anything to the database. It only tells Drizzle the column exists so you can read/write it in queries.
- Do NOT run `drizzle-kit push` — the column already exists from step 1.1.

### 1.3 — Install argon2

```bash
npm install argon2 --legacy-peer-deps
```

`argon2` ships prebuilt binaries for common platforms, so native compilation is typically not triggered. No `@types` package needed — `argon2` bundles its own TypeScript definitions.

**No other dependencies needed.** The project already uses Node.js built-in `crypto` for the legacy hash.

---

## Phase 2: Dual-hash authentication

**Goal:** New system checks bcrypt first, falls back to legacy SHA1. On successful legacy login, transparently upgrades user to bcrypt. Old system remains untouched.

### 2.1 — Update `src/lib/auth.ts`

Replace the current file with dual-hash support. The existing `hashPassword` and `verifyPassword` functions stay (renamed for clarity) and new Argon2id functions are added.

```ts
// src/lib/auth.ts
import { createHash } from 'node:crypto'
import argon2 from 'argon2'

// ──────────────────────────────────────────────
// Legacy MySQL SHA1 format (read-only going forward)
// ──────────────────────────────────────────────

/**
 * Hash a password using MySQL's double-SHA1 format.
 * Only used for writing the legacy `password` column during the parallel period.
 */
export function hashPasswordLegacy(password: string): string {
  const firstHash = createHash('sha1').update(password).digest('hex')
  const binary = Buffer.from(firstHash, 'hex')
  const secondHash = createHash('sha1').update(binary).digest('hex')
  return `*${secondHash.toUpperCase()}`
}

/**
 * Verify a plaintext password against a legacy MySQL SHA1 hash.
 */
export function verifyPasswordLegacy(password: string, storedHash: string): boolean {
  const clean = (h: string) => (h.startsWith('*') ? h.slice(1) : h).toUpperCase()
  return clean(hashPasswordLegacy(password)) === clean(storedHash)
}

// ──────────────────────────────────────────────
// Argon2id (new standard)
// ──────────────────────────────────────────────

/**
 * Hash a password with Argon2id. Used for new password sets and upgrades.
 *
 * Uses argon2's defaults (Argon2id variant, 65536 KiB memory, 3 iterations,
 * 1 parallelism). These meet OWASP recommendations.
 */
export async function hashPasswordArgon2(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id })
}

/**
 * Verify a plaintext password against an Argon2id hash.
 */
export async function verifyPasswordArgon2(password: string, storedHash: string): Promise<boolean> {
  return argon2.verify(storedHash, password)
}

// ──────────────────────────────────────────────
// Unified verification (tries Argon2id first, falls back to legacy)
// ──────────────────────────────────────────────

export type VerifyResult = {
  valid: boolean
  needsUpgrade: boolean // true = matched legacy hash, caller should write Argon2id
}

/**
 * Verify a password against both hash formats.
 *
 * @param password      - Plaintext password from login form
 * @param legacyHash    - Value of `password` column (MySQL SHA1 format, nullable)
 * @param argon2Hash    - Value of `password_argon2` column (nullable)
 * @returns             - { valid, needsUpgrade }
 */
export async function verifyPasswordDual(
  password: string,
  legacyHash: string | null,
  argon2Hash: string | null,
): Promise<VerifyResult> {
  // 1. If Argon2id hash exists, check it first (this is the upgraded path)
  if (argon2Hash) {
    const valid = await verifyPasswordArgon2(password, argon2Hash)
    return { valid, needsUpgrade: false }
  }

  // 2. Fall back to legacy hash
  if (legacyHash) {
    const valid = verifyPasswordLegacy(password, legacyHash)
    return { valid, needsUpgrade: valid } // if valid, caller should upgrade
  }

  // 3. No hash at all (should not happen, but handle gracefully)
  return { valid: false, needsUpgrade: false }
}
```

**Design decisions:**

- `verifyPasswordDual` returns `needsUpgrade` so the caller (login handler) can decide to write the Argon2id hash. This keeps `auth.ts` pure (no DB imports).
- Argon2id functions are `async` because `argon2.hash` and `argon2.verify` are CPU-bound — the async versions use a thread pool and don't block the event loop.
- Uses `argon2.argon2id` variant explicitly. Argon2id is the recommended variant — it combines Argon2i's side-channel resistance with Argon2d's GPU resistance.
- Default memory/time parameters (65536 KiB, 3 iterations) meet OWASP's current recommendations. Adjust if login feels slow.

### 2.2 — Update `src/lib/auth-server-fns.ts` login handler

The login handler needs three changes:

1. Read the new `password_argon2` column from the DB
2. Use `verifyPasswordDual` instead of `verifyPassword`
3. If `needsUpgrade`, write the Argon2id hash back to the DB

```ts
// src/lib/auth-server-fns.ts
import { eq } from 'drizzle-orm'
import { wycDatabase } from 'src/db/schema'
import db from 'src/db/index'
import { verifyPasswordDual, hashPasswordArgon2 } from './auth'
import { useAppSession } from './session'

// ... type definitions stay the same ...

export const loginServerFn = createServerFn({ method: 'POST' })
  .inputValidator((input: { wycNumber: number; password: string }) => {
    if (!input.wycNumber || !input.password) {
      throw new Error('WYC Number and password are required')
    }
    return {
      wycNumber: Number(input.wycNumber),
      password: String(input.password),
    }
  })
  .handler(async ({ data }) => {
    try {
      // Find user — now selecting both password columns
      const users = await db
        .select({
          wycNumber: wycDatabase.wycNumber,
          first: wycDatabase.first,
          last: wycDatabase.last,
          email: wycDatabase.email,
          password: wycDatabase.password,
          passwordArgon2: wycDatabase.passwordArgon2,
        })
        .from(wycDatabase)
        .where(eq(wycDatabase.wycNumber, data.wycNumber))
        .limit(1)

      if (users.length === 0) {
        return {
          success: false,
          message: 'Invalid WYC Number or password',
        } satisfies LoginResponse
      }

      const user = users[0]

      // Dual-hash verification
      const { valid, needsUpgrade } = await verifyPasswordDual(
        data.password,
        user.password,
        user.passwordArgon2,
      )

      if (!valid) {
        return {
          success: false,
          message: 'Invalid WYC Number or password',
        } satisfies LoginResponse
      }

      // Transparent upgrade: write Argon2id hash on successful legacy login
      if (needsUpgrade) {
        const argon2Hash = await hashPasswordArgon2(data.password)
        await db
          .update(wycDatabase)
          .set({ passwordArgon2: argon2Hash })
          .where(eq(wycDatabase.wycNumber, user.wycNumber))
      }

      // Create session (unchanged)
      const session = await useAppSession()
      const userData: AuthUser = {
        wycNumber: user.wycNumber,
        first: user.first,
        last: user.last,
        email: user.email,
      }

      await session.update({
        userId: user.wycNumber,
        user: userData,
      })

      return {
        success: true,
        message: 'Login successful',
        user: userData,
      } satisfies LoginResponse
    } catch (error: any) {
      console.error('Login error:', error)
      return {
        success: false,
        message: error?.message || 'An error occurred during login',
      } satisfies LoginResponse
    }
  })
```

**What changed vs. the current handler:**

- `db.select()` now uses explicit field selection instead of `.select()` (avoids pulling all columns, and explicitly grabs both password fields)
- `verifyPassword(data.password, userPassword)` → `verifyPasswordDual(data.password, user.password, user.passwordBcrypt)`
- Added the upgrade block: if `needsUpgrade`, hash with bcrypt and write to `password_bcrypt`
- Session creation and everything else is unchanged

### 2.3 — Update password change/reset flows

Any code that sets a new password should write **both** columns during the parallel period so the old system keeps working.

```ts
// Wherever you handle password changes (e.g., a future password-reset server fn):

import { hashPasswordLegacy, hashPasswordArgon2 } from './auth'

async function setPassword(wycNumber: number, newPassword: string) {
  const [legacyHash, argon2Hash] = await Promise.all([
    // sync but wrapped for consistency
    Promise.resolve(hashPasswordLegacy(newPassword)),
    hashPasswordArgon2(newPassword),
  ])

  await db
    .update(wycDatabase)
    .set({
      password: legacyHash,
      passwordArgon2: argon2Hash,
    })
    .where(eq(wycDatabase.wycNumber, wycNumber))
}
```

**Why write both:** A user resets their password through the new system, then tries to log into the old system the next day. If you only wrote Argon2id, the old system can't verify them. Writing both keeps the parallel period seamless.

### 2.4 — Summary of file changes

| File                         | Change                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/db/schema.ts`           | Add `passwordArgon2` column to `wycDatabase` table                                               |
| `src/lib/auth.ts`            | Add Argon2id functions, rename existing functions with `Legacy` suffix, add `verifyPasswordDual` |
| `src/lib/auth-server-fns.ts` | Update login handler to use dual verification + transparent upgrade                              |
| `package.json`               | Add `argon2`                                                                                     |

No changes needed to:

- `src/db/types.ts` — password is not part of the `Member` type (auth concern)
- `src/db/mappers.ts` — password is not mapped
- `src/lib/session.ts` — session management is unchanged
- `src/lib/auth-middleware.ts` — `requireAuth()` checks session, not password
- Any component code — login form stays the same
- The old Perl/PHP system — it doesn't know about `password_bcrypt`

---

## Phase 3 (future, after old system is retired)

Not detailed here, but the steps are:

1. Stop writing the legacy `password` column
2. Email users with `password_argon2 IS NULL` to reset their password
3. Remove `hashPasswordLegacy` / `verifyPasswordLegacy` from `auth.ts`
4. Remove `verifyPasswordDual`, use `verifyPasswordArgon2` directly
5. Drop the `password` column (or keep it as a historical artifact)
6. Optionally rename `password_argon2` → `password`
