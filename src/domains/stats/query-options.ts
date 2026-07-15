import { queryOptions } from '@tanstack/react-query'
import { getMembershipStats } from './server-fns'

export const getMembershipStatsQueryOptions = () =>
  queryOptions({
    queryKey: ['stats', 'membership'],
    queryFn: getMembershipStats,
  })
