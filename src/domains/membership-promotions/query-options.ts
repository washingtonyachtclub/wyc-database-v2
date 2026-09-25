import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RenewalDuration, RenewalTier } from '../renewals/compute-renewal'
import {
  createMembershipPromotion,
  getMembershipPromotionQuote,
  listMembershipPromotions,
  setMembershipPromotionActive,
  updateMembershipPromotion,
} from './server-fns'
import type { PromotionAudience } from './schema'

export const membershipPromotionsQueryOptions = () =>
  queryOptions({
    queryKey: ['membership-promotions'],
    queryFn: listMembershipPromotions,
  })

export function useMembershipPromotionQuoteMutation() {
  return useMutation({
    mutationFn: (input: {
      audience: Exclude<PromotionAudience, 'both'>
      code: string
      duration: RenewalDuration
      tier: RenewalTier
    }) => getMembershipPromotionQuote({ data: input }),
  })
}

function usePromotionAdminMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['membership-promotions'] }),
  })
}

export function useCreateMembershipPromotionMutation() {
  return usePromotionAdminMutation(
    (input: Parameters<typeof createMembershipPromotion>[0]['data']) =>
      createMembershipPromotion({ data: input }),
  )
}

export function useUpdateMembershipPromotionMutation() {
  return usePromotionAdminMutation(
    (input: Parameters<typeof updateMembershipPromotion>[0]['data']) =>
      updateMembershipPromotion({ data: input }),
  )
}

export function useSetMembershipPromotionActiveMutation() {
  return usePromotionAdminMutation((input: { active: boolean; index: number }) =>
    setMembershipPromotionActive({ data: input }),
  )
}
