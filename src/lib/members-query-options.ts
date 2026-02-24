import { queryOptions } from '@tanstack/react-query'
import {
  getCategories,
  getMembersTable,
  getMostRecentWycNumber,
  getQuarters,
} from './members-server-fns'

export const getMembersQueryOptions = (
  pageIndex: number,
  pageSize: number,
  filters?: {
    wycId?: string
    category?: number
    expireQtr?: number
    expireQtrMode?: 'exactly' | 'atLeast'
  },
  sorting?: { id: string; desc: boolean },
) =>
  queryOptions({
    queryKey: ['members', pageIndex, pageSize, filters, sorting],
    queryFn: async () => {
      const result = await getMembersTable({
        data: { pageIndex, pageSize, filters, sorting },
      })
      return result
    },
  })

export const getMostRecentWycNumberQueryOptions = () =>
  queryOptions({
    queryKey: ['mostRecentWycNumber'],
    queryFn: getMostRecentWycNumber,
  })

export const getCategoriesQueryOptions = () =>
  queryOptions({
    queryKey: ['categories'],
    queryFn: getCategories,
  })

export const getQuartersQueryOptions = () =>
  queryOptions({
    queryKey: ['quarters'],
    queryFn: getQuarters,
  })
