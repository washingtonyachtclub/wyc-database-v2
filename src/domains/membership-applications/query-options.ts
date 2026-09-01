import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RenewalDuration, RenewalTier } from '../renewals/compute-renewal'
import {
  checkNewMemberEmail,
  completeNewMemberApplication,
  getNewMemberApplication,
  getNewMemberPrice,
  getNewMemberSignupOptions,
  startNewMemberPayment,
} from './server-fns'
import {
  applyMembershipApplicationToExistingMember,
  approveNewMembershipApplication,
  closeMembershipApplication,
  listMembershipApplicationsForApproval,
  resendMembershipApplicationCompletionEmail,
  retryMembershipApplicationWelcomeEmail,
  updateMembershipApplicationEmails,
} from './approval-server-fns'

export const newMemberSignupOptionsQueryOptions = () =>
  queryOptions({
    queryKey: ['membership-applications', 'signup-options'],
    queryFn: () => getNewMemberSignupOptions(),
  })

export const newMemberPriceQueryOptions = (tier: RenewalTier, duration: RenewalDuration) =>
  queryOptions({
    queryKey: ['membership-applications', 'price', tier, duration],
    queryFn: () => getNewMemberPrice({ data: { tier, duration } }),
  })

export const newMemberApplicationQueryOptions = (applicationId: string) =>
  queryOptions({
    queryKey: ['membership-applications', applicationId],
    queryFn: () => getNewMemberApplication({ data: { applicationId } }),
  })

export function useCheckNewMemberEmailMutation() {
  return useMutation({ mutationFn: (email: string) => checkNewMemberEmail({ data: { email } }) })
}

export function useStartNewMemberPaymentMutation() {
  return useMutation({
    mutationFn: (input: Parameters<typeof startNewMemberPayment>[0]['data']) =>
      startNewMemberPayment({ data: input }),
  })
}

export function useCompleteNewMemberApplicationMutation() {
  return useMutation({
    mutationFn: (input: Parameters<typeof completeNewMemberApplication>[0]['data']) =>
      completeNewMemberApplication({ data: input }),
  })
}

export const membershipApplicationsForApprovalQueryOptions = () =>
  queryOptions({
    queryKey: ['membership-applications', 'approvals'],
    queryFn: listMembershipApplicationsForApproval,
  })

function useApprovalMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-applications', 'approvals'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      queryClient.invalidateQueries({ queryKey: ['stats', 'membership'] })
    },
  })
}

export function useUpdateMembershipApplicationEmailsMutation() {
  return useApprovalMutation(
    (input: { applicationId: string; primaryEmail: string; uwEmail: string | null }) =>
      updateMembershipApplicationEmails({ data: input }),
  )
}

export function useResendMembershipApplicationCompletionEmailMutation() {
  return useApprovalMutation((applicationId: string) =>
    resendMembershipApplicationCompletionEmail({ data: { applicationId } }),
  )
}

export function useApproveNewMembershipApplicationMutation() {
  return useApprovalMutation((input: { applicationId: string; confirmPossibleMatches: boolean }) =>
    approveNewMembershipApplication({ data: input }),
  )
}

export function useApplyMembershipApplicationToExistingMemberMutation() {
  return useApprovalMutation((input: { applicationId: string; wycNumber: number }) =>
    applyMembershipApplicationToExistingMember({ data: input }),
  )
}

export function useCloseMembershipApplicationMutation() {
  return useApprovalMutation((input: { applicationId: string; note: string }) =>
    closeMembershipApplication({ data: input }),
  )
}

export function useRetryMembershipApplicationWelcomeEmailMutation() {
  return useApprovalMutation((applicationId: string) =>
    retryMembershipApplicationWelcomeEmail({ data: { applicationId } }),
  )
}
