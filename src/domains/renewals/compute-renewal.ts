export type RenewalTier = 'student' | 'nonstudent'
export type RenewalDuration = 'quarterly' | 'annual'

export const MAX_QUARTERS_AHEAD = 4

/** False if renewing for `duration` would push the member past the pre-pay cap. */
export function withinAdvanceLimit(
  expireQtr: number,
  duration: RenewalDuration,
  renewalQuarter: number,
): boolean {
  return computeRenewal(expireQtr, duration, renewalQuarter) <= renewalQuarter + MAX_QUARTERS_AHEAD
}

export function computeRenewal(
  expireQtr: number,
  duration: RenewalDuration,
  renewalQuarter: number,
): number {
  const active = expireQtr >= renewalQuarter
  if (active) {
    return duration === 'annual' ? expireQtr + 4 : expireQtr + 1
  }
  return duration === 'annual' ? renewalQuarter + 3 : renewalQuarter
}
