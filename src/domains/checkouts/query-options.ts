import { queryOptions } from '@tanstack/react-query'
import type { CheckoutFilters } from './filter-types'
import { getAllCheckouts, getCheckoutBoatTypes, getCheckouts } from './server-fns'

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
