import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CheckoutFilters } from './filter-types'
import {
  checkInBoat,
  createCheckout,
  createManualCheckout,
  getAllCheckouts,
  getCheckoutBoatTypes,
  getCheckoutCards,
  getCheckoutFormBoatTypes,
  getCheckoutFormMembers,
  getCheckoutMembers,
  getCheckouts,
  getMyRatings,
  getWindHistory,
} from './server-fns'

export const getCheckoutsQueryOptions = (wycNumber?: number, since?: string) =>
  queryOptions({
    queryKey: ['checkouts', wycNumber, since],
    queryFn: () => getCheckouts({ data: { wycNumber, since } }),
  })

export const getMemberCheckoutsQueryOptions = (wycNumber: number, since?: string) =>
  getCheckoutsQueryOptions(wycNumber, since)

export const getAllCheckoutsQueryOptions = (
  pageIndex: number,
  pageSize: number,
  filters?: CheckoutFilters,
  sorting?: { id: string; desc: boolean },
) =>
  queryOptions({
    queryKey: ['checkouts', 'all', pageIndex, pageSize, filters, sorting],
    queryFn: () => getAllCheckouts({ data: { pageIndex, pageSize, filters, sorting } }),
  })

export const getCheckoutBoatTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['checkouts', 'boat-types'],
    queryFn: getCheckoutBoatTypes,
  })

// --- Member-facing checkout page ---

export const getCheckoutCardsQueryOptions = () =>
  queryOptions({
    queryKey: ['checkouts', 'cards'],
    queryFn: getCheckoutCards,
    refetchInterval: 30_000,
  })

export const getMyRatingsQueryOptions = () =>
  queryOptions({
    queryKey: ['checkouts', 'my-ratings'],
    queryFn: getMyRatings,
    staleTime: 5 * 60 * 1000,
  })

export const getCheckoutFormBoatTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['checkouts', 'form-boat-types'],
    queryFn: getCheckoutFormBoatTypes,
    staleTime: 5 * 60 * 1000,
  })

export const getCheckoutMembersQueryOptions = () =>
  queryOptions({
    queryKey: ['checkouts', 'members'],
    queryFn: getCheckoutMembers,
    staleTime: 5 * 60 * 1000,
  })

export const getCheckoutFormMembersQueryOptions = () =>
  queryOptions({
    queryKey: ['checkouts', 'form-members'],
    queryFn: getCheckoutFormMembers,
    staleTime: 5 * 60 * 1000,
  })

export const getWindHistoryQueryOptions = () =>
  queryOptions({
    queryKey: ['checkouts', 'wind-history'],
    queryFn: getWindHistory,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })

export function useCreateCheckoutMutation(opts: { onSuccess: () => void | Promise<void> }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createCheckout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      await opts.onSuccess()
    },
  })
}

export function useCreateManualCheckoutMutation(opts: { onSuccess: () => void }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createManualCheckout,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      opts.onSuccess()
    },
  })
}

export function useCheckInMutation(opts?: {
  onSuccess?: () => void | Promise<void>
  invalidateOnSuccess?: boolean
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: checkInBoat,
    onSuccess: async () => {
      if (opts?.invalidateOnSuccess !== false) {
        await queryClient.invalidateQueries({ queryKey: ['checkouts'] })
      }
      await opts?.onSuccess?.()
    },
  })
}
