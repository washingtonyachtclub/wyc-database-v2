import { queryOptions } from '@tanstack/react-query'
import type { ChiefFilters } from 'src/db/chief-queries'
import { getChiefsTable, getChiefTypes } from './chiefs-server-fns'

export const getChiefsQueryOptions = (
  pageIndex: number,
  pageSize: number,
  filters?: ChiefFilters,
) =>
  queryOptions({
    queryKey: ['chiefs', pageIndex, pageSize, filters],
    queryFn: () => getChiefsTable({ data: { pageIndex, pageSize, filters } }),
  })

export const getChiefTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['chiefs', 'types'],
    queryFn: getChiefTypes,
  })
