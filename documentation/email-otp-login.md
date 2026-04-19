# Email OTP Login

Members can sign in with a 6-digit code sent to the email address on file, as an alternative to password login. The session produced is identical to a password session, so all downstream authorization works without special cases.

Login is keyed on WYC Number, never email. Members can share email addresses (family accounts), so email is ambiguous as an identity key.

## Flow

1. Member enters their WYC Number and requests a code.
2. System looks up the member, checks rate limits, generates a 6-digit code, stores an Argon2 hash, and emails the code.
3. UI shows a masked form of the destination email (e.g. `jo***@gm***.com`).
4. Member enters the code. System verifies it, marks it consumed, and creates the session.

Requesting a new code invalidates any prior unused code for the same member. Clicking "resend" immediately retires the previous code.

## Schema: `otp_codes`

| Column         | Type                  | Notes                                                         |
| -------------- | --------------------- | ------------------------------------------------------------- |
| `id`           | int PK                | Auto-increment                                                |
| `wyc_number`   | int                   | Member who requested the code                                 |
| `channel`      | ENUM('email','sms')   | Delivery channel                                              |
| `purpose`      | varchar(32)           | Currently `'login'`                                           |
| `destination`  | varchar(255)          | Email address or phone, for masked display and audit          |
| `code_hash`    | varchar(255)          | Argon2id hash. Never plaintext.                               |
| `expires_at`   | timestamp             | `created_at + 10 minutes`                                     |
| `attempts`     | int                   | Incremented on failed verify                                  |
| `max_attempts` | int                   | Per-row cap (default 5)                                       |
| `consumed_at`  | timestamp NULL        | Set on successful verify or when superseded                   |
| `created_at`   | timestamp             | Issue time                                                    |

Indexed on `(wyc_number, channel, purpose, created_at)` for lookup and on `expires_at` for cleanup.

## Rate limits

| Limit                          | Value             |
| ------------------------------ | ----------------- |
| Min interval between requests  | 30 seconds        |
| Max requests per 10-min window | 3                 |
| Max verify attempts per code   | 5                 |
| Code lifetime                  | 10 minutes        |

Once a code reaches its attempt cap, further guesses against it always fail (even a correct code). The member must request a new one. This bounds brute-force risk against any single issued code.

## Cleanup

There is no cron. Each code issuance first deletes every row past its `expires_at`. A row is useless after expiry whether it was used, superseded, locked, or untouched, so one condition handles all cases. Table size stays bounded to roughly the codes issued in the last 10 minutes.

## Enumeration hardening

Request and verify endpoints return the same generic failure message across all failure causes (unknown WYC Number, no email on file, rate limit hit, wrong code, expired code, locked code, upstream email failure). Specific causes are logged server-side only.

## Extending to other channels

The `channel` column is the extension point. Adding SMS means adding an SMS send wrapper, two new server functions that pass `channel: 'sms'` and read the member's phone number, and a mode on the login UI. The table, rate-limit logic, code generation, verification, and cleanup all carry over unchanged.
