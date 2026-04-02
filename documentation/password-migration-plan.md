# Password Migration Plan

## After old system is retired

1. Stop writing the legacy `password` column
2. Email users with `password_argon2 IS NULL` to reset their password
3. Remove `hashPasswordLegacy` / `verifyPasswordLegacy` from `auth.ts`
4. Remove `verifyPasswordDual`, use `verifyPasswordArgon2` directly
5. Drop the `password` column (or keep it as a historical artifact)
6. Optionally rename `password_argon2` → `password`
