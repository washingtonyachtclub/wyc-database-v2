# Password Flow Plan

## Overview

Three-phase approach to password management in v2.

## Phase 1: Set Password Page (In Progress)
Logged-in users can set a new password from a "Set Password" page under the General sidebar section.

## Phase 2: Forgot Password / Password Reset
- Public `/forgot-password` page (bare layout, no sidebar)
- User enters WYC# + email, system validates match
- Generates 3-word passphrase (reuse `generate-passphrase.ts` utility extracted in Phase 1)
- Sets passphrase as user's password (both legacy SHA1 + Argon2id columns)
- Displays email text for manual copy/paste (no email infra yet — like membership processing)
- Could also include a "forgot your WYC number?" flow that emails it to them

### Implementation notes
- Server function: validate WYC# + email → generate passphrase → hash both formats → update password columns → return email text
- Reuse `src/lib/auth.ts` hashing functions and shared passphrase generator
- Add `/forgot-password` to bare-layout check in `__root.tsx` and `Header.tsx`
- Add "Forgot password?" link to login page

## Phase 3: Force Password Change on Login (TODO)
- New `password_resets` table: `wycNumber` (PK), `passphraseHash` (varchar 255, argon2), `createdAt` (timestamp)
- Phase 2's forgot-password server function will also upsert into `password_resets` when generating a passphrase
- On login, check `password_resets` table for user's WYC#
- If row exists, compare entered password against stored `passphraseHash`
  - Matches → user is still using the emailed passphrase → set `mustChangePassword: true` in session
  - Doesn't match → they already changed it → delete the row, proceed normally
- If `mustChangePassword` is true, redirect to `/set-password` from all protected routes
- Add `mustChangePassword?: boolean` to `SessionData` and propagate through `CurrentUserResponse` → `MyRouterContext`
- Modify `requirePrivilegeForRoute` to redirect when flag is set
- `/set-password` route must NOT use `requirePrivilegeForRoute` (avoid redirect loop) — handle auth manually in `beforeLoad`
- On successful password change: delete `password_resets` row, clear session flag
- Self-healing: if user changes password through any path, next login detects hash mismatch and auto-cleans the row

### Key files for Phase 3
- `src/db/schema.ts` — add `passwordResets` table
- `src/lib/session.ts` — add `mustChangePassword` to SessionData
- `src/lib/auth-server-fns.ts` — modify `loginServerFn` to check password_resets table, add to response types, modify `getCurrentUserServerFn`
- `src/routes/__root.tsx` — add `mustChangePassword` to MyRouterContext
- `src/lib/route-guards.ts` — add force-change redirect
