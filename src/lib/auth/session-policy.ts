export const SAIL_LOCKER_SESSION_MAX_AGE_SECONDS = 10 * 60
export const PERSONAL_SESSION_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
export const DEVICE_MODE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60
export const IDENTITY_REFRESH_INTERVAL_MS = 60 * 60 * 1000

export function getSessionMaxAgeSeconds(sailLockerMode: boolean): number {
  return sailLockerMode ? SAIL_LOCKER_SESSION_MAX_AGE_SECONDS : PERSONAL_SESSION_MAX_AGE_SECONDS
}

export function shouldRefreshIdentity(refreshedAt: number | undefined, now = Date.now()): boolean {
  return refreshedAt === undefined || now - refreshedAt >= IDENTITY_REFRESH_INTERVAL_MS
}
