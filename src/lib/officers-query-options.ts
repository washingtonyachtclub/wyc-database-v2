import { queryOptions } from '@tanstack/react-query'
import { getAllOfficers, getMemberPositions } from './officers-server-fns'

export const getAllOfficersQueryOptions = () =>
  queryOptions({
    queryKey: ['officers'],
    queryFn: getAllOfficers,
  })

export const getMemberPositionsQueryOptions = (wycNumber: number) =>
  queryOptions({
    queryKey: ['officers', 'byMember', wycNumber],
    queryFn: () => getMemberPositions({ data: { wycNumber } }),
  })
