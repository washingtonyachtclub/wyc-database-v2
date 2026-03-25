import { queryOptions } from '@tanstack/react-query'
import { getCheckouts } from './checkouts-server-fns'

export const getCheckoutsQueryOptions = (wycNumber?: number, since?: string) =>
  queryOptions({
    queryKey: ['checkouts', wycNumber, since],
    queryFn: () => getCheckouts({ data: { wycNumber, since } }),
  })

export const getMemberCheckoutsQueryOptions = (wycNumber: number, since?: string) =>
  getCheckoutsQueryOptions(wycNumber, since)
