import { isDevEnvironment } from '@/lib/env'
import type { RenewalDuration, RenewalTier } from './compute-renewal'

/**
 * Square variation ids per tier×duration. Prices live in Square (read at charge time), not here.
 * Ids aren't secret, so they're config rather than env vars; sandbox differs from prod.
 */
const SANDBOX_VARIATIONS = {
  'student:quarterly': 'AYET4KQVOQSSMO46CJLT6G3W',
  'student:annual': '26FZQD2VW4RNHRY2ABEDQF33',
  'nonstudent:quarterly': '2UUVSXOCBP72XPEDNVMJ3GFC',
  'nonstudent:annual': 'ESGFWLT5GJ6OG4S2TOVT2XJ7',
} as const

const PRODUCTION_VARIATIONS = {
  'student:quarterly': 'IDCQE4ZULFYAHZFRYI4TLWIK',
  'student:annual': 'S3PJ7VNGUS6VM5FAMAZE3BAC',
  'nonstudent:quarterly': '6RZHQKFCPUY6SHFIRBK2PVNR',
  'nonstudent:annual': 'NPZZMHMDGMIDGATZQXPVHX2S',
} as const

export function variationId(tier: RenewalTier, duration: RenewalDuration): string {
  const key = `${tier}:${duration}` as const
  return (isDevEnvironment() ? SANDBOX_VARIATIONS : PRODUCTION_VARIATIONS)[key]
}
