import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRenewalPrice, getRenewalStatus, payAndRenew } from './server-fns'
import type { RenewalDuration, RenewalTier } from './compute-renewal'

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
    mutationFn: (input: { tier: RenewalTier; duration: RenewalDuration; sourceId: string }) =>
      payAndRenew({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['renewals', 'status'] })
    },
  })
}
