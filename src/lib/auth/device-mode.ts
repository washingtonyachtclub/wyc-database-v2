import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { DEVICE_MODE_MAX_AGE_SECONDS } from './session-policy'

const DEVICE_MODE_COOKIE = 'wyc_sail_locker_mode'
const DEVICE_MODE_VALUE = 'enabled'

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function isSailLockerMode(): boolean {
  return getCookie(DEVICE_MODE_COOKIE) === DEVICE_MODE_VALUE
}

export function setSailLockerMode(enabled: boolean): void {
  if (enabled) {
    setCookie(DEVICE_MODE_COOKIE, DEVICE_MODE_VALUE, {
      ...cookieOptions,
      maxAge: DEVICE_MODE_MAX_AGE_SECONDS,
    })
    return
  }

  deleteCookie(DEVICE_MODE_COOKIE, cookieOptions)
}
