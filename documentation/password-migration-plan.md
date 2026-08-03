# Password Migration Plan

## Blocked until both legacy apps are gone

The legacy PHP reads and writes the `password` column directly, so nothing below can start until **both** of these are deprecated:

- Legacy checkout
- Legacy keelboat calendar

Retiring only one is not enough. Either app still running keeps the dual-write requirement in place.

## Dual-write requirement

While the legacy apps are live, **every** password write must update `password` (legacy SHA1) as well as `password_argon2`. Both legacy apps authenticate with `WHERE password = CONCAT('*', UPPER(SHA1(UNHEX(SHA1(<plaintext>)))))`, so an argon2-only write silently locks the member out of legacy checkout and the keelboat calendar after they change their password.

Write sites that must stay dual:

| Path                    | File                                                       |
| ----------------------- | ---------------------------------------------------------- |
| Change password         | `src/lib/password-server-fns.ts` (`setPasswordServerFn`)   |
| Forgot password / reset | `src/lib/password-server-fns.ts` (`resetPasswordServerFn`) |
| New member creation     | `src/domains/members/server-fns.ts` (`createMember`)       |

Any new write path (imports, admin resets, renewal flows) has to hash both ways too.

## Steps

1. Stop writing the legacy `password` column
2. Email users with `password_argon2 IS NULL` to reset their password
3. Remove `hashPasswordLegacy` / `verifyPasswordLegacy` from `auth.ts`
4. Remove `verifyPasswordDual`, use `verifyPasswordArgon2` directly
5. Drop the `password` column (or keep it as a historical artifact)
6. Optionally rename `password_argon2` → `password`
