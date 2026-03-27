import { queryOptions } from '@tanstack/react-query'
import type { ChiefFilters } from 'src/db/chief-queries'
import { getChiefsTable, getChiefTypes } from './chiefs-server-fns'

export const getChiefsQueryOptions = (filters?: ChiefFilters) =>
  queryOptions({
    queryKey: ['chiefs', filters],
    queryFn: () => getChiefsTable({ data: { filters } }),
  })

export const getChiefTypesQueryOptions = () =>
  queryOptions({
    queryKey: ['chiefs', 'types'],
    queryFn: getChiefTypes,
  })
