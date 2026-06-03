export type RenewalTier = 'student' | 'nonstudent'
export type RenewalDuration = 'quarterly' | 'annual'

/**
 * How far ahead a member may pre-pay, in quarters past the current quarter. Stops anyone banking
 * many quarters at today's price ahead of a dues increase. 4 ≈ one year, so a standard annual
 * renewal from the current quarter lands exactly at the cap.
 */
export const MAX_QUARTERS_AHEAD = 4

/** False if renewing for `duration` would push the member past the pre-pay cap. */
export function withinAdvanceLimit(
  currentQuarter: number,
  expireQtr: number,
  duration: RenewalDuration,
): boolean {
  return computeRenewal(currentQuarter, expireQtr, duration) <= currentQuarter + MAX_QUARTERS_AHEAD
}

/**
 * `expireQtr` is the quarter a member is paid through (inclusive). Active members stack the new
 * period onto their remaining time; expired members start fresh from the current quarter.
 */
export function computeRenewal(
  currentQuarter: number,
  expireQtr: number,
  duration: RenewalDuration,
): number {
  const active = expireQtr >= currentQuarter
  if (active) {
    return duration === 'annual' ? expireQtr + 4 : expireQtr + 1
  }
  return duration === 'annual' ? currentQuarter + 3 : currentQuarter
}
