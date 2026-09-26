import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { RenewalDuration, RenewalTier } from '../renewals/compute-renewal'
import {
  createMembershipDiscountCode,
  getMembershipDiscountCodeQuote,
  listMembershipDiscountCodes,
  setMembershipDiscountCodeActive,
  updateMembershipDiscountCode,
} from './server-fns'
import type { DiscountCodeAudience } from './schema'

export const membershipDiscountCodesQueryOptions = () =>
  queryOptions({
    queryKey: ['membership-discount-codes'],
    queryFn: listMembershipDiscountCodes,
  })

export function useMembershipDiscountCodeQuoteMutation() {
  return useMutation({
    mutationFn: (input: {
      audience: Exclude<DiscountCodeAudience, 'both'>
      code: string
      duration: RenewalDuration
      tier: RenewalTier
    }) => getMembershipDiscountCodeQuote({ data: input }),
  })
}

function useDiscountCodeAdminMutation<T>(mutationFn: (input: T) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['membership-discount-codes'] }),
  })
}

export function useCreateMembershipDiscountCodeMutation() {
  return useDiscountCodeAdminMutation(
    (input: Parameters<typeof createMembershipDiscountCode>[0]['data']) =>
      createMembershipDiscountCode({ data: input }),
  )
}

export function useUpdateMembershipDiscountCodeMutation() {
  return useDiscountCodeAdminMutation(
    (input: Parameters<typeof updateMembershipDiscountCode>[0]['data']) =>
      updateMembershipDiscountCode({ data: input }),
  )
}

export function useSetMembershipDiscountCodeActiveMutation() {
  return useDiscountCodeAdminMutation((input: { active: boolean; index: number }) =>
    setMembershipDiscountCodeActive({ data: input }),
  )
}
