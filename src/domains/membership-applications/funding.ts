export function canCompleteMembershipApplication(paymentStatus: string): boolean {
  return paymentStatus === 'completed' || paymentStatus === 'exemption_requested'
}

export function isDuesExemptionApplication(paymentStatus: string): boolean {
  return paymentStatus === 'exemption_requested' || paymentStatus === 'exempt'
}
