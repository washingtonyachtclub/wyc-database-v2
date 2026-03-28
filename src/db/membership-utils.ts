export function isMembershipActive(expireQtrIndex: number, currentQuarter: number): boolean {
  return expireQtrIndex >= currentQuarter
}
