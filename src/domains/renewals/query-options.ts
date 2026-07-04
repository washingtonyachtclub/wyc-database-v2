import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRenewalPrice, getRenewalStatus, payAndRenew } from './server-fns'
import {
  approveExemptionRequest,
  cancelDuesExemption,
  denyExemptionRequest,
  getIsExemptionApprover,
  listPendingExemptionRequests,
  requestDuesExemption,
} from './exemption-server-fns'
import type { RenewalDuration, RenewalTier } from './compute-renewal'
import type { QuestionnaireAnswers } from './questionnaire'

export const getRenewalStatusQueryOptions = () =>
  queryOptions({
    queryKey: ['renewals', 'status'],
    queryFn: getRenewalStatus,
  })

export const getRenewalPriceQueryOptions = (tier: RenewalTier, duration: RenewalDuration) =>
  queryOptions({
    queryKey: ['renewals', 'price', tier, duration],
    queryFn: () => getRenewalPrice({ data: { tier, duration } }),
  })

export function usePayAndRenewMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      duration: RenewalDuration
      sourceId: string
      questionnaire: QuestionnaireAnswers
    }) => payAndRenew({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals', 'status'] })
    },
  })
}

export const getPendingExemptionsQueryOptions = () =>
  queryOptions({
    queryKey: ['exemptions', 'pending'],
    queryFn: listPendingExemptionRequests,
  })

export const getIsExemptionApproverQueryOptions = () =>
  queryOptions({
    queryKey: ['exemptions', 'is-approver'],
    queryFn: getIsExemptionApprover,
  })

export function useRequestDuesExemptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (questionnaire: QuestionnaireAnswers) =>
      requestDuesExemption({ data: { questionnaire } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals', 'status'] })
    },
  })
}

export function useCancelDuesExemptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => cancelDuesExemption(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals', 'status'] })
    },
  })
}

export function useApproveExemptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestId: number) => approveExemptionRequest({ data: { requestId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exemptions', 'pending'] })
    },
  })
}

export function useDenyExemptionMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (requestId: number) => denyExemptionRequest({ data: { requestId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exemptions', 'pending'] })
    },
  })
}
