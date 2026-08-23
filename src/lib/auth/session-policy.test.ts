import { describe, expect, it } from 'vitest'
import {
  IDENTITY_REFRESH_INTERVAL_MS,
  PERSONAL_SESSION_MAX_AGE_SECONDS,
  SAIL_LOCKER_SESSION_MAX_AGE_SECONDS,
  getSessionMaxAgeSeconds,
  shouldRefreshIdentity,
} from './session-policy'

describe('session policy', () => {
  it('uses a ten-minute Sail Locker session', () => {
    expect(getSessionMaxAgeSeconds(true)).toBe(SAIL_LOCKER_SESSION_MAX_AGE_SECONDS)
    expect(SAIL_LOCKER_SESSION_MAX_AGE_SECONDS).toBe(10 * 60)
  })

  it('uses a 365-day personal session', () => {
    expect(getSessionMaxAgeSeconds(false)).toBe(PERSONAL_SESSION_MAX_AGE_SECONDS)
    expect(PERSONAL_SESSION_MAX_AGE_SECONDS).toBe(365 * 24 * 60 * 60)
  })

  it('refreshes missing or hour-old identity data', () => {
    const now = 10 * IDENTITY_REFRESH_INTERVAL_MS

    expect(shouldRefreshIdentity(undefined, now)).toBe(true)
    expect(shouldRefreshIdentity(now - IDENTITY_REFRESH_INTERVAL_MS + 1, now)).toBe(false)
    expect(shouldRefreshIdentity(now - IDENTITY_REFRESH_INTERVAL_MS, now)).toBe(true)
  })
})
