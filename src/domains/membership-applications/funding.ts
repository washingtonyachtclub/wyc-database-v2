export function canCompleteMembershipApplication(paymentStatus: string): boolean {
  return paymentStatus === 'completed' || paymentStatus === 'exemption_requested'
}

export function isDuesExemptionApplication(paymentStatus: string): boolean {
  return paymentStatus === 'exemption_requested' || paymentStatus === 'exempt'
}

export function isMembershipApplicationActionable(application: {
  paymentStatus: string
  requirementsComplete: boolean
  reviewStatus: string
}): boolean {
  return (
    application.reviewStatus.startsWith('approved_') ||
    application.paymentStatus === 'reconciliation_required' ||
    (canCompleteMembershipApplication(application.paymentStatus) &&
      application.requirementsComplete)
  )
}
