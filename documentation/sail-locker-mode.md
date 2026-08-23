# Sail Locker Mode

## Overview

Sail Locker mode gives the shared Sail Locker computer a ten-minute authentication session while personal devices remain signed in for up to 365 days. A database administrator enables the mode for a browser from the Settings page.

The mode is a convenience and accidental-use safeguard. Clearing the browser's site data removes the setting.

## How it works

### Device setting

The `wyc_sail_locker_mode` HTTP-only cookie marks a browser as the shared computer. It expires after 365 days. Only a user with the `db` privilege can change it. Enabling or disabling the mode clears the current authentication session.

The application header shows a small reminder whenever the device cookie is present. Sail Locker checkout pages and login flows returning to checkout omit the application header.

### Session lifetime

`useAppSession()` reads the device setting and configures the encrypted `wyc_session` cookie with an absolute lifetime:

- Sail Locker mode: ten minutes
- Personal mode: 365 days

TanStack Start enforces the lifetime when decrypting the session. The client returns an open Sail Locker checkout form to the public checkout dashboard when the session expires. Other pages return to the login screen. There is no inactivity timeout or expiration warning.

Password and email-code login use the same session creation path and inherit the device policy automatically.

### Authorization

Long-lived personal sessions periodically update identity and permissions without requiring a new login. These updates do not extend the session's absolute lifetime.

### Boat checkout

The boat checkout dashboard is public. Members log in before opening the checkout form. In Sail Locker mode, the dashboard and form use a standalone layout without the application header or sidebar. A successful checkout or check-in clears the authentication session and returns to the dashboard. Personal devices use the standard application navigation and remain signed in.

The Sail Locker dashboard and checkout form prominently show the authenticated member so a member can notice if a previous session is still active.

### QR login

QR login is not part of Sail Locker mode. A future QR flow can create a Sail Locker session through the same session creation path.

## Key Files

| File                                                | Purpose                                                       |
| --------------------------------------------------- | ------------------------------------------------------------- |
| `src/lib/auth/device-mode.ts`                       | Reads and writes the browser device setting                   |
| `src/lib/auth/session-policy.ts`                    | Defines device and session lifetimes                          |
| `src/lib/auth/session.ts`                           | Applies the device-specific session policy                    |
| `src/lib/auth/identity.ts`                          | Loads the current member and privileges from the database     |
| `src/lib/auth/device-settings-server-fns.ts`        | Applies the DB-protected setting and clears the session       |
| `src/routes/settings.tsx`                           | Settings page                                                 |
| `src/components/Header.tsx`                         | Settings link, mode reminder, and automatic expiry navigation |
| `src/components/SailLockerCheckoutSessionGuard.tsx` | Checkout session expiry navigation                            |
| `src/routes/checkout.tsx`                           | Public checkout dashboard and Sail Locker check-in behavior   |
| `src/routes/checkout_.new.tsx`                      | Authenticated checkout form and post-submit behavior          |
